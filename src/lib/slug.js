import crypto from "node:crypto";

export const hashId = (value) =>
  crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 6);

export const slugify = (value) => {
  if (!value) {
    return "unknown";
  }
  const normalized = value.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "unknown";
};

export const agencySlug = (agency) =>
  `${slugify(agency?.name)}-${hashId(agency?.id)}`;

export const officerSlug = (officer) => {
  const suffix = officer?.suffix ? ` ${officer.suffix}` : "";
  const name =
    `${officer?.first_name || ""} ${officer?.last_name || ""}${suffix}`.trim();
  return `${slugify(name)}-${hashId(officer?.id)}`;
};

export const caseSlug = (caseRecord) => {
  const label = caseRecord?.title || caseRecord?.cause_number || "civil-case";
  return `${slugify(label)}-${hashId(caseRecord?.id)}`;
};
