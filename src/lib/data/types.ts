export type PersonnelSummary = {
  id: string;
  slug: string;
  lastName: string;
  firstName: string;
  nameSuffix?: string | null;
  licenseType: string | null;
  roleTitle: string | null;
  reportCount: number;
  civilCaseCount: number;
  agencyName: string;
  agencyState: string;
  agencyCanonicalPath: string;
};

export type AgencySummary = {
  id: string;
  slug: string;
  name: string;
  state: string;
  administrativeArea?: string | null;
  administrativeAreaSlug?: string | null;
  city?: string | null;
  placeSlug?: string | null;
  address?: string | null;
  zipCode?: string | null;
  phoneNumber?: string | null;
  canonicalPath: string;
  activePersonnelCount: number;
  reportCount: number;
  civilCaseCount: number;
};

export type ReportSummary = {
  id: string;
  slug: string;
  state: string;
  locationPath: string;
  title: string;
  incidentDate: string;
  address?: string | null;
  agencySlug: string;
  agencyName: string;
  agencyCanonicalPath: string;
  ratingOverall?: number | null;
  personnel?: {
    licenseType?: string | null;
    name: string;
    slug?: string | null;
  }[];
  personnelSlugs?: string[];
};
