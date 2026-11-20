const formatDate = (value, options) => {
  if (!value) {
    throw new Error("Cannot format a missing date.");
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Cannot format invalid date ${String(value)}.`);
  }
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

export const formatShortDate = (value) =>
  formatDate(value, { month: "short", day: "numeric", year: "numeric" });

export const formatLongDate = (value) =>
  formatDate(value, { month: "long", day: "numeric", year: "numeric" });
