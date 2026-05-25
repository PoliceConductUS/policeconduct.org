export type StateDecertificationIndicator = {
  label: string;
};

export type StateDecertificationContext = {
  credit: string;
  indicators: StateDecertificationIndicator[];
  methodology: string;
  sourceHref: string;
  sourceLabel: string;
  stateSlug: string;
  summary: string;
  tier: string;
  title: string;
};

const reportCredit =
  "Analysis adapted from License Revoked: Grading State Police Decertification Laws Based on the C.A.T. Method, Carlton T. Mayers II, Esq., Mayers Strategic Solutions, LLC. Used with permission.";

const sourceHref = "https://www.mayerssolutions.com/licenserevoked";

const catIndicators: StateDecertificationIndicator[] = [
  { label: "Public access to POST/TCOLE meetings" },
  { label: "POST/TCOLE meetings occur regularly" },
  { label: "Civilian complaint pathway" },
  { label: "Civilian involvement in decertification decision-making" },
  { label: "Independent complaint-investigation authority" },
  { label: "Public information on ongoing decertification investigations" },
  { label: "Public information on determinations or adverse actions" },
  { label: "National Decertification Index checking or reporting" },
  { label: "Automatic and discretionary decertification mechanisms" },
];

export const stateDecertificationContexts = new Map<
  string,
  StateDecertificationContext
>([
  [
    "tx",
    {
      credit: reportCredit,
      indicators: catIndicators,
      methodology:
        "C.A.T. Method: Community Empowerment, Accountability, and Transparency.",
      sourceHref,
      sourceLabel: "Mayers Strategic Solutions decertification report card",
      stateSlug: "tx",
      summary:
        "Texas appears in the report card's top tier for state police decertification mechanisms and processes. This is state-law context that applies across Texas jurisdictions; it is not a local agency rating.",
      tier: "Top tier of most empowering mechanisms and processes",
      title: "Texas decertification law context",
    },
  ],
]);

export const getStateDecertificationContext = (stateSlug: string) =>
  stateDecertificationContexts.get(stateSlug.toLowerCase()) || null;
