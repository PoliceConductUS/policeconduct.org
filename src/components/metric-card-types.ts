import type { MetricAccent, MetricIcon } from "#src/lib/metric-vocabulary.js";

export type MetricCardAction =
  | {
      href: string;
      kind: "link";
      label: string;
    }
  | {
      href: string;
      kind: "button";
      label: string;
    };

export type MetricCardItem = {
  accent?: MetricAccent;
  action?: MetricCardAction;
  detail?: string;
  icon?: MetricIcon;
  label: string;
  value: string;
};
