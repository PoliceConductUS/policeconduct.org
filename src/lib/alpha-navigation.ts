export const ALPHA_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const normalizeLetter = (value: string | null | undefined) => {
  const firstChar = String(value || "")
    .trim()
    .charAt(0)
    .toUpperCase();
  return /^[A-Z]$/.test(firstChar) ? firstChar : null;
};

export const buildAlphaPageMap = <T>(
  items: T[],
  getLabel: (item: T) => string | null | undefined,
  pageSize: number,
) => {
  const byLetter = new Map<string, number>();

  items.forEach((item, index) => {
    const letter = normalizeLetter(getLabel(item));
    if (!letter || byLetter.has(letter)) {
      return;
    }
    byLetter.set(letter, Math.floor(index / pageSize) + 1);
  });

  return ALPHA_LETTERS.map((letter, index) => {
    const page = byLetter.get(letter) ?? null;
    const nextPage = ALPHA_LETTERS.slice(index + 1)
      .map((nextLetter) => byLetter.get(nextLetter) ?? null)
      .find((value) => value !== null);
    return {
      letter,
      page,
      endPage:
        page === null ? null : nextPage !== undefined ? nextPage - 1 : null,
    };
  });
};
