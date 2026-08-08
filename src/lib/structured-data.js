const DEFAULT_SITE_URL = "https://www.policeconduct.org";

// Stable, factual description of the publishing organization. Kept here as the
// single source of truth so every page emits the same entity for AI answer
// engines and knowledge graphs.
const ORG_LEGAL_NAME = "Institute for Police Conduct, Inc.";
const ORG_DESCRIPTION =
  "Nonprofit that organizes public records, agency records, court records, and personnel records so people can see how policing is experienced and hold agencies accountable.";

const ORG_SAME_AS = [
  "https://facebook.com/PoliceConductUS",
  "https://twitter.com/PoliceConductUS",
  "https://instagram.com/PoliceConductUS",
  "https://www.tiktok.com/@policeconductus",
  "https://linkedin.com/company/PoliceConductUS",
  "https://youtube.com/@PoliceConductUS",
  "https://www.reddit.com/user/PoliceConductUS/",
  "https://github.com/PoliceConductUS",
];

/**
 * @param {URL | string | undefined | null} site
 */
export const getSiteUrl = (site) => {
  if (site instanceof URL) {
    return site;
  }
  if (typeof site === "string") {
    try {
      return new URL(site);
    } catch {
      return new URL(DEFAULT_SITE_URL);
    }
  }
  return new URL(DEFAULT_SITE_URL);
};

/**
 * Canonical, site-wide @id for the publishing organization. Every page uses the
 * same id so references resolve to one entity across the whole graph.
 * @param {URL} siteUrl
 */
export const organizationId = (siteUrl) =>
  `${new URL("/", siteUrl).toString()}#organization`;

/**
 * The publishing NonprofitOrganization. Include this node in a page's @graph so
 * the page is self-contained, and reference it elsewhere via
 * `{ "@id": organizationId(siteUrl) }`.
 * @param {URL} siteUrl
 */
export const buildPublisherOrganization = (siteUrl) => {
  const url = new URL("/", siteUrl).toString();
  return {
    "@type": "NonprofitOrganization",
    "@id": organizationId(siteUrl),
    name: ORG_LEGAL_NAME,
    alternateName: "PoliceConduct.org",
    url,
    description: ORG_DESCRIPTION,
    logo: new URL("/img/apple-touch-icon.png", siteUrl).toString(),
    taxID: "99-3296620",
    nonprofitStatus: "https://schema.org/Nonprofit501c3",
    address: {
      "@type": "PostalAddress",
      streetAddress: "8 The Green #11026",
      addressLocality: "Dover",
      addressRegion: "DE",
      postalCode: "19901",
      addressCountry: "US",
    },
    sameAs: ORG_SAME_AS,
  };
};

/**
 * @param {URL} siteUrl
 */
export const buildWebSite = (siteUrl) => {
  const url = new URL("/", siteUrl).toString();
  return {
    "@type": "WebSite",
    "@id": url,
    url,
    name: "PoliceConduct.org",
    publisher: { "@id": organizationId(siteUrl) },
  };
};

/**
 * @param {{ siteUrl: URL; pageUrl: string; name: string; description?: string; type?: string }} params
 * @returns {Record<string, any>}
 */
export const buildWebPage = ({ siteUrl, pageUrl, name, description, type }) => {
  /** @type {Record<string, any>} */
  const data = {
    "@context": "https://schema.org",
    "@type": type || "WebPage",
    "@id": pageUrl,
    url: pageUrl,
    name,
    isPartOf: buildWebSite(siteUrl),
    publisher: { "@id": organizationId(siteUrl) },
  };
  if (description) {
    data.description = description;
  }
  return data;
};

/**
 * Dataset descriptor for the site's public-records corpus. Signals to AI /
 * dataset-aware engines that this is authoritative structured data.
 * @param {URL} siteUrl
 * @param {{ pageUrl?: string }} [options]
 */
export const buildDataset = (siteUrl, options = {}) => {
  const url = options.pageUrl || new URL("/", siteUrl).toString();
  return {
    "@type": "Dataset",
    "@id": `${new URL("/", siteUrl).toString()}#dataset`,
    name: "PoliceConduct.org Public Records Database",
    description:
      "A structured, continually updated public database of U.S. law enforcement agencies, personnel, misconduct reports, and civil litigation, aggregated from public records, court dockets, and state licensing data.",
    url,
    isAccessibleForFree: true,
    creator: { "@id": organizationId(siteUrl) },
    publisher: { "@id": organizationId(siteUrl) },
    license: new URL("/legal-notice/terms-of-service/", siteUrl).toString(),
    keywords: [
      "police accountability",
      "law enforcement agencies",
      "police personnel",
      "police misconduct",
      "civil litigation",
      "public records",
    ],
    spatialCoverage: { "@type": "Country", name: "United States" },
    measurementTechnique:
      "Aggregation of public records, court dockets, and state law-enforcement licensing data.",
  };
};

/**
 * @param {any[] | null | undefined} items
 */
export const buildItemList = (items) => {
  if (!items || items.length === 0) {
    return null;
  }
  return {
    "@type": "ItemList",
    itemListElement: items,
  };
};
