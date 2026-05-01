/* Tiny shared boot for pages that just need the i18n walker
 * + lang toggle (404, privacy, terms).
 *
 * Privacy/terms keep their English body text intentionally — the legal
 * version is the binding one. The page only flips the chrome (header,
 * footer, lang button) and shows a small ES notice when toggled.
 */
applyI18n();
bindLangToggle(() => {
  applyI18n();
  /* Show / hide the "this page is English-only" notice on legal pages. */
  document.querySelectorAll('.legal-es-notice').forEach(n => {
    n.style.display = (lang === 'es') ? 'block' : 'none';
  });
});
/* Initial paint for the legal notice */
document.querySelectorAll('.legal-es-notice').forEach(n => {
  n.style.display = (lang === 'es') ? 'block' : 'none';
});
