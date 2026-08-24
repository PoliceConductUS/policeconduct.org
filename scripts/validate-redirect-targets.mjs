/**
 * Validate that every URL we advertise resolves to a page that actually exists.
 *
 * INS-28: the ADR-0006 URL migration shipped its CloudFront redirect rule without
 * the origin build that publishes the new paths. The edge began redirecting 63 live
 * `/civil-litigation/{state}/{slug}/` case pages to `/civil-cases/{slug}/`, which the
 * deployed build did not contain, so all 63 became cached 404s while still listed in
 * the sitemap. Nothing in the pipeline compared advertised URLs against the artifact
 * being served, so the break was only found by hand months later.
 *
 * This script closes that gap. It parses the viewer-request function out of the
 * Terraform that defines it, replays every sitemap URL through it, follows the
 * resulting redirect chain, and asserts the destination exists.
 *
 *   --build <dir>    resolve destinations against a local build directory.
 *                    This is the pre-deploy gate: it answers "would this artifact
 *                    serve every URL its own sitemap advertises?"
 *
 *   --live <origin>  resolve destinations with real HTTP requests against a
 *                    deployed origin. This is the post-deploy check.
 *
 * Exits non-zero and prints every offending URL when any destination is missing.
 */

import { readFile, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const TERRAFORM_PATH = "infrastructure/bootstrap-policeconduct/main.tf";
const FUNCTION_RESOURCE = 'resource "aws_cloudfront_function" "index_rewrite"';
const MAX_REDIRECT_HOPS = 10;

/**
 * Terraform interpolations appearing inside the function heredoc, and the literal
 * each one resolves to for production policeconduct.org.
 *
 * Deliberately an exhaustive allow-list rather than a regex strip: if someone adds a
 * new `${...}` to the function, this script must fail loudly rather than silently
 * validate a handler that no longer matches what Terraform deploys.
 */
const TERRAFORM_SUBSTITUTIONS = new Map([
  ["${jsonencode(var.domain_name)}", '"policeconduct.org"'],
  ["${jsonencode(local.www_domain)}", '"www.policeconduct.org"'],
  ['${local.include_www ? "true" : "false"}', "true"],
]);

const PRODUCTION_HOSTS = new Set([
  "policeconduct.org",
  "www.policeconduct.org",
]);

/** Pull the `code = <<-EOF ... EOF` heredoc out of the index_rewrite resource. */
const extractHandlerSource = (terraform) => {
  const resourceIndex = terraform.indexOf(FUNCTION_RESOURCE);
  if (resourceIndex === -1) {
    throw new Error(
      `Could not find ${FUNCTION_RESOURCE} in ${TERRAFORM_PATH}. ` +
        `If the function moved, update this script — do not delete the check.`,
    );
  }

  const afterResource = terraform.slice(resourceIndex);
  const heredoc = /code\s*=\s*<<-EOF\n([\s\S]*?)\nEOF\n/.exec(afterResource);
  if (!heredoc) {
    throw new Error(
      `Found ${FUNCTION_RESOURCE} but could not parse its \`code = <<-EOF\` heredoc.`,
    );
  }

  return heredoc[1];
};

/** Replace known Terraform interpolations; throw on any that is not recognised. */
const resolveInterpolations = (source) => {
  let resolved = source;
  for (const [token, literal] of TERRAFORM_SUBSTITUTIONS) {
    resolved = resolved.split(token).join(literal);
  }

  const unresolved = resolved.match(/\$\{[^}]*\}/g);
  if (unresolved) {
    throw new Error(
      `Unrecognised Terraform interpolation(s) in the CloudFront function: ` +
        `${[...new Set(unresolved)].join(", ")}. ` +
        `Add them to TERRAFORM_SUBSTITUTIONS so this check keeps matching the deployed handler.`,
    );
  }

  return resolved;
};

/** Compile the extracted source into a callable handler. */
const compileHandler = (handlerSource) => {
  const factory = new Function(`${handlerSource}\nreturn handler;`);
  return factory();
};

const loadHandler = async (terraformPath = TERRAFORM_PATH) => {
  const terraform = await readFile(terraformPath, "utf8");
  return compileHandler(resolveInterpolations(extractHandlerSource(terraform)));
};

/** Build the CloudFront viewer-request event shape for a URI on the canonical host. */
const buildEvent = (uri, host = "www.policeconduct.org") => ({
  request: { uri, headers: { host: { value: host } }, querystring: {} },
});

/**
 * Replay a URI through the handler, following redirects until it settles on a
 * rewritten origin path. Returns the final origin key plus the hops taken.
 */
const resolveThroughHandler = (handler, startUri) => {
  const hops = [];
  let uri = startUri;

  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop += 1) {
    const result = handler(buildEvent(uri));

    // A rewrite (not a redirect): the handler returns the mutated request.
    if (!result.statusCode) {
      return { originKey: result.uri, hops, status: "rewrite" };
    }

    const location = result.headers?.location?.value;
    if (!location) {
      return { originKey: null, hops, status: `status-${result.statusCode}` };
    }

    let nextUri = location;
    if (/^https?:\/\//i.test(location)) {
      const parsed = new URL(location);
      if (!PRODUCTION_HOSTS.has(parsed.hostname.toLowerCase())) {
        // Off-site redirect: not ours to validate.
        return { originKey: null, hops, status: "external" };
      }
      nextUri = parsed.pathname;
    }

    hops.push({ from: uri, to: nextUri, statusCode: result.statusCode });

    if (nextUri === uri) {
      return { originKey: null, hops, status: "redirect-loop" };
    }
    uri = nextUri;
  }

  return { originKey: null, hops, status: "redirect-loop" };
};

const parseSitemapUrls = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]);

const existsInBuild = async (buildDir, originKey) => {
  const relative = originKey.replace(/^\/+/, "");
  try {
    await access(path.join(buildDir, relative));
    return true;
  } catch {
    return false;
  }
};

/**
 * Follow a URL the way a crawler would and report where it actually landed.
 *
 * Live mode deliberately does NOT replay the local handler: the point of a
 * post-deploy check is to measure the deployed edge, not to re-assert what the
 * source says the edge ought to do. Redirects are followed to their destination
 * so that a 301 into a 404 is reported as the 404 it is.
 */
const probeLive = async (url) => {
  const chain = [];
  let current = url;

  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
    });

    if (response.status < 300 || response.status >= 400) {
      return { status: response.status, finalUrl: current, chain };
    }

    const location = response.headers.get("location");
    if (!location) {
      return { status: response.status, finalUrl: current, chain };
    }

    const next = new URL(location, current).toString();
    chain.push({ from: current, to: next, statusCode: response.status });
    if (next === current) {
      return { status: "redirect-loop", finalUrl: current, chain };
    }
    current = next;
  }

  return { status: "redirect-loop", finalUrl: current, chain };
};

const parseArgs = (argv) => {
  const args = { build: null, live: null, sitemap: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--build") args.build = argv[++i];
    else if (flag === "--live") args.live = argv[++i];
    else if (flag === "--sitemap") args.sitemap = argv[++i];
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!args.build && !args.live) {
    throw new Error("Specify --build <dir> or --live <origin>.");
  }
  if (args.build && args.live) {
    throw new Error("Specify only one of --build or --live.");
  }
  return args;
};

/** Collect sitemap URLs from a local build directory or a live origin. */
const collectSitemapUrls = async ({ build, live, sitemap }) => {
  const sources = [];

  if (sitemap) {
    sources.push(sitemap);
  } else if (build) {
    const index = path.join(build, "sitemap-index.xml");
    const indexXml = await readFile(index, "utf8").catch(() => null);
    if (indexXml) {
      for (const loc of parseSitemapUrls(indexXml)) {
        sources.push(
          path.join(build, new URL(loc).pathname.replace(/^\/+/, "")),
        );
      }
    } else {
      sources.push(path.join(build, "sitemap-0.xml"));
    }
  } else {
    const indexXml = await fetch(new URL("/sitemap-index.xml", live)).then(
      (r) => (r.ok ? r.text() : null),
    );
    if (indexXml) sources.push(...parseSitemapUrls(indexXml));
    else sources.push(new URL("/sitemap-0.xml", live).toString());
  }

  const urls = [];
  for (const source of sources) {
    const xml = /^https?:\/\//i.test(source)
      ? await fetch(source).then((r) => (r.ok ? r.text() : ""))
      : await readFile(source, "utf8").catch(() => "");
    urls.push(...parseSitemapUrls(xml));
  }
  return [...new Set(urls)];
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const handler = await loadHandler();
  const urls = await collectSitemapUrls(args);

  if (urls.length === 0) {
    console.error("No sitemap URLs found — refusing to report a vacuous pass.");
    process.exitCode = 1;
    return;
  }

  const failures = [];

  for (const url of urls) {
    if (args.live) {
      const probed = await probeLive(
        new URL(new URL(url).pathname, args.live).toString(),
      );
      if (probed.status !== 200) {
        failures.push({
          url,
          reason: `landed on ${probed.finalUrl} with ${probed.status}`,
          hops: probed.chain,
        });
      }
      continue;
    }

    const uri = new URL(url).pathname;
    const resolved = resolveThroughHandler(handler, uri);

    if (resolved.status === "external") continue;

    if (!resolved.originKey) {
      failures.push({ url, reason: resolved.status, hops: resolved.hops });
      continue;
    }

    if (!(await existsInBuild(args.build, resolved.originKey))) {
      failures.push({
        url,
        reason: `origin key not in build: ${resolved.originKey}`,
        hops: resolved.hops,
      });
    }
  }

  const mode = args.build ? `build ${args.build}` : `live ${args.live}`;
  if (failures.length > 0) {
    console.error(
      `\n${failures.length} of ${urls.length} sitemap URLs do not resolve (${mode}):\n`,
    );
    for (const failure of failures) {
      const chain = failure.hops
        .map((hop) => `${hop.statusCode} -> ${hop.to}`)
        .join(" ");
      console.error(
        `  ${failure.url}\n    ${failure.reason}${chain ? `\n    chain: ${chain}` : ""}`,
      );
    }
    console.error(
      `\nA sitemap must not advertise URLs the deployed artifact cannot serve.\n`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `All ${urls.length} sitemap URLs resolve to real pages (${mode}).`,
  );
};

export const __testables = {
  extractHandlerSource,
  resolveInterpolations,
  compileHandler,
  loadHandler,
  resolveThroughHandler,
  parseSitemapUrls,
  buildEvent,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
