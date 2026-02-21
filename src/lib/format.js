const formatDate = (value, options) => {
  if (!value) {
    return "Unknown";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

export const formatShortDate = (value) =>
  formatDate(value, { month: "short", day: "numeric", year: "numeric" });

export const formatLongDate = (value) =>
  formatDate(value, { month: "long", day: "numeric", year: "numeric" });
