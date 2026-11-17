const shouldLogRouteTiming = () =>
  (process.env.ROUTE_TIMING || "").trim() !== "";

export const timeBuildStep = async <T>(
  label: string,
  callback: () => Promise<T>,
): Promise<T> => {
  if (!shouldLogRouteTiming()) {
    return callback();
  }

  const start = performance.now();
  try {
    return await callback();
  } finally {
    const elapsedMs = Math.round(performance.now() - start);
    console.info(`[route-timing] ${label}: ${elapsedMs}ms`);
  }
};
