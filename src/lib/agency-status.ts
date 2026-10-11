export const agencyStatusPresentation = (
  status: string | null,
  date: string | null,
) => {
  const label = status
    ? status.toLowerCase() === "active"
      ? "Active"
      : status.toLowerCase() === "inactive"
        ? "Inactive"
        : status
    : null;
  const dateLabel = date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;
  return {
    label,
    dateLabel,
    prominence: label && label !== "Active" ? "notice" : "compact",
    summary: [
      label ? `Status: ${label}.` : null,
      dateLabel ? `Status date: ${dateLabel}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
};
