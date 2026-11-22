export type PersonnelSummary = {
  id: string;
  slug: string;
  lastName: string;
  firstName: string;
  nameSuffix?: string | null;
};

export type AgencyFinderResult = {
  id: string;
  name: string;
  city?: string | null;
  administrativeArea?: string | null;
  state: string;
  zipCode?: string | null;
  canonicalPath: string;
};

export type ReportSummary = {
  id: string;
  slug: string;
  state: string;
  locationPath: string;
  canonicalPath: string;
  year: string;
  month: string;
  day: string;
  administrativeAreaName: string;
  administrativeAreaSlug: string;
  placeName: string;
  placeSlug: string;
  stateName: string;
  title: string;
  incidentDate: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  agencySlug: string;
  agencyName: string;
  agencyCanonicalPath: string;
  ratingOverall?: number | null;
  personnel?: {
    title?: string | null;
    name: string;
    slug?: string | null;
  }[];
  personnelSlugs?: string[];
};
