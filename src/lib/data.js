export const groupBy = (rows, key) =>
  rows.reduce((acc, row) => {
    const value = row?.[key];
    if (!value) {
      return acc;
    }
    if (!acc[value]) {
      acc[value] = [];
    }
    acc[value].push(row);
    return acc;
  }, {});

export const mapBy = (rows, key) =>
  rows.reduce((acc, row) => {
    acc[row[key]] = row;
    return acc;
  }, {});

export const normalizeAgencyHistory = (entries) =>
  [...entries].sort((a, b) => {
    const aDate = a.start_date ? new Date(a.start_date) : new Date(0);
    const bDate = b.start_date ? new Date(b.start_date) : new Date(0);
    return aDate - bDate;
  });
