/* Public module configuration (no secrets). Lead destination and tracking IDs are not set yet: with every ID null
   no external script loads. redirect null: the form shows its own confirmation step. */
window.CS_CONFIG = {
  siteId: '12-cleaning',
  lead: {
    endpoint: '/api/lead.php',
    redirect: null,
    smsConsentVersion: 'sms-twelve-v1-2026-11-22'
  },
  serviceArea: { zips: [], outOfArea: 'accept-with-message' },
  tracking: {
    mode: 'direct',
    ga4: null,
    metaPixel: null,
    googleAds: null,
    gtm: null,
    consentDefault: 'granted',
    leadValue: null,
    debugParam: 'cs_debug'
  }
};

// preview copy: the form is simulated and nothing is tracked
window.CS_CONFIG = Object.assign({}, window.CS_CONFIG, { preview: true });
window.CS_CONFIG.lead = Object.assign({}, window.CS_CONFIG.lead, { endpoint: '/12-cleaning-preview/api/lead.php', redirect: null });
window.CS_CONFIG.tracking = Object.assign({}, window.CS_CONFIG.tracking, { mode: 'off', ga4: null, metaPixel: null, googleAds: null, gtm: null });
