export type PersonnelSummary = {
  id: string;
  slug: string;
  lastName: string;
  firstName: string;
  nameSuffix?: string | null;
  roleTitle: string | null;
  reportCount: number;
  agencySlug: string;
  agencyName: string;
  agencyCategory: string;
};

export type AgencySummary = {
  id: string;
  slug: string;
  name: string;
  state: string;
  category: string;
  city?: string | null;
  address?: string | null;
  zipCode?: string | null;
  phoneNumber?: string | null;
  activePersonnelCount: number;
  reportCount: number;
};

export type ReportSummary = {
  id: string;
  slug: string;
  title: string;
  incidentDate: string;
  address?: string | null;
  agencySlug: string;
  agencyName: string;
  category?: string | null;
  ratingOverall?: number | null;
  personnel?: { name: string; slug?: string | null }[];
  personnelSlugs?: string[];
};
