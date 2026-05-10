import { slugify } from "#src/lib/slug.js";

type AgencyLocationInput = {
  category?: string | null;
  state?: string | null;
  administrativeArea?: string | null;
  administrative_area?: string | null;
  administrativeAreaSlug?: string | null;
  administrative_area_slug?: string | null;
  city?: string | null;
  place?: string | null;
  placeSlug?: string | null;
  place_slug?: string | null;
  slug?: string | null;
};

const trimText = (value: unknown) => String(value ?? "").trim();

export const normalizeStateSlug = (value: unknown) =>
  trimText(value).toLowerCase();

export const normalizePlaceLabel = (value: unknown) =>
  trimText(value).replace(/\s+/g, " ");

export const locationSlug = (value: unknown) =>
  slugify(normalizePlaceLabel(value));

export const getAgencyAdministrativeArea = (agency: AgencyLocationInput) =>
  trimText(agency.administrativeArea ?? agency.administrative_area) || null;

export const getAgencyAdministrativeAreaSlug = (
  agency: AgencyLocationInput,
) => {
  const stored = trimText(
    agency.administrativeAreaSlug ?? agency.administrative_area_slug,
  );
  if (stored) {
    return stored.toLowerCase();
  }
  const label = getAgencyAdministrativeArea(agency);
  return label ? locationSlug(label) : null;
};

export const getAgencyPlaceLabel = (agency: AgencyLocationInput) =>
  normalizePlaceLabel(agency.place ?? agency.city) || null;

export const getAgencyPlaceSlug = (agency: AgencyLocationInput) => {
  const stored = trimText(agency.placeSlug ?? agency.place_slug);
  if (stored) {
    return stored.toLowerCase();
  }
  const label = getAgencyPlaceLabel(agency);
  return label ? locationSlug(label) : null;
};

export const buildPlacePath = (agency: AgencyLocationInput) => {
  const stateSlug = normalizeStateSlug(agency.state);
  const administrativeAreaSlug = getAgencyAdministrativeAreaSlug(agency);
  const placeSlug = getAgencyPlaceSlug(agency);

  if (!stateSlug || !administrativeAreaSlug || !placeSlug) {
    return null;
  }

  return `/${stateSlug}/${administrativeAreaSlug}/${placeSlug}/`;
};

export const buildAgencyCanonicalPath = (agency: AgencyLocationInput) => {
  const placePath = buildPlacePath(agency);
  const agencySlug = trimText(agency.slug);

  if (!placePath || !agencySlug) {
    return null;
  }

  return `${placePath}${agencySlug}/`;
};

export const requireAgencyCanonicalPath = (
  agency: AgencyLocationInput & { id?: string | null },
) => {
  const canonicalPath = buildAgencyCanonicalPath(agency);
  if (!canonicalPath) {
    throw new Error(
      `Agency ${agency.id || agency.slug || "unknown"} is missing required address-based URL fields`,
    );
  }
  return canonicalPath;
};
