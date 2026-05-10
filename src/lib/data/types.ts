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
  agencySlug: string;
  agencyName: string;
  agencyCategory: string;
  agencyCanonicalPath: string;
};

export type AgencySummary = {
  id: string;
  slug: string;
  name: string;
  state: string;
  category: string;
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
  title: string;
  incidentDate: string;
  address?: string | null;
  agencySlug: string;
  agencyName: string;
  agencyCanonicalPath: string;
  category?: string | null;
  ratingOverall?: number | null;
  personnel?: {
    licenseType?: string | null;
    name: string;
    slug?: string | null;
  }[];
  personnelSlugs?: string[];
};
