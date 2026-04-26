window.JOBBER_CONFIG = {
  requestFormUrl: 'https://clienthub.getjobber.com/hubs/8965bea7-cbcc-455c-a395-31da7a6cffea/public/requests/4217595/new',
  allowedOrigin: 'https://clienthub.getjobber.com',
  // NOTE: Jobber does NOT honor URL query-string prefill params (verified 2026-04-24).
  // The URL returned by buildUrl() opens the correct form but fields will be blank.
  // The UI must show a recap card so the user can copy their info in manually.
  prefillEnabled: false,
  confirmWithin: {
    en: "We confirm your date within 2 hours (7 AM – 9 PM).",
    es: "Confirmamos tu fecha en menos de 2 horas (7 AM – 9 PM).",
  },

  /**
   * Build a Jobber Work Request URL.
   * @param {Object} notes - free-text summary of what was requested (goes in the notes field)
   * @returns {string} Full URL to the Jobber form
   */
  buildUrl: function (notes) {
    var base = this.requestFormUrl;
    if (!notes) return base;
    var params = new URLSearchParams();
    params.set('notes', notes);
    var sep = base.includes('?') ? '&' : '?';
    return base + sep + params.toString();
  },
};
