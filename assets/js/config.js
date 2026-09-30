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
    deliveryAreas: "All over the Dallas–Fort Worth (DFW) area",
    // Cloud kitchen — no public street address. Pickup point is arranged per order.
    hasPublicAddress: false,

    /* --- Contact --- */
    // Digits only, country code first, no symbols.
    whatsappNumber: "17879684078",
    // Same number, formatted for display.
    phoneDisplay: "+1 (787) 968-4078",
    phoneHref: "https://wa.me/17879684078",
    email: "pharaohsbites.dallas@gmail.com",
    // Contact + catering forms post here; the relay emails them to the address above.
    enquiryEndpoint: "https://script.google.com/macros/s/AKfycbwbD7emDtCvFR25_xc2PYOnRzKN9FgsMs-bQPEsqFMgYFJQ0wEHDADAoJPoHQWc8Nb1/exec",
    enquiryToken: "948d233dd65a28a88dab5ab0d5df1e34",

    /* --- When --- */
    // TODO: confirm real hours.
    hours: "Open 24/7",
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
    financeCheckoutEndpoint: "https://vvwunhcpxofvnjijemdb.supabase.co/functions/v1/create-checkout",
    financeQuoteEndpoint: "https://vvwunhcpxofvnjijemdb.supabase.co/functions/v1/delivery-quote",
    enablePickup: false,   /* set to true to bring back the Delivery / Pickup choice */
    pickupAddress: "4911 Haverwood Ln, Dallas, TX 75287",
    financeAnonKey: "sb_publishable_7gy7wfs9_FxaPBE_Ap5Spw_3SDZ2IEf",
    // Fallback while no endpoint exists: hand the order to WhatsApp so a
    // customer is never left with a dead button.
    orderFallbackWhatsApp: true
  };
})(window);
