import { expect, test } from "@playwright/test";
import { requireStateAuthority } from "../../src/lib/data/licensing-authority";

const authority = {
  id: "authority-fixture",
  name: "State Board",
  abbreviation: "SB",
  website: "https://example.org/",
  statePath: "/fixture/",
  stateName: "Fixture State",
  level: "state",
};
test("resolves an exact state authority", () => {
  expect(requireStateAuthority([authority], "/fixture/")).toEqual(authority);
});
for (const fixture of [
  { name: "missing", rows: [] },
  { name: "duplicate", rows: [authority, { ...authority, id: "second" }] },
  { name: "wrong path", rows: [{ ...authority, statePath: "/other/" }] },
  { name: "non-state", rows: [{ ...authority, level: "place" }] },
]) {
  test(`rejects ${fixture.name} authority identity`, () => {
    expect(() => requireStateAuthority(fixture.rows, "/fixture/")).toThrow();
  });
}
