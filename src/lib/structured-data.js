const DEFAULT_SITE_URL = "https://www.policeconduct.org";

// Stable, factual description of the publishing organization. Kept here as the
// single source of truth so every page emits the same entity for AI answer
// engines and knowledge graphs.
const ORG_LEGAL_NAME = "Institute for Police Conduct, Inc.";
const ORG_DESCRIPTION =
  "Nonprofit that organizes public records, court records, and licensing data so people can see how policing is experienced — harm and professionalism alike — and support both accountability and trust.";

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
 * NewsArticle node for editorial/news posts. The Institute publishes the
 * articles, so both author and publisher resolve to the shared organization
 * entity. Include in a page's @graph (or emit standalone) so news posts are
 * eligible for article rich results and cited accurately by AI answer engines.
 * @param {{ siteUrl: URL; pageUrl: string; headline: string; description?: string; datePublished?: string; dateModified?: string; image?: string }} params
 * @returns {Record<string, any>}
 */
export const buildNewsArticle = ({
  siteUrl,
  pageUrl,
  headline,
  description,
  datePublished,
  dateModified,
  image,
}) => {
  /** @type {Record<string, any>} */
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${pageUrl}#article`,
    url: pageUrl,
    headline,
    isPartOf: buildWebSite(siteUrl),
    mainEntityOfPage: pageUrl,
    publisher: { "@id": organizationId(siteUrl) },
    author: { "@id": organizationId(siteUrl) },
  };
  if (description) {
    data.description = description;
  }
  if (datePublished) {
    data.datePublished = datePublished;
    data.dateModified = dateModified || datePublished;
  } else if (dateModified) {
    data.dateModified = dateModified;
  }
  if (image) {
    data.image = image;
  }
  return data;
};

/**
 * Graph-member content page node (WebPage or ProfilePage) that wraps a primary
 * entity via mainEntity. Shared by the agency, personnel, civil-case, and
 * report detail pages so they emit one identical page-node shape. `id` is the
 * page node's own @id (e.g. `${pageUrl}#webpage` or `#profilepage`).
 * @param {{ siteUrl: URL; id: string; pageUrl: string; name: string; description?: string; mainEntityId: string; type?: string; dateModified?: string }} params
 * @returns {Record<string, any>}
 */
export const buildContentPageNode = ({
  siteUrl,
  id,
  pageUrl,
  name,
  description,
  mainEntityId,
  type = "WebPage",
  dateModified,
}) => {
  /** @type {Record<string, any>} */
  const data = {
    "@type": type,
    "@id": id,
    url: pageUrl,
    name,
    ...(description ? { description } : {}),
    isPartOf: { "@id": new URL("/", siteUrl).toString() },
    publisher: { "@id": organizationId(siteUrl) },
    mainEntity: { "@id": mainEntityId },
  };
  if (dateModified) {
    data.dateModified = dateModified;
  }
  return data;
};

/**
 * Person graph node for an officer/individual. Minimal by default
 * ({ name, url } with a `#person` @id); optional fields cover the richer
 * personnel profile. Pass either an absolute `url` or a `path` to resolve.
 * @param {{ siteUrl: URL; path?: string; url?: string; name: string; image?: string; mainEntityOfPageId?: string; deathDate?: string; worksForId?: string }} params
 * @returns {Record<string, any>}
 */
export const buildPersonNode = ({
  siteUrl,
  path,
  url,
  name,
  image,
  mainEntityOfPageId,
  deathDate,
  worksForId,
}) => {
  const personUrl = url || new URL(path, siteUrl).toString();
  /** @type {Record<string, any>} */
  const data = {
    "@type": "Person",
    "@id": `${personUrl}#person`,
    name,
    url: personUrl,
  };
  if (image) {
    data.image = image;
  }
  if (mainEntityOfPageId) {
    data.mainEntityOfPage = { "@id": mainEntityOfPageId };
  }
  if (deathDate) {
    data.deathDate = deathDate;
  }
  if (worksForId) {
    data.worksFor = { "@id": worksForId };
  }
  return data;
};

/**
 * GovernmentOrganization graph node for a law-enforcement agency. Minimal by
 * default ({ name, url } with a `#organization` @id); optional fields cover the
 * full agency profile. Pass either an absolute `url` or a `path` to resolve.
 * @param {{ siteUrl: URL; path?: string; url?: string; name: string; mainEntityOfPageId?: string; address?: any; email?: string; contactPoint?: any[]; sameAs?: any[]; areaServed?: any }} params
 * @returns {Record<string, any>}
 */
export const buildGovernmentOrganizationNode = ({
  siteUrl,
  path,
  url,
  name,
  mainEntityOfPageId,
  address,
  email,
  contactPoint,
  sameAs,
  areaServed,
}) => {
  const orgUrl = url || new URL(path, siteUrl).toString();
  /** @type {Record<string, any>} */
  const data = {
    "@type": "GovernmentOrganization",
    "@id": `${orgUrl}#organization`,
    name,
    url: orgUrl,
  };
  if (mainEntityOfPageId) {
    data.mainEntityOfPage = { "@id": mainEntityOfPageId };
  }
  if (address) {
    data.address = address;
  }
  if (email) {
    data.email = email;
  }
  if (contactPoint && contactPoint.length) {
    data.contactPoint = contactPoint;
  }
  if (sameAs && sameAs.length) {
    data.sameAs = sameAs;
  }
  if (areaServed) {
    data.areaServed = areaServed;
  }
  return data;
};

/**
 * CollectionPage for a listing page (news, report archive, agency topic, etc.).
 * When `items` are supplied it carries an ItemList of them so the listing is
 * self-describing to search and AI engines; with no items it is a bare typed
 * CollectionPage. Each item is `{ href, name }` (href resolved against siteUrl).
 * @param {{ siteUrl: URL; pageUrl: string; name: string; description?: string; items?: Array<{ href: string; name: string }> }} params
 * @returns {Record<string, any>}
 */
export const buildCollectionPage = ({
  siteUrl,
  pageUrl,
  name,
  description,
  items,
}) => {
  /** @type {Record<string, any>} */
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": pageUrl,
    url: pageUrl,
    name,
    isPartOf: buildWebSite(siteUrl),
    publisher: { "@id": organizationId(siteUrl) },
  };
  if (description) {
    data.description = description;
  }
  const itemListElement = (items || []).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: new URL(item.href, siteUrl).toString(),
    name: item.name,
  }));
  if (itemListElement.length > 0) {
    data.mainEntity = { "@type": "ItemList", itemListElement };
  }
  return data;
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
