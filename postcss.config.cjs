// No in-build PostCSS transforms.
//
// PurgeCSS runs as a POST-BUILD step (scripts/purge-built-css.mjs) against the
// rendered HTML in dist/, NOT here against source. Purging during the build can
// only scan source files, so any class introduced dynamically or via data —
// and every Astro build-time scope class — is invisible to it and gets
// stripped, making individual pages "drift" (break) while others look fine.
// Scanning the actual built HTML instead means every class that appears on any
// of the ~165k pages is seen, so purge can only remove classes used on zero
// pages. Drift becomes impossible by construction. See scripts/purge-built-css.mjs.
module.exports = {
  plugins: [],
};
