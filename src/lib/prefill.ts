export type PrefillPayload = Record<string, unknown>;

const hasSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

export const setFlashPrefill = (
  key: string,
  payload: PrefillPayload,
): boolean => {
  if (!hasSessionStorage()) {
    return false;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (_error) {
    return false;
  }
};

export const readAndConsumeFlashPrefill = <T extends PrefillPayload>(
  key: string,
): T | null => {
  if (!hasSessionStorage()) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    window.sessionStorage.removeItem(key);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as T;
  } catch (_error) {
    return null;
  }
};
