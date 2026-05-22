type AgencyLocationInput = {
  id?: string | null;
  locationPath?: string | null;
  location_path?: string | null;
  slug?: string | null;
};

const trimText = (value: unknown) => String(value ?? "").trim();

export const getAgencyLocationPath = (agency: AgencyLocationInput) =>
  trimText(agency.locationPath ?? agency.location_path) || null;

export const buildAgencyCanonicalPath = (agency: AgencyLocationInput) => {
  const locationPath = getAgencyLocationPath(agency);
  const agencySlug = trimText(agency.slug);

  if (!locationPath || !agencySlug) {
    return null;
  }

  return `${locationPath}${agencySlug}/`;
};

export const requireAgencyCanonicalPath = (agency: AgencyLocationInput) => {
  const canonicalPath = buildAgencyCanonicalPath(agency);
  if (!canonicalPath) {
    throw new Error(
      `Agency ${agency.id || agency.slug || "unknown"} is missing required location_path_id-backed URL fields`,
    );
  }
  return canonicalPath;
};
