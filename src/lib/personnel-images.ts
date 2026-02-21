const personnelImagesById: Record<string, string> = {
  cm7a0bh1z2f39ewvglexrgaig: "/img/personnel/cm7a0bh1z2f39ewvglexrgaig.webp",
};

export const getPersonnelImageById = (personnelId: string) =>
  personnelImagesById[personnelId] || null;
