import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const terraform = readFileSync(new URL("../main.tf", import.meta.url), "utf8");
const code = terraform
  .match(/code\s*=\s*<<-EOF\n([\s\S]*?)\nEOF/)[1]
  .replace("${jsonencode(var.domain_name)}", JSON.stringify("iceconduct.org"))
  .replace(
    "${jsonencode(var.redirect_target_url)}",
    JSON.stringify(
      "https://www.policeconduct.org/federal/u-s-immigration-and-customs-enforcement/",
    ),
  );
const context = vm.createContext({});
vm.runInContext(code, context);
function redirect(host, uri = "/", querystring = {}) {
  return context.handler({
    request: { headers: { host: { value: host } }, uri, querystring },
  });
}

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
