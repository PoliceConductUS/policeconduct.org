const DEFAULT_SITE_URL = "https://www.policeconduct.org";

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
    } catch (error) {
      return new URL(DEFAULT_SITE_URL);
    }
  }
  return new URL(DEFAULT_SITE_URL);
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
  };
  if (description) {
    data.description = description;
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
