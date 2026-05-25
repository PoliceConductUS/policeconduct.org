export type StateDecertificationIndicator = {
  label: string;
  status: "documented";
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
  { label: "Public access to POST/TCOLE meetings", status: "documented" },
  { label: "POST/TCOLE meetings occur regularly", status: "documented" },
  { label: "Civilian complaint pathway", status: "documented" },
  {
    label: "Civilian involvement in decertification decision-making",
    status: "documented",
  },
  {
    label: "Independent complaint-investigation authority",
    status: "documented",
  },
  {
    label: "Public information on ongoing decertification investigations",
    status: "documented",
  },
  {
    label: "Public information on determinations or adverse actions",
    status: "documented",
  },
  {
    label: "National Decertification Index checking or reporting",
    status: "documented",
  },
  {
    label: "Automatic and discretionary decertification mechanisms",
    status: "documented",
  },
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
