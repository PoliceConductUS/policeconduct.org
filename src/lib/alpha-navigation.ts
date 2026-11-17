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

  const nextPageByLetter = new Map<string, number | null>();
  let nextPage: number | null = null;

  for (let index = ALPHA_LETTERS.length - 1; index >= 0; index -= 1) {
    const letter = ALPHA_LETTERS[index];
    nextPageByLetter.set(letter, nextPage);
    nextPage = byLetter.get(letter) ?? nextPage;
  }

  return ALPHA_LETTERS.map((letter) => {
    const page = byLetter.get(letter) ?? null;
    const followingPage = nextPageByLetter.get(letter) ?? null;
    return {
      letter,
      page,
      endPage: page === null ? null : followingPage ? followingPage - 1 : null,
    };
  });
};
