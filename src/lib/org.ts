// Single source of truth for the publishing organization's factual identity.
// Legal name, EIN, mailing address, and social profiles are emitted from many
// surfaces (JSON-LD structured data, the site footer, donation copy, the
// author meta tag). Keeping the facts here means an address or EIN change is
// made once and can never drift out of sync across those surfaces.
// Consumed by src/lib/structured-data.js, src/layouts/SiteLayout.astro,
// src/pages/index.astro, and src/pages/donate/index.astro.

export const ORG_LEGAL_NAME = "Institute for Police Conduct, Inc.";
// Same organization, without the corporate suffix — for running prose.
export const ORG_SHORT_NAME = "Institute for Police Conduct";
export const ORG_ALTERNATE_NAME = "PoliceConduct.org";
export const ORG_EIN = "99-3296620";

export const ORG_DESCRIPTION =
  "Nonprofit that organizes public records, court records, and licensing data so people can see how policing is experienced — harm and professionalism alike — and support both accountability and trust.";

export interface OrgAddress {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export const ORG_ADDRESS: OrgAddress = {
  streetAddress: "8 The Green #11026",
  addressLocality: "Dover",
  addressRegion: "DE",
  postalCode: "19901",
  addressCountry: "US",
};

// One-line mailing address for prose (e.g. donation "make checks payable" copy).
export const ORG_ADDRESS_LINE = `${ORG_ADDRESS.streetAddress}, ${ORG_ADDRESS.addressLocality}, ${ORG_ADDRESS.addressRegion} ${ORG_ADDRESS.postalCode}`;

export interface SocialLink {
  href: string;
  // Symbol id in /public/icons.svg (referenced as `#${iconId}` by <use>).
  iconId: string;
  label: string;
}

export const ORG_SOCIAL_LINKS: SocialLink[] = [
  {
    href: "https://facebook.com/PoliceConductUS",
    iconId: "social-facebook",
    label: "Facebook",
  },
  {
    href: "https://twitter.com/PoliceConductUS",
    iconId: "social-twitter",
    label: "X (formerly Twitter)",
  },
  {
    href: "https://instagram.com/PoliceConductUS",
    iconId: "social-instagram",
    label: "Instagram",
  },
  {
    href: "https://www.tiktok.com/@policeconductus",
    iconId: "social-tiktok",
    label: "TikTok",
  },
  {
    href: "https://linkedin.com/company/PoliceConductUS",
    iconId: "social-linkedin",
    label: "LinkedIn",
  },
  {
    href: "https://youtube.com/@PoliceConductUS",
    iconId: "social-youtube",
    label: "YouTube",
  },
  {
    href: "https://www.reddit.com/user/PoliceConductUS/",
    iconId: "social-reddit",
    label: "Reddit",
  },
  {
    href: "https://github.com/PoliceConductUS",
    iconId: "social-github",
    label: "GitHub",
  },
];

// Social profile URLs, in a stable order, for schema.org `sameAs`.
export const ORG_SAME_AS = ORG_SOCIAL_LINKS.map((link) => link.href);
