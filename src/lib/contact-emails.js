/** Split a source email field for display without assigning addresses to people.
 * @param {string | null | undefined} value
 * @returns {string[]}
 */
export const contactEmailsForDisplay = (value) =>
  value
    ? value
        .trim()
        .replace(/\.$/, "")
        .split(/[;,]/)
        .map((address) => address.trim())
        .filter((address) => address.length > 0)
    : [];
