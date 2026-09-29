/* ==========================================================================
   PHARAOH'S BITES — Business configuration
   ONE place for every real-world detail. Every page reads from this object,
   so changing a phone number here changes it everywhere.

   Anything marked TODO is a placeholder and MUST be confirmed before launch.
   ========================================================================== */
(function (global) {
  "use strict";

  global.NB_CONFIG = {
    /* --- Identity --- */
    businessName: "Pharaoh's Bites",
    tagline: "Authentic Egyptian Feteer",
    taglineAr: "فطير مصري أصلي",

    /* --- Where --- */
    city: "Dallas, TX",
    region: "TX",
    country: "US",
    // TODO: confirm your real pickup/delivery zones.
    deliveryAreas: "Uptown, Deep Ellum, Plano, Frisco and Irving",
    // Cloud kitchen — no public street address. Pickup point is arranged per order.
    hasPublicAddress: false,

    /* --- Contact --- */
    // Digits only, country code first, no symbols.
    whatsappNumber: "17879684078",
    // Same number, formatted for display.
    phoneDisplay: "+1 (787) 968-4078",
    phoneHref: "https://wa.me/17879684078",
    email: "pharaohsbites.dallas@gmail.com",

    /* --- When --- */
    // TODO: confirm real hours.
    hours: "Thu – Sun, 12:00 PM – 8:00 PM (CT)",
    // TODO: confirm real lead time for large/catering orders.
    cateringNotice: "at least 48 hours",

    /* --- Money --- */
    currency: "USD",
    currencySymbol: "$",
    // Percentages applied in the basket. Set to 0 to hide the line.
    servicePercent: 0,
    deliveryFee: 5,
    freeDeliveryOver: 60,
    minimumOrder: 20,

    /* --- Social — leave blank to disable the icon --- */
    instagramUrl: "",
    facebookUrl: "",

    /* --- Ordering backend ---------------------------------------------
       The basket posts the order here as JSON. While this is empty the
       checkout button stays disabled with an explanatory note, so the site
       never pretends to take an order it cannot actually receive.

       Any endpoint accepting a JSON POST works — your own API, a Google
       Apps Script web app, a Formspree/Basin form endpoint, a Zapier or
       Make webhook. See README for the exact payload shape.
    ------------------------------------------------------------------- */
    orderEndpoint: "",              // TODO: paste your endpoint URL
    // WhatsApp Business number that receives orders (digits only, country
    // code first). Used by the "Complete Order on WhatsApp" button.
    orderWhatsappNumber: "17879684078",

    /* --- Finance dashboard integration --------------------------------
       Before WhatsApp opens, the order is recorded in the private finance
       system (pharaohs-bites-finance) through its create-order Edge
       Function, which assigns the PB-YYYY-NNNNN order number. Both values
       come from the Supabase project (Project Settings → API). The anon
       key is public by design; the function validates and re-prices every
       order server-side and the database is locked with Row Level Security.
       Leave financeOrderEndpoint empty to skip recording (WhatsApp only).
    ------------------------------------------------------------------- */
    financeOrderEndpoint: "https://vvwunhcpxofvnjijemdb.supabase.co/functions/v1/create-order",
    financeAnonKey: "sb_publishable_7gy7wfs9_FxaPBE_Ap5Spw_3SDZ2IEf",
    // Fallback while no endpoint exists: hand the order to WhatsApp so a
    // customer is never left with a dead button.
    orderFallbackWhatsApp: true
  };
})(window);
