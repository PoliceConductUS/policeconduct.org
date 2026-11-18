import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const terraform = readFileSync(new URL("../main.tf", import.meta.url), "utf8");
const template = terraform.match(/code\s*=\s*<<-EOF\n([\s\S]*?)\nEOF/)[1];
const TARGET_EXPRESSION = "${jsonencode(trimspace(var.redirect_target_url))}";

// Render the function the way Terraform does: trimspace, then jsonencode.
function redirectTo(targetUrl) {
  const code = template
    .replace("${jsonencode(var.domain_name)}", JSON.stringify("iceconduct.org"))
    .replace(TARGET_EXPRESSION, JSON.stringify(targetUrl.trim()));
  const context = vm.createContext({});
  vm.runInContext(code, context);
  return (host, uri = "/", querystring = {}) =>
    context.handler({
      request: { headers: { host: { value: host } }, uri, querystring },
    });
}
const redirect = redirectTo(
  "https://www.policeconduct.org/federal/u-s-immigration-and-customs-enforcement/",
);

for (const host of [
  "iceconduct.org",
  "www.iceconduct.org",
  "preview.iceconduct.org",
  "PR-13.preview.iceconduct.org",
]) {
  test(`maps only the hostname for ${host}`, () => {
    const result = redirect(host, "/iceconduct.org/iceconduct.org/", {
      next: { value: "https%3A%2F%2Ficeconduct.org%2Ficeconduct.org" },
      "iceconduct.org": {
        multiValue: [{ value: "iceconduct.org" }, { value: "second" }],
      },
    });
    assert.equal(result.statusCode, 301);
    assert.equal(
      result.headers.location.value,
      `https://${host.toLowerCase().replace(/iceconduct\.org$/, "policeconduct.org")}/iceconduct.org/iceconduct.org/?next=https%3A%2F%2Ficeconduct.org%2Ficeconduct.org&iceconduct.org=iceconduct.org&iceconduct.org=second`,
    );
  });
}
test("root requests retain the ICE landing page on the corresponding host", () => {
  assert.equal(
    redirect("pr-13.preview.iceconduct.org").headers.location.value,
    "https://pr-13.preview.policeconduct.org/federal/u-s-immigration-and-customs-enforcement/",
  );
});
test("an earlier occurrence within a subdomain is preserved", () => {
  assert.equal(
    redirect("iceconduct.org.preview.iceconduct.org", "/path").headers.location
      .value,
    "https://iceconduct.org.preview.policeconduct.org/path",
  );
});
for (const host of [
  "noticeconduct.org",
  "iceconduct.org.example.com",
  "example.com",
]) {
  test(`rejects unrelated hostname ${host}`, () => {
    assert.equal(redirect(host).statusCode, 400);
  });
}
test("the function reads the trimmed target, as the variable validation does", () => {
  assert.ok(template.includes(TARGET_EXPRESSION));
  assert.ok(!template.includes("${jsonencode(var.redirect_target_url)}"));
});
for (const target of [
  "https://www.policeconduct.org",
  "  https://www.policeconduct.org  ",
]) {
  test(`a host-only target ${JSON.stringify(target)} redirects the root to /`, () => {
    const run = redirectTo(target);
    assert.equal(
      run("iceconduct.org").headers.location.value,
      "https://policeconduct.org/",
    );
    assert.equal(
      run("www.iceconduct.org", "/about/").headers.location.value,
      "https://www.policeconduct.org/about/",
    );
  });
}
