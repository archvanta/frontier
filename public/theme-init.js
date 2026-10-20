/* Applies the saved colour theme before first paint (a classic script, so the CSP's script-src 'self' allows it).
   Keep in sync with src/lib/theme.ts. Dark is the default. */
(function () {
  var theme = 'dark';
  try {
    if (window.localStorage.getItem('signal-ai:theme') === 'light') theme = 'light';
  } catch (e) {
    /* storage blocked: stay dark */
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
