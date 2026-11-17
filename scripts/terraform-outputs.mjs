// Terraform state is the only record of deployed resource names. Scripts read the
// values they need from `terraform output` at run time instead of from a copy.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const policeconduct = "bootstrap-policeconduct";
const recaptcha = "bootstrap-recaptcha";

// Environment name -> the stack and output that hold its value.
export const TERRAFORM_ENV = {
  S3_BUCKET: [policeconduct, "site_bucket_name"],
  S3_BUCKET_PREVIEW: [policeconduct, "preview_bucket_name"],
  RELEASE_DATA_BUCKET: [policeconduct, "release_data_bucket_name"],
  RELEASE_DATA_BUCKET_PREVIEW: [
    policeconduct,
    "preview_release_data_bucket_name",
  ],
  KVS_ARN: [policeconduct, "site_redirects_kvs_arn"],
  KVS_ARN_PREVIEW: [policeconduct, "preview_redirects_kvs_arn"],
  CLOUDFRONT_DIST_ID: [policeconduct, "cloudfront_distribution_id"],
  CLOUDFRONT_DIST_PREVIEW: [
    policeconduct,
    "preview_cloudfront_distribution_id",
  ],
  FORMS_API_PROXY_TARGET: [policeconduct, "forms_api_preview_function_url"],
  SENTRY_ORG: [policeconduct, "sentry_org"],
  SENTRY_PROJECT: [policeconduct, "sentry_project"],
  RECAPTCHA_SITE_KEY: [recaptcha, "recaptcha_site_key"],
  RECAPTCHA_PROJECT_ID: [recaptcha, "recaptcha_project_id"],
  RECAPTCHA_SERVICE_ACCOUNT_EMAIL: [
    recaptcha,
    "recaptcha_service_account_email",
  ],
  RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME: [
    recaptcha,
    "recaptcha_wif_provider_resource_name",
  ],
  RECAPTCHA_WIF_AUDIENCE: [recaptcha, "recaptcha_wif_audience"],
};

function terraform(stackDir, args, env) {
  const result = spawnSync("terraform", [`-chdir=${stackDir}`, ...args], {
    encoding: "utf8",
    env,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`terraform could not be run: ${result.error.message}`);
  }
  return result;
}

export function readStackOutputs(stack, env = process.env) {
  const stackDir = path.join(repoRoot, "infrastructure", stack);
  if (!existsSync(path.join(stackDir, ".terraform", "terraform.tfstate"))) {
    const init = terraform(stackDir, ["init", "-input=false"], env);
    if (init.status !== 0) {
      throw new Error(
        `terraform init failed for ${stack}. Check AWS_PROFILE.\n${init.stderr.trim()}`,
      );
    }
  }
  const output = terraform(stackDir, ["output", "-json"], env);
  if (output.status !== 0) {
    throw new Error(
      `terraform output failed for ${stack}. Check AWS_PROFILE.\n${output.stderr.trim()}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(output.stdout);
  } catch {
    throw new Error(`terraform output for ${stack} was not JSON.`);
  }
  return Object.fromEntries(
    Object.entries(parsed).map(([name, entry]) => [name, entry.value]),
  );
}

// Sets each named value in `env` from its Terraform output. A value the caller
// already set is kept: CI passes these in and has no access to the state.
export function resolveTerraformEnv(
  names,
  { env = process.env, readOutputs = readStackOutputs } = {},
) {
  const outputsByStack = new Map();
  const resolved = {};
  for (const name of names) {
    const source = TERRAFORM_ENV[name];
    if (!source) {
      throw new Error(`${name} is not a value Terraform outputs provide.`);
    }
    const current = env[name];
    if (typeof current === "string" && current.trim() !== "") {
      resolved[name] = current;
      continue;
    }
    const [stack, outputName] = source;
    if (!outputsByStack.has(stack)) {
      outputsByStack.set(stack, readOutputs(stack, env));
    }
    const value = outputsByStack.get(stack)[outputName];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(
        `${name}: Terraform output ${outputName} of ${stack} is missing or empty.`,
      );
    }
    env[name] = value;
    resolved[name] = value;
  }
  return resolved;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

// Command form for shell scripts: eval "$(node scripts/terraform-outputs.mjs NAME...)"
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const resolved = resolveTerraformEnv(process.argv.slice(2));
    for (const [name, value] of Object.entries(resolved)) {
      process.stdout.write(`export ${name}=${shellQuote(value)}\n`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
