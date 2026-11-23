export const agencyStatusPresentation = (
  status: string | null,
  date: string | null,
) => {
  const dateLabel = date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;
  return {
    label: status,
    dateLabel,
    summary: [
      status ? `Status: ${status}.` : null,
      dateLabel ? `Status date: ${dateLabel}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
};
