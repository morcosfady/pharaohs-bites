/* ==========================================================================
   PHARAOH'S BITES — Interactions
   No dependencies. Every module is a no-op when its markup is absent, so the
   same bundle serves every page.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.NB_DATA || { CATEGORIES: [], MENU: [], GALLERY: [], REVIEWS: [] };
  var C = window.NB_CONFIG || {};
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var money = function (n) {
    var sym = C.currencySymbol || "$";
    /* Whole dollars read cleaner on a menu; only show cents when there are any. */
    var body = (n % 1 === 0) ? n.toLocaleString("en-US")
                             : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return sym + body;
  };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* --- Persistent store (favourites + basket) ------------------------- */
  var Store = {
    read: function (key, fallback) {
      try { return JSON.parse(localStorage.getItem("nb:" + key)) || fallback; }
      catch (e) { return fallback; }
    },
    write: function (key, value) {
      try { localStorage.setItem("nb:" + key, JSON.stringify(value)); } catch (e) {}
    }
  };
  /* --- Visitor log (anonymous) --------------------------------------------
     A random id kept in this browser, plus what the visitor does: opened a page,
     added a dish, pressed Place Order, hit a problem. No names or emails are sent,
     except first name + last 4 phone digits when an order fails (so we can help).
     Visit the site once with ?me=1 to stop counting your own visits. */
  var Track = (function () {
    var off = false, vid = "", problems = 0;
    try {
      if (/[?&]me=1/.test(location.search)) localStorage.setItem("nb:noTrack", "1");
      if (/[?&]me=0/.test(location.search)) localStorage.removeItem("nb:noTrack");
      off = !!localStorage.getItem("nb:noTrack") || navigator.doNotTrack === "1";
      vid = localStorage.getItem("nb:vid") || "";
      if (!vid) { vid = "v" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem("nb:vid", vid); }
    } catch (e) { off = true; }

    /* Where did this visit come from? A link tag (?src=qr, ?src=nextdoor ...) wins; otherwise the page they came from. */
    var SOURCES = [
      ["QR code (flyer)", /^(qr|flyer|qrcode)$/],
      ["Nextdoor", /nextdoor/],
      ["Instagram", /instagram|^ig$/],
      ["Facebook", /facebook|^fb$|fbclid|^meta$/],
      ["TikTok", /tiktok/],
      ["YouTube", /youtube|youtu\.be/],
      ["X (Twitter)", /twitter|^x$|^x\.com|t\.co$/],
      ["Snapchat", /snapchat/],
      ["Pinterest", /pinterest/],
      ["Reddit", /reddit/],
      ["LinkedIn", /linkedin/],
      ["Threads", /threads/],
      ["WhatsApp", /whatsapp|wa\.me/],
      ["Telegram", /telegram|^t\.me/],
      ["Google", /google/],
      ["Bing", /bing/],
      ["Email", /^(email|mail|newsletter)$|mail\.google|outlook|yahoo/]
    ];
    function match(text) {
      text = String(text || "").toLowerCase();
      for (var i = 0; i < SOURCES.length; i++) if (SOURCES[i][1].test(text)) return SOURCES[i][0];
      return "";
    }
    function source() {
      var m = location.search.match(/[?&](?:src|utm_source)=([^&]+)/);
      var tagged = m ? match(decodeURIComponent(m[1])) : "";
      if (tagged) return tagged;
      if (/[?&]fbclid=/.test(location.search)) return "Facebook";
      var ref = document.referrer || "";
      if (!ref) return "Direct";
      var host = ref.replace(/^https?:\/\//, "").split("/")[0];
      if (host.indexOf(location.host) > -1) return "";
      return match(host) || "Other website";
    }

    function send(kind, detail, meta) {
      if (off || !C.financeTrackEndpoint) return;
      var page = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
      try {
        fetch(C.financeTrackEndpoint, {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", "apikey": C.financeAnonKey || "" },
          body: JSON.stringify({ visitor_id: vid, events: [{ kind: kind, page: page, detail: detail || "", meta: meta || {} }] })
        }).catch(function () {});
      } catch (e) {}
    }

    return {
      id: function () { return vid; },
      visit: function () {
        var src = "";
        try { src = sessionStorage.getItem("nb:src") || ""; if (!src) { src = source(); if (src) sessionStorage.setItem("nb:src", src); } } catch (e) { src = source(); }
        send("visit", "", { source: src || "Direct" });
      },
      add: function (item) { send("add_to_basket", item.id, { item: item.name }); },
      checkout: function () { send("checkout_started"); },
      problem: function (type, detail, meta) { if (++problems > 6) return; meta = meta || {}; meta.type = type; send("problem", detail, meta); }
    };
  })();

  var favourites = Store.read("favourites", []);
  var basket = Store.read("basket", {});

  /* --- Combos with choices ---------------------------------------------
     A combo with `slots` is added to the basket with the customer's picks
     baked into its key:  family-feast~main=kofta-tray&sides=tahini,hummus&...
     so the same combo with different picks is a different basket line. */
  function menuItem(id) { return D.MENU.filter(function (m) { return m.id === id; })[0]; }
  function keyId(k) { return String(k).split("~")[0]; }
  function keyPicks(k) {
    var out = {}, q = String(k).split("~")[1];
    if (!q) return out;
    q.split("&").forEach(function (p) { var kv = p.split("="); if (kv[0] && kv[1]) out[kv[0]] = kv[1].split(","); });
    return out;
  }
  function makeKey(item, picks) {
    return item.id + "~" + item.slots.map(function (s) { return s.key + "=" + picks[s.key].join(","); }).join("&");
  }
  function picksValid(item, picks) {
    return item.slots.every(function (s) {
      var p = picks[s.key] || [];
      if (p.length !== s.count) return false;
      if (!p.every(function (id) { return s.options.indexOf(id) > -1; })) return false;
      return !s.distinct || p.filter(function (id, i) { return p.indexOf(id) === i; }).length === p.length;
    });
  }
  function picksText(item, picks) {
    return item.slots.map(function (s) {
      var counts = {}, order = [];
      (picks[s.key] || []).forEach(function (id) { if (!counts[id]) { counts[id] = 0; order.push(id); } counts[id]++; });
      return s.label + ": " + order.map(function (id) {
        var m = menuItem(id);
        return (m ? m.name : id) + (counts[id] > 1 ? " \u00d7" + counts[id] : "");
      }).join(", ");
    }).join(" \u00b7 ");
  }
  /* A saved basket can hold a choice combo without picks (from before picks existed): drop those lines. */
  Object.keys(basket).forEach(function (k) {
    var it = menuItem(keyId(k));
    if (it && it.slots && !picksValid(it, keyPicks(k))) delete basket[k];
  });

  /* --- Toasts --------------------------------------------------------- */
  var toastStack;
  function toast(message) {
    if (!toastStack) {
      toastStack = document.createElement("div");
      toastStack.className = "toast-stack";
      toastStack.setAttribute("role", "status");
      toastStack.setAttribute("aria-live", "polite");
      document.body.appendChild(toastStack);
    }
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = '<span class="toast__dot"></span><span>' + esc(message) + "</span>";
    toastStack.appendChild(el);
    setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { el.remove(); }, 380);
    }, 2800);
  }

  /* --- Header --------------------------------------------------------- */
  function initHeader() {
    var header = $(".site-header");
    var toggle = $(".nav-toggle");
    var nav = $("#primary-nav");
    if (!header) return;

    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        nav.classList.toggle("is-open", !open);
        document.body.classList.toggle("nav-open", !open);
      });
      $$("a", nav).forEach(function (a) {
        a.addEventListener("click", function () {
          toggle.setAttribute("aria-expanded", "false");
          nav.classList.remove("is-open");
          document.body.classList.remove("nav-open");
        });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("is-open")) toggle.click();
      });
    }
  }

  /* --- Scroll progress + back to top ---------------------------------- */
  function initScrollChrome() {
    var bar = $(".scroll-progress");
    var top = $(".to-top");
    if (!bar && !top) return;

    var tick = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? window.scrollY / max : 0;
      if (bar) bar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
      if (top) top.classList.toggle("is-visible", window.scrollY > 700);
    };
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    if (top) {
      top.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      });
    }
  }

  /* --- Reveal on scroll ------------------------------------------------ */
  var revealObserver = null;
  function observeReveals(root) {
    var nodes = $$("[data-reveal]", root || document).filter(function (n) { return !n.__nbSeen; });
    if (!nodes.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.__nbSeen = true; n.classList.add("is-in"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    nodes.forEach(function (n) { n.__nbSeen = true; revealObserver.observe(n); });
  }

  /* Stagger children of [data-stagger] */
  function applyStagger(root) {
    $$("[data-stagger]", root || document).forEach(function (group) {
      if (group.__nbStaggered) return;
      group.__nbStaggered = true;
      var step = parseInt(group.getAttribute("data-stagger"), 10) || 90;
      $$("[data-reveal]", group).forEach(function (child, i) {
        child.style.setProperty("--reveal-delay", Math.min(i, 8) * step + "ms");
      });
    });
  }

  /* --- Images: lazy swap, fade-in, graceful fallback ------------------- */
  function hydrateImages(root) {
    $$("img", root || document).forEach(function (img) {
      if (img.__nbBound) return;
      /* Skip placeholders that have no source yet (e.g. the lightbox canvas) */
      if (!img.getAttribute("data-src") && !img.getAttribute("src")) return;
      img.__nbBound = true;

      var fail = function () {
        var media = img.closest(".media") || img.parentElement;
        if (media) media.classList.add("img-failed");
      };
      var done = function () { img.classList.add("is-loaded"); };

      img.addEventListener("error", fail);
      img.addEventListener("load", done);

      var src = img.getAttribute("data-src");
      if (src) { img.src = src; img.removeAttribute("data-src"); }
      if (img.complete) { img.naturalWidth ? done() : fail(); }
    });
  }

  /* --- Parallax -------------------------------------------------------- */
  function initParallax() {
    var layers = $$("[data-parallax]");
    if (!layers.length || reduceMotion) return;

    var ticking = false;
    var frame = function () {
      ticking = false;
      var vh = window.innerHeight;
      layers.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        var offset = (rect.top + rect.height / 2 - vh / 2) * speed;
        el.style.transform = "translate3d(0," + offset.toFixed(2) + "px,0)";
      });
    };
    var request = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    };
    frame();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
  }

  /* --- Counters -------------------------------------------------------- */
  function initCounters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      nums.forEach(function (n) {
        n.textContent = (n.getAttribute("data-prefix") || "") + n.getAttribute("data-count") + (n.getAttribute("data-suffix") || "");
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        var el = entry.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var prefix = el.getAttribute("data-prefix") || "";
        var start = performance.now();
        var run = function (now) {
          var p = Math.min((now - start) / 1600, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(target * eased).toLocaleString("en-US") + suffix;
          if (p < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* --- Favourites ------------------------------------------------------ */
  function isFav(id) { return favourites.indexOf(id) > -1; }
  function toggleFav(id, name) {
    var i = favourites.indexOf(id);
    if (i > -1) { favourites.splice(i, 1); toast("Removed from favourites"); }
    else { favourites.push(id); toast(name + " saved to favourites"); }
    Store.write("favourites", favourites);
    syncFavButtons();
  }
  function syncFavButtons() {
    $$("[data-fav]").forEach(function (btn) {
      var on = isFav(btn.getAttribute("data-fav"));
      btn.setAttribute("aria-pressed", String(on));
      btn.setAttribute("aria-label", (on ? "Remove " : "Save ") + btn.getAttribute("data-name") + (on ? " from" : " to") + " favourites");
    });
    var badge = $("[data-fav-count]");
    if (badge) badge.textContent = favourites.length ? String(favourites.length) : "";
  }

  /* --- Basket ---------------------------------------------------------- */
  function basketCount() {
    return Object.keys(basket).reduce(function (sum, id) { return sum + basket[id]; }, 0);
  }
  function addToBasket(id, name, skipMilk) {
    var combo = menuItem(id);
    if (combo && combo.slots) { openComboPicker(combo); return; }
    if (combo && combo.milkVariant && !skipMilk) { openMilkChoice(combo); return; }
    if (combo && combo.onlyWith && (basket[id] || 0) >= (basket[combo.onlyWith] || 0)) {
      toast("One " + combo.name.toLowerCase() + " per " + menuItem(combo.onlyWith).name);
      return;
    }
    basket[id] = (basket[id] || 0) + 1;
    Store.write("basket", basket);
    if (combo) Track.add(combo);
    toast(name + " added to your order");
    renderBasket();
    syncBasketBadge();
    /* First time this dish goes in: offer its add-ons (e.g. sides for feteer). */
    var item = D.MENU.filter(function (m) { return m.id === id; })[0];
    if (item && item.suggest && basket[id] === 1) openAddons(item);
    /* Dishes with a specific add-on (koshary -> extra sauce) ask whenever there is a cup still to add. */
    if (item && item.suggestItems && item.suggestItems.some(function (x) { return (basket[x] || 0) < basket[id]; })) openItemAddons(item);
  }
  /* An add-on dish (onlyWith) can never be in the basket alone: at most one per copy of its main dish. */
  function trimAddOns() {
    var changed = false;
    D.MENU.forEach(function (m) {
      if (!m.onlyWith || !basket[m.id]) return;
      var cap = basket[m.onlyWith] || 0;
      if (basket[m.id] > cap) {
        if (cap) basket[m.id] = cap; else delete basket[m.id];
        changed = true;
      }
    });
    if (changed) Store.write("basket", basket);
  }
  trimAddOns();

  function setQty(id, qty) {
    if (qty <= 0) delete basket[id]; else basket[id] = qty;
    trimAddOns();
    Store.write("basket", basket);
    renderBasket();
    syncBasketBadge();
  }

  /* The floating pill on the order page only shows while the review panel
     itself is off screen — on wide screens the panel is sticky and always
     visible, so the pill never appears there. */
  var basketPanelInView = false;
  var lastBadgeCount = -1;
  function syncBasketBadge() {
    var n = basketCount();
    var changed = lastBadgeCount !== -1 && n !== lastBadgeCount;
    lastBadgeCount = n;
    $$("[data-basket-count]").forEach(function (el) { el.textContent = n ? String(n) : "0"; });
    $$("[data-basket-noun]").forEach(function (el) { el.textContent = n === 1 ? "item" : "items"; });
    $$("[data-basket-fab]").forEach(function (el) {
      var jump = el.hasAttribute("data-basket-jump");
      el.hidden = n === 0 || (jump && basketPanelInView);
      if (jump && changed && !el.hidden) {
        el.classList.remove("is-bump");
        void el.offsetWidth;                       /* restart the animation */
        el.classList.add("is-bump");
      }
    });
  }

  function initBasketFab() {
    var fab = $("[data-basket-jump]");
    var panel = $("#basket");
    if (!fab || !panel) return;

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        basketPanelInView = entries[0].isIntersecting;
        syncBasketBadge();
      }, { threshold: 0.15 }).observe(panel);
    }

    fab.addEventListener("click", function (e) {
      e.preventDefault();
      panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      var first = $("[data-basket-list] button", panel) || $("[data-checkout-form] input", panel);
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduceMotion ? 0 : 500);
    });
  }

  /* --- Add-ons prompt ---------------------------------------------------
     Opened by addToBasket() for dishes with a `suggest` category. Rows use
     the same [data-add] / [data-qty] buttons as the rest of the page, so the
     global click handler does the work; renderBasket() keeps the rows in
     step with the basket. */
  /* --- Combo picker: choose the mains, sides, puddings... before adding ------ */
  var picker = null, pickerState = null, pickerLastFocus = null;

  function openComboPicker(item) {
    if (!picker) {
      picker = document.createElement("div");
      picker.className = "addon";
      picker.setAttribute("role", "dialog");
      picker.setAttribute("aria-modal", "true");
      picker.setAttribute("aria-hidden", "true");
      document.body.appendChild(picker);
      picker.addEventListener("click", onPickerClick);
      picker.addEventListener("keydown", onPickerKey);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeComboPicker(); });
    }
    pickerState = { item: item, picks: {} };
    item.slots.forEach(function (s) { pickerState.picks[s.key] = []; });
    pickerLastFocus = document.activeElement;
    renderPicker(true);
    picker.classList.add("is-open");
    picker.setAttribute("aria-hidden", "false");
    document.body.classList.add("nav-open");
    $(".addon__close", picker).focus();
  }

  function closeComboPicker() {
    if (!picker || !picker.classList.contains("is-open")) return;
    picker.classList.remove("is-open");
    picker.setAttribute("aria-hidden", "true");
    document.body.classList.remove("nav-open");
    pickerState = null;
    if (pickerLastFocus && pickerLastFocus.focus) pickerLastFocus.focus();
  }

  function renderPicker(fromTop) {
    var item = pickerState.item;
    var panel = $(".addon__panel", picker);
    var scroll = panel ? panel.scrollTop : 0;
    var complete = true, missing = [];
    var sections = item.slots.map(function (s) {
      var have = pickerState.picks[s.key].length;
      if (have !== s.count) { complete = false; var left = s.count - have, noun = s.label.toLowerCase(); missing.push(left + " " + (left === 1 ? noun.replace(/s$/, "") : noun)); }
      var rows = s.options.map(function (id) {
        var m = menuItem(id);
        if (!m) return "";
        var n = pickerState.picks[s.key].filter(function (x) { return x === id; }).length;
        var control = s.count === 1
          ? '<span class="cp-radio" aria-hidden="true"></span>'
          : '<div class="qty" aria-label="Quantity of ' + esc(m.name) + '">' +
              '<button type="button" data-cp-step="' + esc(s.key + "|" + id + "|-1") + '" aria-label="Fewer ' + esc(m.name) + '">&minus;</button>' +
              "<output>" + n + "</output>" +
              '<button type="button" data-cp-step="' + esc(s.key + "|" + id + "|1") + '" aria-label="More ' + esc(m.name) + '">+</button></div>';
        return '<div class="addon-item' + (n ? " is-added" : "") + (s.count === 1 ? " cp-choose" : " cp-multi") + '"' +
          (s.count === 1 ? ' role="radio" tabindex="0" aria-checked="' + (n ? "true" : "false") + '" data-cp-choose="' + esc(s.key + "|" + id) + '"' : "") + ">" +
          '<div class="media"><img data-src="' + esc(m.img) + '" alt="" loading="lazy" decoding="async" width="58" height="58"></div>' +
          '<div><div class="addon-item__name">' + esc(m.name) + ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(m.ar) + "</span></div>" +
            '<span class="addon-item__price">Included</span></div>' +
          '<div class="addon-item__side">' + control + "</div></div>";
      }).join("");
      return '<section class="cp-slot" aria-label="' + esc(s.label) + '">' +
        '<h3 class="cp-slot__title">Pick ' + s.count + " " + esc(s.label.toLowerCase()) +
          (s.distinct ? " <small>(all different)</small>" : "") +
          '<span class="cp-slot__count' + (have === s.count ? " is-done" : "") + '">' + have + " / " + s.count + "</span></h3>" +
        '<div class="addon__list">' + rows + "</div></section>";
    }).join("");
    picker.innerHTML =
      '<div class="addon__panel">' +
        '<button class="lb-btn addon__close" type="button" data-cp-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<p class="eyebrow">Make it yours</p>' +
        '<h2 class="addon__title">' + esc(item.name) + " &middot; " + money(item.price) + "</h2>" +
        '<p class="addon__lead">' + esc(item.desc) + "</p>" + sections +
        '<div class="addon__actions cp-actions">' +
          '<span class="cp-status" role="status">' + (complete ? "All set" : "Still to choose: " + esc(missing.join(", "))) + "</span>" +
          '<button class="btn btn--gold btn--sm" type="button" data-cp-add' + (complete ? "" : " disabled") + ">Add to order &middot; " + money(item.price) + "</button>" +
        "</div></div>";
    hydrateImages(picker);
    var np = $(".addon__panel", picker);
    if (np && !fromTop) np.scrollTop = scroll;
  }

  function onPickerKey(e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-cp-choose]")) { e.preventDefault(); e.target.click(); }
  }

  function onPickerClick(e) {
    if (!pickerState) return;
    if (e.target === picker || e.target.closest("[data-cp-close]")) { closeComboPicker(); return; }
    var item = pickerState.item;
    var slotOf = function (key) { return item.slots.filter(function (s) { return s.key === key; })[0]; };
    var choose = e.target.closest("[data-cp-choose]");
    if (choose) {
      var cp = choose.getAttribute("data-cp-choose").split("|");
      pickerState.picks[cp[0]] = [cp[1]];
      renderPicker(); return;
    }
    var step = e.target.closest("[data-cp-step]");
    if (step) {
      var sp = step.getAttribute("data-cp-step").split("|"), slot = slotOf(sp[0]), list = pickerState.picks[sp[0]];
      if (sp[2] === "1") {
        var already = list.filter(function (x) { return x === sp[1]; }).length;
        if (list.length < slot.count && !(slot.distinct && already)) list.push(sp[1]);
      } else {
        var at = list.lastIndexOf(sp[1]);
        if (at > -1) list.splice(at, 1);
      }
      renderPicker(); return;
    }
    if (e.target.closest("[data-cp-add]")) {
      var picks = {};
      item.slots.forEach(function (s) {
        picks[s.key] = pickerState.picks[s.key].slice().sort(function (a, b) { return s.options.indexOf(a) - s.options.indexOf(b); });
      });
      if (!picksValid(item, picks)) return;
      var key = makeKey(item, picks);
      basket[key] = (basket[key] || 0) + 1;
      Store.write("basket", basket);
      toast(item.name + " added to your order");
      renderBasket();
      syncBasketBadge();
      closeComboPicker();
    }
  }

  var addonLastFocus = null;

  function addonRow(item) {
    var qty = basket[item.id] || 0;
    return '' +
      '<div class="addon-item' + (qty ? " is-added" : "") + '" data-addon-item="' + esc(item.id) + '">' +
        '<div class="media"><img data-src="' + esc(item.img) + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async" width="58" height="58"></div>' +
        '<div><div class="addon-item__name">' + esc(item.name) + ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(item.ar) + "</span></div>" +
          '<span class="addon-item__price">' + money(item.price) + "</span></div>" +
        '<div class="addon-item__side">' +
          '<div class="qty" aria-label="Quantity">' +
            '<button type="button" data-qty="-1" data-id="' + esc(item.id) + '" aria-label="Reduce quantity of ' + esc(item.name) + '">&minus;</button>' +
            "<output>" + qty + "</output>" +
            '<button type="button" data-qty="1" data-id="' + esc(item.id) + '" aria-label="Increase quantity of ' + esc(item.name) + '">+</button>' +
          "</div>" +
          '<button class="btn btn--sm btn--gold" type="button" data-add="' + esc(item.id) + '" data-name="' + esc(item.name) + '">Add</button>' +
        "</div>" +
      "</div>";
  }

  /* opts: { category, exclude, eyebrow, title, lead, skip, done, onContinue }
     "skip" and "done" are the two button labels; both close the dialog and
     run onContinue (if any). The ✕, backdrop and Escape close without it. */
  var addonContinue = null;

  function showAddons(opts) {
    var box = $("[data-addon]");
    if (!box) return false;
    var extras = opts.ids ? opts.ids.map(menuItem).filter(Boolean)
      : D.MENU.filter(function (m) { return m.cat === opts.category && m.id !== opts.exclude && !m.hidden; });
    if (!extras.length) return false;

    $(".addon__actions", box).hidden = false;
    $("[data-addon-eyebrow]", box).textContent = opts.eyebrow;
    $("[data-addon-title]", box).textContent = opts.title;
    $("[data-addon-lead]", box).textContent = opts.lead;
    $("[data-addon-skip]", box).textContent = opts.skip;
    $("[data-addon-done]", box).textContent = opts.done;
    var list = $("[data-addon-list]", box);
    list.innerHTML = extras.map(addonRow).join("");
    hydrateImages(list);
    addonContinue = opts.onContinue || null;

    if (!box.classList.contains("is-open")) {
      addonLastFocus = document.activeElement;
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.classList.add("nav-open");
    }
    $(".addon__panel", box).scrollTop = 0;
    $(".addon__close", box).focus();
    return true;
  }

  function openAddons(item) {
    showAddons({
      category: item.suggest, exclude: item.id,
      eyebrow: "Optional",
      title: "Anything on the side?",
      lead: item.name + " is best torn open and eaten with these. Add any you like, or skip — it is entirely up to you.",
      skip: "No thanks", done: "Done"
    });
  }

  /* "Which milk?" prompt for drinks that have an almond-milk version. */
  function openMilkChoice(item) {
    var box = $("[data-addon]");
    if (!box) { addToBasket(item.id, item.name, true); return; }
    var alt = menuItem(item.milkVariant);
    var extra = alt.price - item.price;
    $("[data-addon-eyebrow]", box).textContent = "Your drink";
    $("[data-addon-title]", box).textContent = "Which milk would you like?";
    $("[data-addon-lead]", box).textContent = item.name + " is made with whole milk, or with almond milk" + (isVegan(alt) ? " (100% vegan)" : "") + ".";
    var choice = function (it, label, note) {
      return '<button class="btn btn--sm milk-choice" type="button" data-milk="' + esc(it.id) + '" data-name="' + esc(it.name) + '">' +
        "<span>" + label + "</span><small>" + note + "</small></button>";
    };
    $("[data-addon-list]", box).innerHTML =
      choice(item, "Whole milk", money(item.price)) +
      choice(alt, "Almond milk" + (isVegan(alt) ? " " + veganBadge() : ""), money(alt.price) + (extra > 0 ? " (+" + money(extra) + ")" : ""));
    $(".addon__actions", box).hidden = true;
    addonContinue = null;
    if (!box.classList.contains("is-open")) {
      addonLastFocus = document.activeElement;
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.classList.add("nav-open");
    }
    $(".addon__panel", box).scrollTop = 0;
  }

  function openItemAddons(item) {
    var extra = menuItem(item.suggestItems[0]);
    var what = extra.name.toLowerCase();
    showAddons({
      ids: item.suggestItems,
      eyebrow: "Optional",
      title: what.charAt(0).toUpperCase() + what.slice(1) + " on the side?",
      lead: "Add a cup of our tomato sauce for just " + money(extra.price) + ", one per " + item.name + ". Or skip, it is entirely up to you.",
      skip: "No thanks", done: "Done"
    });
  }

  function closeAddons(proceed) {
    var box = $("[data-addon]");
    if (!box || !box.classList.contains("is-open")) return;
    var next = addonContinue;
    addonContinue = null;
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("nav-open");
    if (addonLastFocus && addonLastFocus.focus) addonLastFocus.focus();
    if (proceed && next) next();
  }

  /* Before the order is sent: a last nudge for each category the customer
     skipped. Each step only appears when nothing from that category is in
     the basket, and either button carries on to the next step. */
  var CHECKOUT_NUDGES = [
    { category: "sides",
      eyebrow: "Before you send",
      title: "Sure you don’t want any sides?",
      lead: "Egyptians never eat feteer without something next to it. Are you sure you don’t want to add one of these delicious sides?" },
    { category: "desserts",
      eyebrow: "One last thing",
      title: "Nothing sweet to finish?",
      lead: "Are you sure you don’t want to add one of our desserts? They travel well and are cut to order." }
  ];

  function basketHasCategory(cat) {
    return Object.keys(basket).some(function (id) {
      var item = menuItem(keyId(id));
      return item && item.cat === cat;
    });
  }

  function runCheckoutNudges(then) {
    var pending = CHECKOUT_NUDGES.filter(function (n) { return !basketHasCategory(n.category); });
    (function step() {
      var nudge = pending.shift();
      if (!nudge) { then(); return; }
      var shown = showAddons({
        category: nudge.category, eyebrow: nudge.eyebrow, title: nudge.title, lead: nudge.lead,
        skip: "No thanks", done: (C.financeCheckoutEndpoint && !freePromo() ? "Continue to payment" : "Place order"),
        onContinue: step
      });
      if (!shown) step();
    })();
  }

  /* Keep the open prompt's quantities in step with the basket. */
  function syncAddons() {
    var box = $("[data-addon]");
    if (!box || !box.classList.contains("is-open")) return;
    $$("[data-addon-item]", box).forEach(function (row) {
      var qty = basket[row.getAttribute("data-addon-item")] || 0;
      row.classList.toggle("is-added", qty > 0);
      var out = $("output", row);
      if (out) out.textContent = qty;
    });
  }

  function initAddons() {
    var box = $("[data-addon]");
    if (!box) return;
    box.addEventListener("click", function (e) {
      var milk = e.target.closest("[data-milk]");
      if (milk) {
        closeAddons(false);
        addToBasket(milk.getAttribute("data-milk"), milk.getAttribute("data-name"), true);
        return;
      }
      if (e.target.closest("[data-addon-continue]")) closeAddons(true);
      else if (e.target === box || e.target.closest("[data-addon-close]")) closeAddons(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAddons(false);
    });
  }

  /* Pharaoh mark for house specials. `label` renders an accessible name once
     per item; repeat marks elsewhere on the same card are decorative. */
  /* The ankh, the ancient Egyptian symbol of life: the mark for our signature dishes. */
  var ANKH_SVG = '<svg viewBox="0 0 24 34" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="9.2" rx="5.6" ry="7.2"/><path d="M12 16.4V32M4.2 20h15.6"/></svg>';
  function ankh(cls, label) {
    return '<span class="' + cls + '"' + (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '>' + ANKH_SVG + '</span>';
  }
  /* Green leaf: the mark for vegan dishes. */
  var LEAF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19c2-5 5-8 9-10"/></svg>';
  function isVegan(item) { return (item.tags || []).some(function (t) { return /^vegan$/i.test(t); }); }
  function veganBadge() { return '<span class="vegan-badge" role="img" aria-label="Vegan">' + LEAF_SVG + "</span>"; }
  function pharaoh(label) {
    return ankh("pharaoh-mark", label ? "House special" : "");
  }

  var SVG_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.6S3.8 15.3 3.8 9.6a4.6 4.6 0 0 1 8.2-2.8 4.6 4.6 0 0 1 8.2 2.8c0 5.7-8.2 11-8.2 11z"/></svg>';
  var SVG_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  /* --- Card + row templates -------------------------------------------- */
  function dishCard(item, opts) {
    opts = opts || {};
    var tag = item.special
      ? '<span class="tag tag--special">' + pharaoh(false) + "House Special</span>"
      : (isVegan(item) ? '<span class="tag tag--vegan">' + LEAF_SVG + "Vegan</span>"
      : (item.tags && item.tags.length ? '<span class="tag">' + esc(item.tags[0]) + "</span>" : ""));
    return '' +
      '<article class="card dish" data-reveal="scale">' +
        '<div class="media media--4x3">' + tag +
          '<img data-src="' + esc(item.img) + '" alt="' + esc(item.name) + ' — ' + esc(item.desc.slice(0, 70)) + '" loading="lazy" decoding="async" width="900" height="675">' +
        "</div>" +
        '<div class="dish__body">' +
          '<div class="dish__top">' +
            '<h3 class="dish__name">' + (item.special ? pharaoh(true) : "") + esc(item.name) +
              ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(item.ar) + "</span></h3>" +
            '<span class="dish__price">' + money(item.price) + "</span>" +
          "</div>" +
          '<p class="dish__desc">' + esc(item.desc) + "</p>" +
          (opts.noActions ? "" :
          '<div class="dish__actions">' +
            '<button class="btn btn--sm" type="button" data-add="' + esc(item.id) + '" data-name="' + esc(item.name) + '">Order</button>' +
            '<button class="fav" type="button" data-fav="' + esc(item.id) + '" data-name="' + esc(item.name) + '" aria-pressed="false">' + SVG_HEART + "</button>" +
          "</div>") +
        "</div>" +
      "</article>";
  }

  /* Combos: small photos of what's inside, plus how much the bundle saves. */
  function comboExtras(item) {
    if (!item.includes) return "";
    var get = function (id) { return menuItem(id); };
    var parts = item.includes.map(get).filter(Boolean);
    var worth = item.worth != null ? item.worth : parts.reduce(function (n, m) { return n + m.price; }, 0);
    var save = worth - item.price;
    var part = function (m) {
      return '<span class="combo__part"><img data-src="' + esc(m.img) + '" alt="" loading="lazy" decoding="async" width="44" height="44"><span>' + esc(m.name) + "</span></span>";
    };
    /* The contents as a row of groups joined by "+". Fixed items are one group each; a choice with two
       options (main, shake) stacks the options with "or" between; a bigger choice shows a small photo stack. */
    var inSlot = {};
    (item.slots || []).forEach(function (sl) { sl.options.forEach(function (id) { inSlot[id] = true; }); });
    var groups = parts.filter(function (m) { return !inSlot[m.id]; }).map(function (m) { return '<span class="combo__grp">' + part(m) + "</span>"; });
    (item.slots || []).forEach(function (sl) {
      var opts = sl.options.map(get).filter(Boolean);
      if (opts.length <= 2) {
        groups.push('<span class="combo__grp combo__grp--or"><span class="combo__orbox">' + opts.map(part).join('<span class="combo__or">or</span>') + "</span></span>");
      } else {
        var noun = sl.label.toLowerCase();
        if (sl.count === 1) noun = noun.replace(/s$/, "");
        groups.push('<span class="combo__grp combo__grp--pick"><span class="combo__stack">' +
          opts.slice(0, 4).map(function (m) { return '<img data-src="' + esc(m.img) + '" alt="" loading="lazy" decoding="async" width="36" height="36">'; }).join("") +
          "</span><span>" + sl.count + " " + esc(noun) + " of your choice</span></span>");
      }
    });
    var flow = groups.join("");
    return '<div class="combo__parts combo__flow">' + flow + "</div>" +
      (save > 0 ? '<div class="combo__save"><b>You save ' + money(save) + '</b> <span>instead of <s>' + money(worth) + "</s></span></div>" : "");
  }

  function menuRow(item) {
    var veganNote = item.veganOption ? '<span class="pill pill--veg pill--vegan">' + LEAF_SVG + "Vegan with almond milk</span>" : "";
    var pills = veganNote + (item.tags || []).map(function (t) {
      if (/^vegan$/i.test(t)) return '<span class="pill pill--veg pill--vegan">' + LEAF_SVG + "Vegan</span>";
      var cls = /vegan|vegetarian/i.test(t) ? "pill pill--veg" : (/signature|chef|tasting|special|best value/i.test(t) ? "pill pill--gold" : "pill");
      return '<span class="' + cls + '">' + esc(t) + "</span>";
    }).join("");
    return '' +
      '<article class="order-item menu-item' + (item.includes ? " menu-item--combo" : "") + '"' + (isVegan(item) || item.veganOption ? " data-vegan" : "") + ' data-reveal>' +
        '<div class="media media--1x1"><img data-src="' + esc(item.img) + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async" width="200" height="200"></div>' +
        "<div><h3>" + (item.special ? pharaoh(true) : "") + esc(item.name) + (isVegan(item) ? " " + veganBadge() : "") +
          ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(item.ar) + "</span></h3>" +
          "<p>" + esc(item.desc) + "</p>" + comboExtras(item) +
          (pills ? '<div class="menu-item__meta">' + pills + "</div>" : "") +
        "</div>" +
        '<div class="order-item__side">' +
          '<span class="order-item__price">' + money(item.price) + "</span>" +
          '<div class="flex gap-2 items-center">' +
            '<button class="fav" type="button" data-fav="' + esc(item.id) + '" data-name="' + esc(item.name) + '" aria-pressed="false">' + SVG_HEART + "</button>" +
            '<button class="btn btn--sm btn--gold" type="button" data-add="' + esc(item.id) + '" data-name="' + esc(item.name) + '">Add</button>' +
          "</div>" +
        "</div>" +
      "</article>";
  }

  /* --- Featured dishes (home) ------------------------------------------ */
  function renderFeatured() {
    var host = $("[data-featured]");
    if (!host) return;
    var limit = parseInt(host.getAttribute("data-featured"), 10) || 6;
    host.innerHTML = D.MENU.filter(function (i) { return i.featured; }).slice(0, limit).map(function (i) { return dishCard(i); }).join("");
  }

  /* --- Full menu ------------------------------------------------------- */
  function renderMenu() {
    var host = $("[data-menu-groups]");
    if (!host) return;

    var filters = $("[data-menu-filters]");
    var search = $("#menu-search");
    var empty = $(".empty-state");

    host.innerHTML = D.CATEGORIES.map(function (cat) {
      var items = D.MENU.filter(function (i) { return i.cat === cat.id; });
      return '' +
        '<section class="menu-group" id="' + cat.id + '" data-group="' + cat.id + '">' +
          '<div class="menu-group__head" data-reveal>' +
            "<div><h2>" + esc(cat.name) + "</h2><p>" + esc(cat.blurb) + "</p></div>" +
            '<span class="menu-group__count"><span data-group-count>' + items.length + "</span> dishes</span>" +
          "</div>" +
          '<div class="menu-items" data-stagger="40">' + items.map(menuRow).join("") + "</div>" +
        "</section>";
    }).join("");

    if (filters) {
      filters.innerHTML =
        '<button class="chip" type="button" data-filter="all" aria-pressed="true">All</button>' +
        D.CATEGORIES.map(function (c) {
          return '<button class="chip' + (c.id === "combos" ? " chip--combo" : "") + '" type="button" data-filter="' + c.id + '" aria-pressed="false">' + esc(c.name) + "</button>";
        }).join("") +
        '<button class="chip chip--vegan" type="button" data-filter="vegan" aria-pressed="false">' + LEAF_SVG + "Vegan</button>";
    }

    var state = { cat: "all", q: "" };

    function apply() {
      var visibleTotal = 0;
      $$(".menu-group", host).forEach(function (group) {
        var catMatch = state.cat === "all" || group.getAttribute("data-group") === state.cat;
        var shown = 0;
        $$(".menu-item", group).forEach(function (row) {
          var text = row.textContent.toLowerCase();
          var hit = (catMatch || (state.cat === "vegan" && row.hasAttribute("data-vegan"))) && (!state.q || text.indexOf(state.q) > -1);
          row.hidden = !hit;
          if (hit) shown++;
        });
        group.hidden = shown === 0;
        var counter = $("[data-group-count]", group);
        if (counter) counter.textContent = String(shown);
        visibleTotal += shown;
      });
      if (empty) empty.classList.toggle("is-visible", visibleTotal === 0);
    }

    if (filters) {
      filters.addEventListener("click", function (e) {
        var chip = e.target.closest("[data-filter]");
        if (!chip) return;
        state.cat = chip.getAttribute("data-filter");
        $$("[data-filter]", filters).forEach(function (c) {
          c.setAttribute("aria-pressed", String(c === chip));
        });
        apply();
        if (state.cat !== "all") {
          var target = state.cat === "vegan" ? $(".menu-group:not([hidden])", host) : $("#" + state.cat);
          if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 130, behavior: reduceMotion ? "auto" : "smooth" });
        }
      });
    }
    if (search) {
      var t;
      search.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () { state.q = search.value.trim().toLowerCase(); apply(); }, 140);
      });
    }
    apply();
  }

  /* --- Order page ------------------------------------------------------ */
  function renderOrderList() {
    var host = $("[data-order-list]");
    if (!host) return;
    var filters = $("[data-order-filters]");

    host.innerHTML = D.MENU.filter(function (i) { return !i.hidden; }).map(function (item) {
      /* The house signature gets its own bigger, richer card */
      if (item.hero) {
        return '' +
          '<article class="order-item order-item--hero" data-cat="' + esc(item.cat) + '" data-reveal>' +
            '<div class="hero-item__media media media--4x3">' +
              '<span class="hero-item__ribbon">' + ankh("ankh-icon") + 'The House Signature</span>' +
              '<img data-src="' + esc(item.img) + '" alt="' + esc(item.name) + ' — ' + esc(item.desc.slice(0, 60)) + '" loading="lazy" decoding="async" width="1052" height="787">' +
            "</div>" +
            '<div class="hero-item__body">' +
              '<p class="hero-item__eyebrow">Our No. 1 &middot; Made to order</p>' +
              '<h3 class="hero-item__title"><span class="gold-text">' + esc(item.name) + "</span>" +
                ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(item.ar) + "</span></h3>" +
              '<p class="hero-item__desc">' + esc(item.desc) + "</p>" + containsLine(item) +
              '<ul class="hero-item__facts" aria-label="Highlights">' +
                "<li>Stretched by hand</li><li>Baked after you order</li><li>Homemade butter</li>" +
              "</ul>" +
              '<div class="hero-item__foot">' +
                '<span class="order-item__price hero-item__price">' + money(item.price) + "</span>" +
                '<div class="flex gap-2 items-center">' +
                  '<button class="fav" type="button" data-fav="' + esc(item.id) + '" data-name="' + esc(item.name) + '" aria-pressed="false">' + SVG_HEART + "</button>" +
                  '<button class="btn btn--gold hero-item__add" type="button" data-add="' + esc(item.id) + '" data-name="' + esc(item.name) + '">Add to order</button>' +
                "</div>" +
              "</div>" +
            "</div>" +
          "</article>";
      }
      return '' +
        '<article class="order-item' + (item.signature ? " order-item--sig" : "") + (item.includes ? " menu-item--combo" : "") + '" data-cat="' + esc(item.cat) + '"' + (isVegan(item) || item.veganOption ? " data-vegan" : "") + ' data-reveal>' +
          '<div class="media media--1x1"><img data-src="' + esc(item.img) + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async" width="200" height="200"></div>' +
          "<div>" +
            (item.signature ? '<span class="sig-badge">' + ankh("ankh-icon") + 'The House Signature</span>' : "") +
            "<h3>" + (item.special ? pharaoh(true) : "") + esc(item.name) + (isVegan(item) ? " " + veganBadge() : "") +
            ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(item.ar) + "</span></h3><p>" + (item.includes ? esc(item.desc) + "</p>" + comboExtras(item) : esc(item.desc.slice(0, 96)) + "…</p>") + containsLine(item) + "</div>" +
          '<div class="order-item__side">' +
            '<span class="order-item__price">' + money(item.price) + "</span>" +
            '<div class="flex gap-2 items-center">' +
              '<button class="fav" type="button" data-fav="' + esc(item.id) + '" data-name="' + esc(item.name) + '" aria-pressed="false">' + SVG_HEART + "</button>" +
              '<button class="btn btn--sm btn--gold" type="button" data-add="' + esc(item.id) + '" data-name="' + esc(item.name) + '">Add</button>' +
            "</div>" +
          "</div>" +
        "</article>";
    }).join("");

    if (filters) {
      filters.innerHTML =
        '<button class="chip" type="button" data-order-filter="all" aria-pressed="true">Everything</button>' +
        D.CATEGORIES.map(function (c) {
          return '<button class="chip' + (c.id === "combos" ? " chip--combo" : "") + '" type="button" data-order-filter="' + c.id + '" aria-pressed="false">' + esc(c.name) + "</button>";
        }).join("") +
        '<button class="chip chip--vegan" type="button" data-order-filter="vegan" aria-pressed="false">' + LEAF_SVG + "Vegan</button>";

      filters.addEventListener("click", function (e) {
        var chip = e.target.closest("[data-order-filter]");
        if (!chip) return;
        var cat = chip.getAttribute("data-order-filter");
        $$("[data-order-filter]", filters).forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        $$(".order-item", host).forEach(function (row) {
          row.hidden = cat !== "all" && (cat === "vegan" ? !row.hasAttribute("data-vegan") : row.getAttribute("data-cat") !== cat);
        });
      });
    }
  }

  /* Cottage-food label info (Texas H&S Code 437.0193): allergens on every menu row and, before paying,
     in the "Allergens & food info" block. The same map lives in the receipt email (notify.ts). */
  function containsLine(item) {
    return item.allergens && item.allergens.length
      ? '<p class="order-item__contains">Contains: ' + esc(item.allergens.join(", ")) + "</p>" : "";
  }
  function renderFoodInfo() {
    var host = $("[data-foodinfo-body]");
    if (!host) return;
    var seen = {}, tcs = false, store = [];
    Object.keys(basket).forEach(function (id) {
      var item = menuItem(keyId(id));
      if (!item || item.resale) return;
      (item.allergens || []).forEach(function (a) { seen[a] = 1; });
      if (item.tcs) tcs = true;
      if (item.storebought && store.indexOf(item.name) < 0) store.push(item.name);
    });
    var all = Object.keys(seen);
    var html = "<p><strong>Pharaoh’s Bites is a Texas Cottage Food Operation, Reg. #20668.</strong></p>" +
      "<p>THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL LICENSING OR INSPECTION.</p>" +
      "<p>Home kitchen: may contain traces of milk, eggs, wheat, soy, tree nuts, sesame.</p>";
    if (store.length) html += "<p>" + esc(store.join(", ")) + (store.length > 1 ? " are" : " is") + " store-bought, not a cottage food.</p>";
    html += Object.keys(basket).length
      ? "<p><strong>In your order, contains:</strong> " + (all.length ? esc(all.join(", ")) : "none of the major allergens") + ".</p>"
      : "<p>Add a dish to see its allergens here.</p>";
    if (tcs) html += "<p class=\"foodinfo__safe\"><strong>SAFE HANDLING INSTRUCTIONS:</strong> To prevent illness from bacteria, keep this food refrigerated or frozen until the food is prepared for consumption.</p>";
    host.innerHTML = html;
  }

  function renderBasket() {
    var list = $("[data-basket-list]");
    if (!list) return;
    renderFoodInfo();

    var ids = Object.keys(basket);
    var subtotal = 0;

    if (!ids.length) {
      list.innerHTML = '<p class="basket__empty">Your order is empty.<br>Add something warm.</p>';
    } else {
      list.innerHTML =
        '<div class="basket-head" aria-hidden="true"><span>Item</span><span>Qty</span><span>Each</span><span>Total</span></div>' +
        ids.map(function (id) {
          var item = menuItem(keyId(id));
          if (!item) return "";
          var qty = basket[id];
          var line = item.price * qty;
          subtotal += line;
          return '' +
            '<div class="basket-item">' +
              '<span class="basket-item__name">' + esc(item.name) + "</span>" +
              '<div class="qty" aria-label="Quantity">' +
                '<button type="button" data-qty="-1" data-id="' + esc(id) + '" aria-label="Reduce quantity of ' + esc(item.name) + '">&minus;</button>' +
                "<output>" + qty + "</output>" +
                '<button type="button" data-qty="1" data-id="' + esc(id) + '" aria-label="Increase quantity of ' + esc(item.name) + '">+</button>' +
              "</div>" +
              '<span class="basket-item__each">' + money(item.price) + "</span>" +
              '<span class="basket-item__price">' + money(line) + "</span>" +
              (item.slots ? '<small class="basket-item__picks">' + esc(picksText(item, keyPicks(id))) + "</small>" : "") +
              '<button type="button" class="remove" data-remove="' + esc(id) + '">Remove</button>' +
            "</div>";
        }).join("");
    }

    var set = function (sel, val) { var el = $(sel); if (el) el.textContent = money(val); };
    set("[data-subtotal]", subtotal);
    lastSubtotal = subtotal;
    renderTotals();
    if (promoCode) scheduleQuote();   /* some codes depend on what is in the basket */

    updateCheckoutState(subtotal);
    syncAddons();
  }

  /* --- Customer details ------------------------------------------------ */
  var REQUIRED_FIELDS = ["first_name", "last_name", "phone", "email", "street", "city", "state", "zip"];

  function getFulfillment() {
    if (!C.enablePickup) return "delivery";
    var r = document.querySelector('[name="fulfillment"]:checked');
    return r ? r.value : "delivery";
  }
  var ADDRESS_KEYS = { street: 1, city: 1, state: 1, zip: 1 };

  function readCustomer() {
    var form = $("[data-checkout-form]");
    if (!form) return null;
    var c = {};
    ["first_name", "last_name", "phone", "email", "street", "apt", "city", "state", "zip", "instructions", "requested_date", "requested_window", "requested_at"].forEach(function (k) {
      var el = form.elements[k];
      c[k] = el ? el.value.trim() : "";
    });
    /* Everything downstream (WhatsApp message, finance system) takes one name. */
    c.name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    c.fulfillment = getFulfillment();
    return c;
  }

  /* --- Delivery date + time window -------------------------------------
     The earliest date is tomorrow in the customer's own time zone. The same
     rule drives the calendar, the button state, the submit guard and the
     order builder, so a bad date cannot slip through any of them. */
  /* Delivery and Pickup have their own time windows. */
  /* Weekdays: 2 delivery windows + 3 pickup windows. Saturday and Sunday: delivery only, 4 windows. */
  var WINDOWS = [
    { id: "d1", mode: "delivery", days: "weekday", label: "8:00 AM–11:00 AM", sub: "Morning",   hour: 8 },
    { id: "d2", mode: "delivery", days: "weekday", label: "8:00 PM–11:00 PM", sub: "Night",     hour: 20 },
    { id: "p1", mode: "pickup",   days: "weekday", label: "2:00 PM–4:00 PM",  sub: "Afternoon", hour: 14 },
    { id: "p2", mode: "pickup",   days: "weekday", label: "4:00 PM–6:00 PM",  sub: "Late afternoon", hour: 16 },
    { id: "p3", mode: "pickup",   days: "weekday", label: "6:00 PM–8:00 PM",  sub: "Evening",   hour: 18 },
    { id: "w1", mode: "delivery", days: "weekend", label: "8:00 AM–11:00 AM", sub: "Morning",   hour: 8 },
    { id: "w2", mode: "delivery", days: "weekend", label: "11:00 AM–2:00 PM", sub: "Midday",    hour: 11 },
    { id: "w3", mode: "delivery", days: "weekend", label: "2:00 PM–5:00 PM",  sub: "Afternoon", hour: 14 },
    { id: "w4", mode: "delivery", days: "weekend", label: "5:00 PM–8:00 PM",  sub: "Evening",   hour: 17 }
  ];
  function isWeekend(ymd) { var d = parseYmd(ymd); return !!d && (d.getDay() === 0 || d.getDay() === 6); }
  /* The windows on offer for this mode on this date (none when pickup is chosen for a weekend day). */
  function windowsFor(mode, ymd) {
    var kind = isWeekend(ymd) ? "weekend" : "weekday";
    return WINDOWS.filter(function (w) { return w.mode === mode && w.days === kind; });
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function toYmd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function parseYmd(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
  }
  function earliestDate() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1); }
  /* Days the owner switched off in the dashboard (Kitchen Calendar). Filled in by initSchedule; the server checks again. */
  var closedDays = {};
  function validDeliveryDate(v) { var d = parseYmd(v); return !!d && d.getTime() >= earliestDate().getTime() && !closedDays[v] && !(getFulfillment() === "pickup" && isWeekend(v)); }
  function windowById(id) { return WINDOWS.filter(function (w) { return w.id === id; })[0] || null; }
  function formatDeliveryDate(v, long) {
    var d = parseYmd(v);
    if (!d) return v || "";
    return d.toLocaleDateString("en-US", long
      ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
      : { weekday: "short", month: "short", day: "numeric" });
  }
  function scheduleComplete(c) {
    if (!c || !validDeliveryDate(c.requested_date)) return false;
    var w = windowById(c.requested_window);
    return !!w && windowsFor(c.fulfillment === "pickup" ? "pickup" : "delivery", c.requested_date).indexOf(w) > -1;
  }

  /* One rule per field: used for the button state, the note under the button
     and the inline messages, so they can never disagree. */
  var FIELD_RULES = {
    first_name: { ok: function (v) { return v.length > 0; }, msg: "Enter your first name." },
    last_name:  { ok: function (v) { return v.length > 0; }, msg: "Enter your last name." },
    phone:      { ok: function (v) { var n = v.replace(/\D/g, "").length; return n >= 10 && n <= 15; }, msg: "Enter a phone number with area code, like (555) 123-4567." },
    email:      { ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }, msg: "Enter your email, like name@example.com. We send your receipt there." },
    street:     { ok: function (v) { return v.length > 0; }, msg: "Enter your street address." },
    city:       { ok: function (v) { return v.length > 0; }, msg: "Enter your city." },
    state:      { ok: function (v) { return /^[A-Za-z]{2}$/.test(v); }, msg: "Use the 2-letter state, like TX." },
    zip:        { ok: function (v) { return /^\d{5}(-\d{4})?$/.test(v); }, msg: "Enter a 5-digit ZIP code." }
  };
  function firstProblem(c) {
    if (!c) return null;
    var keys = Object.keys(FIELD_RULES);
    for (var i = 0; i < keys.length; i++) {
      if (c.fulfillment === "pickup" && ADDRESS_KEYS[keys[i]]) continue;
      if (!FIELD_RULES[keys[i]].ok(c[keys[i]] || "")) return { field: keys[i], msg: FIELD_RULES[keys[i]].msg };
    }
    return null;
  }
  function detailsFilled(c) { return !!c && !firstProblem(c); }

  function customerComplete(c) { return detailsFilled(c) && scheduleComplete(c); }

  /* --- Delivery / pickup choice, live delivery fee and total ---------------- */
  var lastSubtotal = 0;
  var rerenderSchedule = null;   /* set by initSchedule: swaps the time windows when Delivery/Pickup changes */
  var quote = { key: "", state: "idle", fee: 0, miles: 0, promo: null };
  /* Promo code the customer typed. The server is the judge: it checks the code and that this
     phone / email has not used it before. "promo" in a quote reply says whether it counts. */
  var promoCode = "";
  /* A "free order" promo (whole order free): no card step, total shows $0. */
  function freePromo() { return !!(promoCode && quote.state === "ok" && quote.promo && quote.promo.valid && quote.promo.free); }
  /* Percent-off code (e.g. 50% off the dishes): the amount taken off the dishes. */
  function promoDiscount() {
    if (!(promoCode && quote.state === "ok" && quote.promo && quote.promo.valid && quote.promo.percent)) return 0;
    return Math.round(lastSubtotal * quote.promo.percent) / 100;
  }
  function promoValid() { return !!(promoCode && quote.state === "ok" && quote.promo && quote.promo.valid); }
  function renderPromo(msg, bad) {
    var el = $("[data-promo-msg]");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
    el.classList.toggle("is-bad", !!bad);
  }
  var quoteTimer = null;

  function renderTotals() {
    var pickup = getFulfillment() === "pickup";
    var label = $("[data-fee-label]"), value = $("[data-fee-value]"), total = $("[data-total]");
    if (!label || !value || !total) return;
    var go = $("[data-checkout-label]");
    if (go && !submitting && C.financeCheckoutEndpoint) go.textContent = freePromo() ? "Place Order" : "Place Order & Pay";
    var prow = $("[data-promo-row]"), disc = pickup ? 0 : promoDiscount();
    if (prow) {
      prow.hidden = !disc;
      if (disc) { $("[data-promo-label]", prow).textContent = promoCode + " (" + quote.promo.percent + "% off dishes)"; $("[data-promo-value]", prow).textContent = "-" + money(disc); }
    }
    if (pickup) { label.textContent = "Pickup"; value.textContent = "Free"; total.textContent = money(lastSubtotal); return; }
    if (quote.state === "ok" && disc) {
      label.textContent = "Delivery (" + quote.miles + " mi)"; value.textContent = money(quote.fee);
      total.innerHTML = "<s>" + money(lastSubtotal + quote.fee) + "</s> " + money(lastSubtotal - disc + quote.fee);
    } else if (quote.state === "ok" && freePromo()) {
      label.textContent = "Delivery (" + quote.miles + " mi)"; value.innerHTML = '<s>' + money(quote.fee) + '</s> Free';
      total.innerHTML = "<s>" + money(lastSubtotal) + "</s> $0";
    } else if (quote.state === "ok" && promoValid()) {
      label.textContent = "Delivery (" + quote.miles + " mi)"; value.innerHTML = '<s>' + money(quote.fee) + '</s> Free';
      total.textContent = money(lastSubtotal);
    } else if (quote.state === "ok") {
      label.textContent = "Delivery (" + quote.miles + " mi)"; value.textContent = money(quote.fee);
      total.textContent = money(lastSubtotal + quote.fee);
    } else {
      label.textContent = "Delivery";
      value.textContent = quote.state === "loading" ? "calculating…" : quote.state === "err" ? "check your address" : "enter your address";
      total.textContent = lastSubtotal > 0 ? money(lastSubtotal) + " + delivery" : money(0);
    }
  }

  function refreshQuote() {
    var form = $("[data-checkout-form]");
    if (!form || getFulfillment() === "pickup" || !C.financeQuoteEndpoint) return;
    var cu = readCustomer();
    var ok = ["street", "city", "state", "zip"].every(function (k) { return FIELD_RULES[k].ok(cu[k] || ""); });
    if (!ok) { quote = { key: "", state: "idle", fee: 0, miles: 0 }; renderTotals(); return; }
    var quoteItems = Object.keys(basket).map(function (k) { return { slug: keyId(k), quantity: basket[k] }; });
    var key = [cu.street, cu.city, cu.state, cu.zip, promoCode, promoCode ? cu.phone + "|" + cu.email + "|" + cu.apt + "|" + JSON.stringify(quoteItems) : ""].join("|").toLowerCase();
    if (key === quote.key && quote.state !== "err") return;
    quote = { key: key, state: "loading", fee: 0, miles: 0, promo: null };
    renderTotals();
    fetch(C.financeQuoteEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": C.financeAnonKey || "", "Authorization": "Bearer " + (C.financeAnonKey || "") },
      body: JSON.stringify({ street: cu.street, city: cu.city, state: cu.state, zip: cu.zip, apt: cu.apt, promo: promoCode || undefined, phone: cu.phone, email: cu.email, items: promoCode ? quoteItems : undefined })
    }).then(function (r) { return r.json().catch(function () { return {}; }); }).then(function (d) {
      if (quote.key !== key) return;                      /* address changed meanwhile */
      if (d && d.ok) quote = { key: key, state: "ok", fee: d.delivery_fee, miles: d.miles, promo: d.promo || null };
      else {
        quote = { key: key, state: "err", fee: 0, miles: 0, promo: null };
        Track.problem("address", (d && d.error) || "address could not be checked", { zip: cu.zip || "" });
      }
      if (promoCode && quote.state === "ok") {
        if (quote.promo && quote.promo.valid) hidePromoBanner(false);   /* code applied: the banner has done its job */
        if (quote.promo && quote.promo.valid) renderPromo(quote.promo.message || (promoCode + " applied: free delivery 🎉"), false);
        else {
          renderPromo((quote.promo && quote.promo.message) || "that promo code is not valid", true);
          Track.problem("promo", (quote.promo && quote.promo.message) || "promo code not valid", { code: promoCode });
        }
      }
      renderTotals();
    }).catch(function () { if (quote.key === key) { quote = { key: key, state: "err", fee: 0, miles: 0 }; renderTotals(); } });
  }
  /* Apply button: needs the address, phone and email so the server can check "once per customer". */
  function applyPromo() {
    var input = $("[data-promo-input]");
    var code = input ? input.value.replace(/\s+/g, "").toUpperCase() : "";
    if (input) input.value = code;
    if (!code) { promoCode = ""; renderPromo(""); quote.key = ""; renderTotals(); refreshQuote(); return; }
    var cu = readCustomer() || {};
    if (getFulfillment() === "pickup") { renderPromo("Promo codes apply to delivery orders.", true); return; }
    if (!FIELD_RULES.phone.ok(cu.phone || "") || !FIELD_RULES.email.ok(cu.email || "")) { renderPromo("Fill in your phone and email first, then apply the code.", true); return; }
    var addrOk = ["street", "city", "state", "zip"].every(function (k) { return FIELD_RULES[k].ok(cu[k] || ""); });
    if (!addrOk) { renderPromo("Fill in your delivery address first, then apply the code.", true); return; }
    promoCode = code;
    renderPromo("Checking…", false);
    quote.key = "";
    refreshQuote();
  }
  /* --- Promo banner (every page) ----------------------------------------
     Built from C.promoBanner. Space is reserved by html.has-promo (see pages.css) so the page
     does not jump; the close button hides it for hideDays days (localStorage, never fatal). */
  var promoBar = null;
  var PROMO_KEY = "pb_promo_closed";
  function promoClosedRecently(days) {
    try { var t = Number(window.localStorage.getItem(PROMO_KEY)); return !!t && Date.now() - t < days * 864e5; } catch (e) { return false; }
  }
  function hidePromoBanner(remember) {
    if (!promoBar) return;
    promoBar.remove(); promoBar = null;
    document.documentElement.classList.remove("has-promo");
    document.documentElement.style.removeProperty("--promo-offset");
    if (remember) { try { window.localStorage.setItem(PROMO_KEY, String(Date.now())); } catch (e) { /* hidden for this page view only */ } }
  }
  function copyText(text, done) {
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand("copy");
        ta.remove();
        if (ok) done();
      } catch (e) { /* clipboard blocked: nothing to do */ }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function initPromoBanner() {
    var cfg = C.promoBanner;
    var header = $(".site-header");
    if (!cfg || !cfg.enabled || !cfg.code || !header || promoClosedRecently(cfg.hideDays || 7)) return;
    var root = document.documentElement, code = String(cfg.code);
    var status = document.createElement("span");
    status.className = "promo-bar__sr"; status.setAttribute("aria-live", "polite");
    function line(cls, text) {
      var span = document.createElement("span");
      span.className = cls;
      String(text || "").split("{code}").forEach(function (part, i) {
        if (i > 0) {
          var pill = document.createElement("button");
          pill.type = "button"; pill.className = "promo-bar__pill"; pill.textContent = code;
          pill.setAttribute("aria-label", "Copy code " + code);
          pill.addEventListener("click", function () {
            copyText(code, function () {
              pill.textContent = "Copied ✓";
              status.textContent = "Code " + code + " copied";
              setTimeout(function () { pill.textContent = code; status.textContent = ""; }, 1500);
            });
          });
          span.appendChild(pill);
        }
        span.appendChild(document.createTextNode(part));
      });
      return span;
    }
    var bar = document.createElement("div");
    bar.className = "promo-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Promotion");
    var p = document.createElement("p");
    p.className = "promo-bar__text";
    p.appendChild(line("promo-bar__long", cfg.text));
    p.appendChild(line("promo-bar__short", cfg.shortText || cfg.text));
    var cta = document.createElement("a");
    cta.className = "promo-bar__cta"; cta.href = cfg.link || "order.html";
    var ctaLong = document.createElement("span"), ctaShort = document.createElement("span");
    ctaLong.className = "promo-bar__long"; ctaLong.textContent = cfg.linkLabel || "Order now";
    ctaShort.className = "promo-bar__short"; ctaShort.textContent = cfg.shortLinkLabel || cfg.linkLabel || "Order";
    cta.appendChild(ctaLong); cta.appendChild(ctaShort);
    var close = document.createElement("button");
    close.type = "button"; close.className = "promo-bar__close"; close.setAttribute("aria-label", "Close promo"); close.innerHTML = "&times;";
    close.addEventListener("click", function () { hidePromoBanner(true); });
    bar.appendChild(p); bar.appendChild(cta); bar.appendChild(close); bar.appendChild(status);
    header.parentNode.insertBefore(bar, header);
    promoBar = bar;
    root.classList.add("has-promo");

    /* The bar scrolls away with the page; the fixed header follows it up to the top. */
    var ticking = false;
    function place() {
      ticking = false;
      if (!promoBar) return;
      root.style.setProperty("--promo-offset", Math.max(0, promoBar.offsetHeight - (window.pageYOffset || 0)) + "px");
    }
    function queue() { if (!ticking) { ticking = true; requestAnimationFrame(place); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    place();
  }

  function initPromo() {
    var btn = $("[data-promo-apply]"), input = $("[data-promo-input]");
    if (!btn || !input) return;
    /* Arriving from the banner (order.html?promo=FIRSTBITE): fill the box, the customer presses Apply
       once the address is in. The server is still the only judge of the code. */
    try {
      var fromLink = (new URLSearchParams(window.location.search).get("promo") || "").replace(/\s+/g, "").toUpperCase().slice(0, 30);
      if (/^[A-Z0-9_-]{3,30}$/.test(fromLink)) {
        input.value = fromLink;
        renderPromo("Code " + fromLink + " is in the box. Fill in your details, then press Apply.", false);
      }
    } catch (e) { /* no query support: leave the box empty */ }
    btn.addEventListener("click", applyPromo);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } });
  }
  function scheduleQuote() { clearTimeout(quoteTimer); quoteTimer = setTimeout(refreshQuote, 500); }

  function applyFulfillment() {
    var fu = $("[data-fulfil]");
    if (fu) fu.hidden = !C.enablePickup;
    if (!C.enablePickup) { var dl = document.querySelector('[name="fulfillment"][value="delivery"]'); if (dl) dl.checked = true; }
    var pickup = getFulfillment() === "pickup";
    var addr = $("[data-address-fields]");
    if (addr) addr.hidden = pickup;
    document.querySelectorAll("[data-sched-word]").forEach(function (e) { e.textContent = pickup ? "Pickup" : "Delivery"; });
    document.querySelectorAll("[data-sched-word-lc]").forEach(function (e) { e.textContent = pickup ? "pickup" : "delivery"; });
    var pa = $("[data-pickup-addr]");
    if (pa) { pa.hidden = !pickup || !C.pickupAddress; pa.innerHTML = '<b>Pickup address</b>' + esc(C.pickupAddress || ""); }
    var il = $("[data-instr-label]"); if (il) il.textContent = pickup ? "Notes" : "Delivery instructions";
    var bn = $("[data-basket-notice]");
    if (bn) bn.textContent = pickup ? "Pickup is free. Pick up at the address shown above. It is also in your receipt email." : "Delivery is $5 + $1.75 per mile from our kitchen. Enter your address to see your exact delivery fee before you pay.";
    renderTotals();
    if (rerenderSchedule) rerenderSchedule();
    if (!pickup) refreshQuote();
    updateCheckoutState();
  }

  function updateCheckoutState(subtotal) {
    var checkout = $("[data-checkout]");
    if (!checkout) return;
    if (subtotal == null) {
      subtotal = Object.keys(basket).reduce(function (sum, id) {
        var item = menuItem(keyId(id));
        return sum + (item ? item.price * basket[id] : 0);
      }, 0);
    }
    var customer = readCustomer();
    var hasItems = subtotal > 0;
    var detailsOk = customerComplete(customer);
    var scheduleOk = scheduleComplete(customer);
    var number = C.orderWhatsappNumber || C.whatsappNumber;

    var ready = !!(hasItems && detailsOk && number);
    checkout.classList.toggle("is-disabled", !ready);
    checkout.setAttribute("aria-disabled", ready ? "false" : "true");
    if (ready && missingShown) { missingShown = false; showCheckoutError(""); }

    var note = $("[data-basket-note]");
    if (note) {
      var min = C.minimumOrder || 0;
      if (!hasItems) note.textContent = "Add a dish and fill in your details to continue.";
      else if (!detailsFilled(customer)) note.textContent = "Almost there. " + firstProblem(customer).msg;
      else if (!scheduleOk) note.textContent = "Pick a delivery date (from tomorrow) and one time window to continue.";
      else if (min > 0 && subtotal < min) note.textContent = "Heads up: our usual minimum is " + money(min) + ". Send it anyway and we will confirm.";
      else note.textContent = C.financeCheckoutEndpoint ? "Next you pay securely by card. Your receipt is emailed after payment. The delivery fee ($5 + $1.75 per mile) is added to your total." : "We save your order right away and email your receipt. The delivery fee ($5 + $1.75 per mile) is added to your total.";
    }
  }



  /* Inline messages: shown when a field loses focus with a problem, cleared as soon as it is fixed */
  function initFieldValidation(form) {
    function show(name) {
      var input = form.elements[name], rule = FIELD_RULES[name];
      if (!input || !rule) return;
      var bad = !rule.ok(input.value.trim());
      var box = input.closest(".field");
      var msg = box && box.querySelector(".field__error");
      input.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad && !msg && box) {
        msg = document.createElement("small");
        msg.className = "field__error";
        msg.id = "err-" + name;
        msg.setAttribute("role", "alert");
        box.appendChild(msg);
        input.setAttribute("aria-describedby", msg.id);
      }
      if (msg) { msg.textContent = bad ? rule.msg : ""; msg.hidden = !bad; }
    }
    form.addEventListener("focusout", function (e) { if (e.target && FIELD_RULES[e.target.name]) show(e.target.name); });
    form.addEventListener("input", function (e) {
      var n = e.target && e.target.name;
      if (n && FIELD_RULES[n] && e.target.getAttribute("aria-invalid") === "true") show(n);
    });
  }

  /* --- Calendar + window picker UI ------------------------------------- */
  function initSchedule(form) {
    var root = $("[data-schedule]");
    if (!root) return;
    var fDate = form.elements.requested_date, fAt = form.elements.requested_at;
    var trigger = $("[data-date-trigger]", root), label = $("[data-date-label]", root);
    var cal = $("[data-calendar]", root), title = $("[data-cal-title]", root), grid = $("[data-cal-grid]", root);
    var prev = $("[data-cal-prev]", root), next = $("[data-cal-next]", root), note = $("[data-cal-note]", root);
    var winBox = $("[data-windows]", root), winList = $("[data-windows-list]", root), hint = $("[data-schedule-hint]", root);
    var summary = $("[data-delivery-summary]"), summaryText = $("[data-delivery-text]");
    var view = null;

    var savedCust = Store.read("customer", null);
    var savedWinId = (savedCust && savedCust.requested_window) || "";
    var radios = [];
    function chosenWindow() { var r = radios.filter(function (x) { return x.checked; })[0]; return r ? windowById(r.value) : null; }
    function renderWindows() {
      var mode = getFulfillment();
      var keep = chosenWindow() ? chosenWindow().id : savedWinId;
      winList.innerHTML = windowsFor(mode, fDate.value).map(function (w) {
        return '<label class="win"><input type="radio" name="requested_window" value="' + w.id + '"' + (w.id === keep ? " checked" : "") + '>' +
          '<span class="win__card"><b>' + w.label + '</b><small>' + w.sub + '</small></span></label>';
      }).join("");
      radios = $$("input[name=requested_window]", winList);
      savedWinId = "";
      var wt = $("[data-windows-title]", root); if (wt) wt.textContent = "Choose one " + (mode === "pickup" ? "pickup" : "delivery") + " window" + (isWeekend(fDate.value) ? " (weekend delivery times)" : "");
    }
    renderWindows();
    rerenderSchedule = function () { renderWindows(); changed(); };
    function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

    function renderCalendar() {
      var min = earliestDate(), first = view, y = first.getFullYear(), m = first.getMonth();
      title.textContent = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      var offset = first.getDay(), days = new Date(y, m + 1, 0).getDate(), html = "", todayKey = toYmd(new Date());
      var today0 = new Date(min.getFullYear(), min.getMonth(), min.getDate() - 1);   /* today shows red "Fully booked": the earliest booking is tomorrow */
      for (var i = 0; i < offset; i++) html += '<span class="cal-blank"></span>';
      for (var day = 1; day <= days; day++) {
        var d = new Date(y, m, day), key = toYmd(d), off = d.getTime() < today0.getTime(), shut = !off && (key === todayKey || !!closedDays[key]), sel = key === fDate.value;
        if (!off && !shut && getFulfillment() === "pickup" && isWeekend(key)) { off = true; }
        html += '<button type="button" class="cal-day' + (off ? " is-off" : "") + (shut ? " is-closed" : "") + (sel ? " is-selected" : "") + (key === todayKey ? " is-today" : "") +
          '" data-date="' + key + '"' + (off ? " disabled" : "") + (shut ? ' aria-disabled="true" data-tip="Fully booked" title="Fully booked"' : "") + ' aria-label="' + formatDeliveryDate(key, true) + (off ? " (unavailable)" : shut ? " (fully booked)" : "") +
          '" aria-pressed="' + sel + '" tabindex="-1">' + day + "</button>";
      }
      grid.innerHTML = html;
      var minMonth = monthStart(min);
      prev.disabled = first.getTime() <= minMonth.getTime();
      next.disabled = first.getTime() >= new Date(minMonth.getFullYear(), minMonth.getMonth() + 12, 1).getTime();
      var tab = $(".cal-day.is-selected", grid) || $(".cal-day:not(.is-off):not(.is-closed)", grid);
      if (tab) tab.tabIndex = 0;
    }

    function openCal() {
      view = monthStart(validDeliveryDate(fDate.value) ? parseYmd(fDate.value) : earliestDate());
      renderCalendar();
      cal.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      var f = $(".cal-day[tabindex='0']", grid);
      if (f) f.focus({ preventScroll: true });
      cal.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function closeCal(refocus) {
      cal.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (refocus) trigger.focus({ preventScroll: true });
    }

    function refresh() {
      var okDate = validDeliveryDate(fDate.value);
      if (!okDate) fDate.value = "";
      var win = chosenWindow();
      fAt.value = okDate && win ? fDate.value + "T" + pad2(win.hour) + ":00" : "";
      label.textContent = okDate ? formatDeliveryDate(fDate.value, true) : "Select a date";
      trigger.classList.toggle("is-set", okDate);
      winBox.hidden = !okDate;
      var wkndNote = getFulfillment() === "pickup" ? " Pickup is available Monday to Friday; on Saturday and Sunday we deliver only." : " On Saturday and Sunday we deliver in four windows, from 8 AM to 8 PM.";
      note.textContent = "Earliest " + (getFulfillment() === "pickup" ? "pickup" : "delivery") + ": " + formatDeliveryDate(toYmd(earliestDate()), true) + ". Today and past dates are unavailable." + wkndNote;
      if (!okDate) hint.textContent = "Pick a " + (getFulfillment() === "pickup" ? "pickup" : "delivery") + " date, from tomorrow onward.";
      else if (!win) hint.textContent = "Now choose one " + (getFulfillment() === "pickup" ? "pickup" : "delivery") + " window.";
      else hint.textContent = "";
      if (summary) {
        summary.classList.toggle("is-set", !!(okDate && win));
        summaryText.textContent = okDate && win ? formatDeliveryDate(fDate.value) + " · " + win.label
          : okDate ? formatDeliveryDate(fDate.value) + " · choose a window" : "Choose a date & time window";
      }
    }
    function changed() { refresh(); form.dispatchEvent(new Event("input", { bubbles: true })); }

    /* Drop anything restored from an earlier visit that is no longer valid */
    if (!validDeliveryDate(fDate.value)) { fDate.value = ""; radios.forEach(function (x) { x.checked = false; }); }
    refresh();

    /* Fetch the closed days; if the request fails the calendar simply stays fully open (the server still refuses closed days). */
    if (C.financeClosedDaysEndpoint && window.fetch) {
      fetch(C.financeClosedDaysEndpoint + "&day=gte." + toYmd(new Date()), { headers: { "apikey": C.financeAnonKey || "", "Authorization": "Bearer " + (C.financeAnonKey || "") } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (rows) {
          closedDays = {};
          (rows || []).forEach(function (r) { if (r && r.day) closedDays[r.day] = true; });
          if (!cal.hidden) renderCalendar();
          changed();
        }).catch(function () {});
    }

    trigger.addEventListener("click", function () { if (cal.hidden) openCal(); else closeCal(false); });
    prev.addEventListener("click", function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCalendar(); });
    next.addEventListener("click", function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCalendar(); });

    grid.addEventListener("click", function (e) {
      var b = e.target.closest(".cal-day");
      if (!b || b.disabled) return;
      if (b.classList.contains("is-closed")) { note.textContent = formatDeliveryDate(b.getAttribute("data-date"), true) + " is fully booked. Please pick another day."; return; }
      fDate.value = b.getAttribute("data-date");
      renderWindows();
      var needWindow = !chosenWindow();
      closeCal(true);
      changed();
      if (needWindow) winBox.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    /* keyboard: arrows move by day / week, Esc closes */
    cal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeCal(true); return; }
      var b = e.target.closest(".cal-day");
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!b || !step) return;
      e.preventDefault();
      var d = parseYmd(b.getAttribute("data-date"));
      var t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + step);
      if (t.getTime() < earliestDate().getTime()) return;
      if (t.getMonth() !== view.getMonth() || t.getFullYear() !== view.getFullYear()) { view = monthStart(t); renderCalendar(); }
      var target = $('.cal-day[data-date="' + toYmd(t) + '"]', grid);
      if (target) { $$(".cal-day", grid).forEach(function (x) { x.tabIndex = -1; }); target.tabIndex = 0; target.focus(); }
    });

    winList.addEventListener("change", changed);

    /* tap outside closes the calendar; re-check if the page stayed open past midnight */
    document.addEventListener("click", function (e) { if (!cal.hidden && !root.contains(e.target)) closeCal(false); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) changed(); });
  }

  function initCheckoutForm() {
    var form = $("[data-checkout-form]");
    if (!form) return;
    var saved = Store.read("customer", null);
    if (saved) {
      Object.keys(saved).forEach(function (k) { if (form.elements[k]) form.elements[k].value = saved[k]; });
    }
    form.addEventListener("input", function () {
      if (form.elements.state) form.elements.state.value = form.elements.state.value.toUpperCase();
      Store.write("customer", readCustomer());
      updateCheckoutState();
    });
    form.addEventListener("change", function (e) { if (e.target && e.target.name === "fulfillment") applyFulfillment(); });
    form.addEventListener("input", function (e) { if (e.target && (ADDRESS_KEYS[e.target.name] || (promoCode && (e.target.name === "phone" || e.target.name === "email" || e.target.name === "apt")))) scheduleQuote(); });
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    initSchedule(form);
    initFieldValidation(form);
    initPromo();
    applyFulfillment();
  }

  function initOrderInteractions() {
    document.addEventListener("click", function (e) {
      var add = e.target.closest("[data-add]");
      if (add) {
        /* Off the order page (e.g. the home page) an Order button saves the dish
           to the basket, then sends the customer straight to the Menu / order page. */
        if (!$("[data-order-list]")) {
          var dish = add.getAttribute("data-add");
          var dishItem = menuItem(dish);
          if (!(dishItem && dishItem.slots)) {   /* choice combos are picked on the order page */
            basket[dish] = (basket[dish] || 0) + 1;
            Store.write("basket", basket);
          }
          window.location.href = "order.html";
          return;
        }
        addToBasket(add.getAttribute("data-add"), add.getAttribute("data-name"));
        return;
      }

      var fav = e.target.closest("[data-fav]");
      if (fav) { toggleFav(fav.getAttribute("data-fav"), fav.getAttribute("data-name")); return; }

      var qty = e.target.closest("[data-qty]");
      if (qty) {
        var id = qty.getAttribute("data-id");
        setQty(id, (basket[id] || 0) + parseInt(qty.getAttribute("data-qty"), 10));
        return;
      }

      var rm = e.target.closest("[data-remove]");
      if (rm) { setQty(rm.getAttribute("data-remove"), 0); toast("Item removed"); return; }

      var checkout = e.target.closest("[data-checkout]");
      if (checkout) { submitOrder(checkout); return; }

      var retry = e.target.closest("[data-checkout-retry]");
      if (retry) { var b = $("[data-checkout]"); if (b) submitOrder(b, true); }
    });
  }

  /* --- Submitting an order ---------------------------------------------
     Posts the order to CONFIG.orderEndpoint. Until that endpoint exists the
     order is handed to WhatsApp instead, so the button always does something
     real rather than showing a fake confirmation.
  ------------------------------------------------------------------------ */
  function buildOrder() {
    var lines = Object.keys(basket).map(function (id) {
      var item = menuItem(keyId(id));
      if (!item) return null;
      var picks = item.slots ? keyPicks(id) : null;
      return { id: item.id, name: item.name, ar: item.ar || "", qty: basket[id], options: picks ? picksText(item, picks) : "", choices: picks, unitPrice: item.price, lineTotal: item.price * basket[id] };
    }).filter(Boolean);

    var subtotal = lines.reduce(function (sum, l) { return sum + l.lineTotal; }, 0);

    return {
      placedAt: new Date().toISOString(),
      currency: C.currency || "USD",
      customer: readCustomer(),
      items: lines,
      subtotal: subtotal
    };
  }

  /* The WhatsApp message. Delivery is confirmed by the kitchen from the
     address, so only the subtotal is quoted here.

     WhatsApp has no colours, so coloured circle emoji do that job; *text*
     is bold and _text_ is italic once it lands in the chat. Every item is
     listed in English and Arabic. */
  var WA_RULE  = "━━━━━━━━━━━━━━━━━━━━";
  var WA_THIN  = "┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈";
  var WA_DOTS  = ["🟢", "🟡", "🔵", "🟣", "🟠", "🔴", "🟤", "⚪"];
  function waSection(icon, title) {
    return [WA_RULE, icon + " *" + title + "* " + icon, WA_RULE].join("\n");
  }

  function orderAsText(order) {
    var nl = "\n";
    var c = order.customer || {};
    var address = c.fulfillment === "pickup" ? "PICKUP (no delivery)" : [c.street, c.apt, c.city + ", " + c.state + " " + c.zip].filter(Boolean).join(", ");
    var count = order.items.reduce(function (n, l) { return n + l.qty; }, 0);

    var head = ["🔔👑✨ *NEW PHARAOH’S BITES ORDER* ✨👑🔔"];
    if (order.orderNumber) head.push("", "🔖 Order No: *" + order.orderNumber + "* 🆕");
    head.push("🕒 Placed: " + formatRequested(order.placedAt) + " ⏰");

    var cust = [waSection("👤", "CUSTOMER DETAILS  |  بيانات العميل"), "", "1️⃣ 🙋 *Name:* " + c.name];
    if (c.phone) cust.push("2️⃣ 📱 *Phone:* " + c.phone);
    cust.push("3️⃣ 🏠 *Address:* " + address);
    if (c.instructions) cust.push("4️⃣ 📝 *Instructions:* _" + c.instructions + "_");
    var win = windowById(c.requested_window);
    if (validDeliveryDate(c.requested_date) && win) {
      cust.push("5️⃣ 🗓️ *Delivery Date:* " + formatDeliveryDate(c.requested_date, true));
      cust.push("6️⃣ ⏰ *Delivery Window:* " + win.label);
    }

    var items = order.items.map(function (l, i) {
      var dot = WA_DOTS[i % WA_DOTS.length];
      var rows = [
        dot + " 🍽️ *" + (i + 1) + ". " + l.name + "*",
        "‎     🇪🇬 " + l.ar,                       /* LRM keeps the Arabic line indented on the left */
        "     🔢 Qty: *× " + l.qty + "*"
      ];
      if (l.options) rows.push("     ⚙️ Options: _" + l.options + "_");
      rows.push(
        "     💵 Unit: " + money(l.unitPrice),
        "     🧾 Line Total: *" + money(l.lineTotal) + "* 💲"
      );
      return rows.join(nl);
    });

    var totals = [
      waSection("💰", "ORDER SUMMARY  |  ملخص الطلب"), "",
      "🧺 Dishes: *" + order.items.length + "*   🔢 Total Qty: *" + count + "*",
      "🧮 Subtotal: *" + money(order.subtotal) + "* 💵",
      order.discount ? "🏷️ Promo: *-" + money(order.discount) + "* 💚" : null,
      "🗓️ Delivery: *" + formatDeliveryDate(c.requested_date) + " · " + (win ? win.label : "") + "*",
      (order.customer && order.customer.fulfillment === "pickup") ? "🛍️ Pickup: *free*" : (order.deliveryFee != null ? "🚗 Delivery Fee: *" + money(order.deliveryFee) + "* 💵" : "🚗 Delivery Fee: _To be determined_ ⏳"),
      "🏛️ Tax: _To be confirmed_ ⏳",
      order.deliveryFee != null ? "✅ *TOTAL (dishes + delivery):* *" + money(order.subtotal - (order.discount || 0) + order.deliveryFee) + "* 💰" : "✅ *FINAL TOTAL:* _To be confirmed_ 🔜"
    ].filter(function (x) { return x !== null; });

    return [
      head.join(nl), "",
      cust.join(nl), "",
      waSection("🛒", "ORDER ITEMS  |  الأصناف"), "",
      items.join(nl + WA_THIN + nl), "",
      totals.join(nl), "",
      WA_RULE
    ].join(nl);
  }

  /* Plain, short version used only when the full message would make an
     extremely long link (huge orders). No emoji or Arabic, so it stays small.
     The complete order is already saved in the finance system under the order number. */
  function orderAsCompactText(order) {
    var c = order.customer || {};
    var win = windowById(c.requested_window);
    var address = c.fulfillment === "pickup" ? "PICKUP (no delivery)" : [c.street, c.apt, c.city + ", " + c.state + " " + c.zip].filter(Boolean).join(", ");
    var out = ["*NEW PHARAOH'S BITES ORDER*"];
    if (order.orderNumber) out.push("Order No: *" + order.orderNumber + "*");
    out.push("", "*Name:* " + c.name, "*Phone:* " + c.phone, "*Address:* " + address);
    if (c.instructions) out.push("*Instructions:* " + c.instructions.slice(0, 200));
    if (validDeliveryDate(c.requested_date) && win) out.push("*Delivery:* " + formatDeliveryDate(c.requested_date, true) + ", " + win.label);
    out.push("", "*Items*");
    order.items.forEach(function (l) { out.push(l.qty + " x " + l.name + " - " + money(l.lineTotal)); });
    out.push("", "*Subtotal:* " + money(order.subtotal), "Delivery fee, tax and final total: to be confirmed");
    return out.join("\n");
  }

  function formatRequested(v) {
    var d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  /* --- Checkout token: one per basket + customer snapshot ---------------
     The token is the idempotency key sent to the finance system. It only
     changes when the basket or the customer details change, so a double
     click or a refresh re-sends the same token and gets the same order
     number back instead of creating a duplicate. */
  function checkoutToken(order) {
    var sig = JSON.stringify([order.items.map(function (l) { return [l.id, l.qty, l.options || ""]; }), order.customer]);
    var saved = Store.read("checkout", null);
    if (saved && saved.sig === sig && saved.token) return saved;
    var token = "pb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    saved = { sig: sig, token: token, orderNumber: null };
    Store.write("checkout", saved);
    return saved;
  }

  /* Record the order in the finance system. Resolves with the order number
     or rejects with a readable error. Never trusts client totals: only
     product ids, quantities and customer details are sent. */
  /* The finance system stores one requested time, so the chosen window is
     also written into the delivery instructions where the kitchen will see it. */
  function deliveryInstructions(c) {
    var win = windowById(c.requested_window);
    var tag = win ? "Delivery window: " + win.label + " on " + formatDeliveryDate(c.requested_date) : "";
    return [tag, c.instructions].filter(Boolean).join(" | ").slice(0, 500);
  }

  var lastDeliveryFee = null;
  function recordOrder(order, token) {
    var payload = {
      checkout_token: token,
      visitor_id: Track.id(),
      pay_online: !!C.financeCheckoutEndpoint && !freePromo(),
      fulfillment: order.customer.fulfillment === "pickup" ? "pickup" : "delivery",
      customer: {
        name: order.customer.name, phone: order.customer.phone, email: order.customer.email || "", street: order.customer.street, apt: order.customer.apt,
        city: order.customer.city, state: order.customer.state, zip: order.customer.zip,
        instructions: deliveryInstructions(order.customer),
        requested_at: order.customer.requested_at ? new Date(order.customer.requested_at).toISOString() : ""
      },
      promo: promoCode && promoValid() ? promoCode : undefined,
      items: order.items.map(function (l) { return { slug: l.id, quantity: l.qty, options: l.options || "", choices: l.choices || undefined }; })
    };
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    return fetch(C.financeOrderEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": C.financeAnonKey || "", "Authorization": "Bearer " + (C.financeAnonKey || "") },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || !data.ok) throw new Error(data.error || ("Server error " + res.status));
        lastDeliveryFee = typeof data.delivery_fee === "number" ? data.delivery_fee : null;
        return data.order_number;
      });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw new Error(err && err.name === "AbortError" ? "The request timed out." : "Network error — check your connection.");
    });
  }

  function clearBasket() {
    basket = {};
    Store.write("basket", basket);
    renderBasket();
    syncBasketBadge();
  }

  var submitting = false;

  /* Phones go through wa.me, which opens the WhatsApp app. Desktop browsers
     go straight to WhatsApp Web: wa.me would hand the text to the Windows
     desktop app, which corrupts every emoji into "�" before sending. */
  function whatsappUrl(number, text) {
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    var encoded = encodeURIComponent(text);
    return mobile
      ? "https://wa.me/" + number + "?text=" + encoded
      : "https://web.whatsapp.com/send?phone=" + number + "&text=" + encoded;
  }

  function openWhatsApp(order, number) {
    var url = whatsappUrl(number, orderAsText(order));
    /* Links this long are unproven on some phones; fall back to the compact text. */
    if (url.length > 12000) url = whatsappUrl(number, orderAsCompactText(order));
    var win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;   /* popup blocked: same tab */
    toast("Order placed ✓");
  }

  /* Shown after the order is saved (WhatsApp-only mode). Customers without
     WhatsApp still know their order reached us, and can resend by message. */
  function showOrderReceived(orderNumber, order) {
    var box = document.createElement("div");
    box.className = "pay-return";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<div class="pay-return__card"><h2>Order received ✅</h2><p>Your order <b>' + esc(orderNumber) + '</b> is confirmed. Your receipt is on its way to <b>' + esc((order.customer && order.customer.email) || "your email") + '</b>. If WhatsApp did not open, that is fine — you do not need to do anything else.</p><button class="btn btn--block" type="button" data-rc-close>Close</button></div>';
    document.body.appendChild(box);
    $("[data-rc-close]", box).addEventListener("click", function () { box.remove(); });
  }

  /* Tapping the button while something is missing: say exactly what, and jump to it. */
  var missingShown = false;
  var FIELD_LABELS = { first_name: "first name", last_name: "last name", phone: "phone number", email: "email", street: "street address", city: "city", state: "state", zip: "ZIP code" };
  function reportMissing() {
    var form = $("[data-checkout-form]");
    var cust = readCustomer() || {};
    var missing = [], first = null;
    Object.keys(FIELD_RULES).forEach(function (k) {
      if (cust.fulfillment === "pickup" && ADDRESS_KEYS[k]) return;
      if (!FIELD_RULES[k].ok(cust[k] || "")) {
        missing.push(FIELD_LABELS[k] || k);
        var el = form && form.elements[k];
        if (el) { if (!first) first = el; el.dispatchEvent(new Event("focusout", { bubbles: true })); }
      }
    });
    if (!validDeliveryDate(cust.requested_date)) {
      missing.push((cust.fulfillment === "pickup" ? "pickup" : "delivery") + " date");
      if (!first) first = $("[data-date-trigger]");
    } else if (!windowById(cust.requested_window)) {
      missing.push((cust.fulfillment === "pickup" ? "pickup" : "delivery") + " time window");
      if (!first) first = $("[data-schedule]");
    }
    var msg = "Please complete: " + missing.join(", ") + ".";
    var box = $("[data-checkout-error]"), text = $("[data-checkout-error-text]"), retry = $("[data-checkout-retry]");
    if (text) text.textContent = msg;
    if (retry) retry.hidden = true;
    if (box) box.hidden = false;
    missingShown = true;
    toast(msg);
    if (first) {
      try { first.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
      setTimeout(function () { try { if (first.focus) first.focus({ preventScroll: true }); } catch (e) {} }, 350);
    }
  }

  function setCheckoutBusy(btn, busy, label) {
    btn.disabled = busy;
    btn.classList.toggle("is-busy", busy);
    var span = $("[data-checkout-label]", btn);
    if (span) span.textContent = label || (C.financeCheckoutEndpoint && !freePromo() ? "Place Order & Pay" : "Place Order");
  }

  function showCheckoutError(msg) {
    var box = $("[data-checkout-error]");
    var text = $("[data-checkout-error-text]");
    if (text) text.textContent = msg;
    if (box) box.hidden = !msg;
    if (msg) {
      var cu = readCustomer(), digits = String(cu.phone || "").replace(/\D/g, "");
      Track.problem("order", msg.slice(0, 280), { name: String(cu.name || "").split(" ")[0], phone4: digits.slice(-4), zip: cu.zip || "" });
    }
    var rt = $("[data-checkout-retry]");
    if (rt) rt.hidden = false;
  }

  function submitOrder(btn, skipNudges) {
    if (submitting) return;                    /* double-click guard */
    if (!Object.keys(basket).length) { toast("Add a dish to your order first."); return; }
    if (!customerComplete(readCustomer())) { reportMissing(); updateCheckoutState(); return; }
    var number = C.orderWhatsappNumber || C.whatsappNumber;
    if (!number) { toast("Ordering is not connected yet — please call us."); return; }
    showCheckoutError("");

    /* Last chance to add sides / desserts. The basket is rebuilt afterwards
       so anything added in the dialog is part of the order. */
    if (!skipNudges) { runCheckoutNudges(function () { submitOrder(btn, true); }); return; }
    var order = buildOrder();
    order.discount = promoValid() ? promoDiscount() : 0;

    /* No finance endpoint configured: WhatsApp only (previous behaviour). */
    if (!C.financeOrderEndpoint) { openWhatsApp(order, number); return; }

    var state = checkoutToken(order);
    var payFirst = !!C.financeCheckoutEndpoint && !freePromo();
    /* Already recorded (e.g. page refreshed after success): reuse the number. */
    if (state.orderNumber) {
      order.orderNumber = state.orderNumber;
      order.deliveryFee = typeof state.deliveryFee === "number" ? state.deliveryFee : null;
      if (payFirst) { startPayment(btn, order, state); return; }
      openWhatsApp(order, number);
      return;
    }

    Track.checkout();
    submitting = true;
    setCheckoutBusy(btn, true, "Saving your order…");
    recordOrder(order, state.token).then(function (orderNumber) {
      state.orderNumber = orderNumber;
      Store.write("checkout", state);
      order.orderNumber = orderNumber;
      order.deliveryFee = lastDeliveryFee;
      state.deliveryFee = lastDeliveryFee;
      Store.write("checkout", state);
      submitting = false;
      setCheckoutBusy(btn, false);
      if (payFirst) { startPayment(btn, order, state); return; }
      toast("Order " + orderNumber + " saved");
      openWhatsApp(order, number);
      showOrderReceived(orderNumber, order);
    }).catch(function (err) {
      submitting = false;
      setCheckoutBusy(btn, false);
      showCheckoutError("We could not save your order (" + err.message + "). Nothing was lost — your basket and details are still here. Please try again, or message us on WhatsApp directly.");
    });
  }

  /* --- Online payment (Stripe Checkout) ---------------------------------
     The order is saved first, then the customer pays on Stripe's secure
     page. WhatsApp only opens AFTER the payment is confirmed (see
     initPaidReturn). The amount is always read from the database. */
  function callCheckout(action, orderNumber, token) {
    return fetch(C.financeCheckoutEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": C.financeAnonKey || "", "Authorization": "Bearer " + (C.financeAnonKey || "") },
      body: JSON.stringify({ action: action, order_number: orderNumber, checkout_token: token })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok || !data.ok) throw new Error(data.error || ("Server error " + res.status));
        return data;
      });
    }, function () { throw new Error("Network error — check your connection."); });
  }

  var PAID_TAG = "\n\n✅ *PAID ONLINE by card*";

  function startPayment(btn, order, state) {
    if (submitting) return;
    submitting = true;
    setCheckoutBusy(btn, true, "Opening secure payment…");
    /* Keep the finished WhatsApp link so it can be sent after the payment page. */
    var number = C.orderWhatsappNumber || C.whatsappNumber;
    var url = whatsappUrl(number, orderAsText(order) + PAID_TAG);
    if (url.length > 12000) url = whatsappUrl(number, orderAsCompactText(order) + PAID_TAG);
    Store.write("pendingPay", { orderNumber: order.orderNumber, token: state.token, waUrl: url });
    callCheckout("create", order.orderNumber, state.token).then(function (data) {
      if (data.paid) { window.location.href = "order.html?paid=1&order=" + encodeURIComponent(order.orderNumber); return; }
      window.location.href = data.url;
    }).catch(function (err) {
      submitting = false;
      setCheckoutBusy(btn, false);
      showCheckoutError("We could not open the payment page (" + err.message + "). Your order is saved as " + order.orderNumber + " — nothing was charged. Please try again, or message us on WhatsApp.");
    });
  }

  function initPaidReturn() {
    var q = new URLSearchParams(window.location.search);
    var orderNo = q.get("order");
    if (!orderNo || (!q.get("paid") && !q.get("cancelled"))) return;
    var pending = Store.read("pendingPay", null);
    if (window.history && history.replaceState) history.replaceState(null, "", "order.html");
    if (q.get("cancelled")) { showCheckoutError("Payment was cancelled. Your order " + orderNo + " is saved and nothing was charged — press the button to pay when you are ready."); return; }
    if (!pending || pending.orderNumber !== orderNo) { toast("Payment received. Thank you — we will confirm your order shortly."); return; }

    var box = document.createElement("div");
    box.className = "pay-return";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<div class="pay-return__card"><h2 data-pr-title>Confirming your payment…</h2><p data-pr-text>Please wait a moment.</p><button class="btn btn--place btn--block" type="button" data-pr-done hidden>Done</button><button class="btn btn--whatsapp btn--block mt-2" type="button" data-pr-send hidden>Send my order to WhatsApp</button></div>';
    document.body.appendChild(box);
    var title = $("[data-pr-title]", box), text = $("[data-pr-text]", box), send = $("[data-pr-send]", box), doneBtn = $("[data-pr-done]", box);
    var tries = 0;
    function finish() {
      Store.write("pendingPay", null); Store.write("checkout", null);
      clearBasket();
      box.remove();
    }
    function done(d) {
      title.textContent = "Payment received ✅";
      text.textContent = "Your order " + orderNo + " is confirmed and paid. " + (d && d.pickup_address ? "Pickup address: " + d.pickup_address + ". " : "") + "Your receipt is on its way to your email. You can also send your order on WhatsApp if you like (optional).";
      doneBtn.hidden = false;
      doneBtn.onclick = finish;
      send.textContent = "Also send on WhatsApp (optional)";
      send.hidden = false;
      send.onclick = function () {
        var win = window.open(pending.waUrl, "_blank", "noopener");
        if (!win) window.location.href = pending.waUrl;
        finish();
      };
    }
    function poll() {
      callCheckout("status", orderNo, pending.token).then(function (d) {
        if (d.paid) { done(d); return; }
        if (++tries >= 15) {
          title.textContent = "Still confirming…";
          text.textContent = "Your card was accepted but the confirmation is slow. Tap below to check again.";
          send.textContent = "Check again";
          send.hidden = false;
          send.onclick = function () { send.hidden = true; tries = 0; title.textContent = "Confirming your payment…"; poll(); };
          return;
        }
        setTimeout(poll, 2000);
      }).catch(function () {
        if (++tries < 15) setTimeout(poll, 2000);
        else { title.textContent = "Could not confirm"; text.textContent = "Please message us on WhatsApp with order " + orderNo + "."; }
      });
    }
    poll();
  }

  /* --- Gallery + lightbox ---------------------------------------------- */
  function renderGallery() {
    var host = $("[data-gallery]");
    if (!host) return;
    var limit = parseInt(host.getAttribute("data-gallery"), 10) || D.GALLERY.length;
    var items = D.GALLERY.slice(0, limit);

    host.innerHTML = items.map(function (g, i) {
      return '' +
        '<button class="masonry__item" type="button" data-lb="' + i + '" data-cat="' + esc(g.cat) + '" data-reveal="scale">' +
          '<span class="media" style="display:block">' +
            '<img data-src="' + esc(g.img) + '" alt="' + esc(g.title) + " — " + esc(g.cat) + '" loading="lazy" decoding="async">' +
          "</span>" +
          '<span class="masonry__cap"><small>' + esc(g.cat) + "</small><b>" + esc(g.title) + "</b></span>" +
        "</button>";
    }).join("");

    var filters = $("[data-gallery-filters]");
    if (filters) {
      var cats = [];
      items.forEach(function (g) { if (cats.indexOf(g.cat) === -1) cats.push(g.cat); });
      filters.innerHTML =
        '<button class="chip" type="button" data-gal-filter="all" aria-pressed="true">All</button>' +
        cats.map(function (c) { return '<button class="chip" type="button" data-gal-filter="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
      filters.addEventListener("click", function (e) {
        var chip = e.target.closest("[data-gal-filter]");
        if (!chip) return;
        var cat = chip.getAttribute("data-gal-filter");
        $$("[data-gal-filter]", filters).forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        $$(".masonry__item", host).forEach(function (fig) {
          fig.hidden = cat !== "all" && fig.getAttribute("data-cat") !== cat;
        });
      });
    }

    initLightbox(items, host);
  }

  function initLightbox(items, host) {
    var box = $(".lightbox");
    if (!box) return;
    var img = $("[data-lb-img]", box);
    var cap = $("[data-lb-title]", box);
    var sub = $("[data-lb-cat]", box);
    var index = 0;
    var lastFocus = null;

    function show(i) {
      var visible = $$(".masonry__item", host).filter(function (n) { return !n.hidden; });
      var order = visible.map(function (n) { return parseInt(n.getAttribute("data-lb"), 10); });
      if (!order.length) return;
      var pos = order.indexOf(i);
      if (pos === -1) { i = order[0]; }
      index = i;
      var g = items[index];
      img.src = g.img;
      img.alt = g.title;
      cap.textContent = g.title;
      sub.textContent = g.cat;
    }
    function step(dir) {
      var visible = $$(".masonry__item", host).filter(function (n) { return !n.hidden; });
      var order = visible.map(function (n) { return parseInt(n.getAttribute("data-lb"), 10); });
      var pos = order.indexOf(index);
      show(order[(pos + dir + order.length) % order.length]);
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      document.body.classList.add("nav-open");
      $(".lb-close", box).focus();
    }
    function close() {
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      document.body.classList.remove("nav-open");
      if (lastFocus) lastFocus.focus();
    }

    host.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-lb]");
      if (btn) open(parseInt(btn.getAttribute("data-lb"), 10));
    });
    $(".lb-close", box).addEventListener("click", close);
    $(".lb-prev", box).addEventListener("click", function () { step(-1); });
    $(".lb-next", box).addEventListener("click", function () { step(1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  /* --- Reviews --------------------------------------------------------- */
  function renderReviews() {
    var host = $("[data-reviews]");
    if (!host) return;
    var limit = parseInt(host.getAttribute("data-reviews"), 10) || D.REVIEWS.length;
    host.innerHTML = D.REVIEWS.slice(0, limit).map(function (r) {
      return '' +
        '<article class="card quote" data-reveal>' +
          '<div class="stars" role="img" aria-label="' + r.stars + ' out of 5 stars">' + new Array(r.stars + 1).join(SVG_STAR) + "</div>" +
          "<p>" + esc(r.text) + "</p>" +
          '<footer><span class="avatar" aria-hidden="true">' + esc(r.name.charAt(0)) + "</span><span><cite>" + esc(r.name) + "</cite><small>" + esc(r.role) + "</small></span></footer>" +
        "</article>";
    }).join("");
  }

  /* --- Opening hours: highlight today ---------------------------------- */
  function initHours() {
    var list = $("[data-hours]");
    if (!list) return;
    var today = new Date().getDay();
    $$("li", list).forEach(function (li) {
      var days = (li.getAttribute("data-day") || "").split(",").map(Number);
      if (days.indexOf(today) > -1) {
        li.classList.add("is-today");
        var b = $("b", li);
        if (b && !$(".today-flag", li)) {
          var flag = document.createElement("span");
          flag.className = "today-flag";
          flag.style.cssText = "font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;margin-left:.5rem;opacity:.75";
          flag.textContent = "Today";
          b.appendChild(flag);
        }
      }
    });
  }

  /* --- Enquiry forms: email them to the kitchen -------------------------
     The site has no server of its own, so the forms post to a small relay that
     runs inside the business Google account (Apps Script). It emails the message
     to the business inbox in a branded layout, with the customer's address as
     Reply-To. Address and key live in assets/js/config.js. */
  function formVal(form, name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el.length && el[0] && el[0].type === "radio") { var on = [].filter.call(el, function (r) { return r.checked; })[0]; return on ? on.value : ""; }
    return (el.value || "").trim();
  }

  function enquiryPayload(form) {
    var isContact = !!form.elements.subject;
    var f = function (n) { return formVal(form, n); };
    var fields = { "Name": f("name"), "Email": f("email"), "Phone": f("phone") };
    var subject;

    if (isContact) {
      fields["Topic"] = f("subject");
      fields["Message"] = f("message");
      subject = "Website message: " + (f("subject") || "General enquiry") + " (" + f("name") + ")";
    } else {
      var occasion = f("occasion") === "Other" ? (f("occasion_other") || "Other") : f("occasion");
      fields["Occasion"] = occasion;
      fields["Date needed"] = f("date") ? formatDeliveryDate(f("date"), true) : "";
      fields["Time needed"] = f("time");
      fields["How many people"] = f("party") ? f("party") + " people" : "";
      fields["Notes"] = f("notes");
      subject = "Catering request: " + [occasion, f("party") && f("party") + " people", f("date") && formatDeliveryDate(f("date"))].filter(Boolean).join(" · ") + " (" + f("name") + ")";
    }

    var out = {};
    Object.keys(fields).forEach(function (k) { if (fields[k]) out[k] = fields[k]; });
    return {
      token: C.enquiryToken,
      kind: isContact ? "contact" : "catering",
      subject: subject,
      page: "pharaohsbites.com " + (isContact ? "contact page" : "catering page"),
      honey: f("_honey"),
      fields: out
    };
  }

  function sendEnquiry(form) {
    if (!C.enquiryEndpoint) return Promise.reject(new Error("email is not connected yet"));
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 25000) : null;
    /* A plain-text body keeps this a "simple" request, so no CORS preflight is needed. */
    return fetch(C.enquiryEndpoint, {
      method: "POST",
      body: JSON.stringify(enquiryPayload(form)),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok || !j || j.ok !== true) throw new Error((j && j.error) || ("status " + res.status));
        return j;
      });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw new Error(err && err.name === "AbortError" ? "timed out" : "network error");
    });
  }

  /* --- Forms ----------------------------------------------------------- */
  function initForms() {
    $$("form[data-validate]").forEach(function (form) {
      var status = $(".form-status", form);

      var setError = function (field, message) {
        var slot = $(".error-text", field.closest(".field") || form);
        field.setAttribute("aria-invalid", message ? "true" : "false");
        if (slot) slot.textContent = message || "";
        return !message;
      };

      var validate = function (field) {
        var value = (field.value || "").trim();
        var label = field.getAttribute("data-label") || field.name || "This field";

        if (field.required && !value) return setError(field, label + " is required.");
        if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) return setError(field, "Enter a valid email address.");
        if (field.type === "tel" && value) {
          var digits = value.replace(/\D/g, "").length;
          if (!/^[+(\d][\d\s().-]*$/.test(value) || digits < 10 || digits > 15) return setError(field, "Enter a phone number with area code, like (214) 555-0100.");
        }
        if (field.type === "date" && value) {
          var picked = new Date(value + "T00:00:00");
          var today = new Date(); today.setHours(0, 0, 0, 0);
          if (picked < today) return setError(field, "Please choose a date from today onwards.");
        }
        return setError(field, "");
      };

      $$("input, select, textarea", form).forEach(function (field) {
        field.addEventListener("blur", function () { validate(field); });
        field.addEventListener("input", function () {
          if (field.getAttribute("aria-invalid") === "true") validate(field);
        });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var fields = $$("input, select, textarea", form).filter(function (f) { return f.type !== "hidden" && f.type !== "radio"; });
        var ok = fields.map(validate).every(Boolean);

        if (!ok) {
          var firstBad = fields.filter(function (f) { return f.getAttribute("aria-invalid") === "true"; })[0];
          if (firstBad) firstBad.focus();
          if (status) {
            status.textContent = "Please review the highlighted fields.";
            status.classList.add("is-visible");
          }
          return;
        }

        var btn = $("button[type='submit']", form);
        var label = btn ? btn.textContent : "";
        if (form.getAttribute("data-sending") === "1") return;          /* double-tap guard */
        form.setAttribute("data-sending", "1");
        if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
        if (status) { status.textContent = "Sending your message…"; status.classList.add("is-visible"); }

        sendEnquiry(form).then(function () {
          if (status) {
            status.textContent = form.getAttribute("data-success") || "Thank you — we have received your message.";
            status.classList.add("is-visible");
          }
          toast(form.getAttribute("data-toast") || "Sent successfully");
          form.reset();
          $$("[aria-invalid]", form).forEach(function (f) { f.setAttribute("aria-invalid", "false"); });
          $$(".error-text", form).forEach(function (s) { s.textContent = ""; });
        }).catch(function (err) {
          if (status) {
            status.textContent = "We could not send that just now (" + err.message + "). Nothing is lost — please try again, or message us on WhatsApp: ";
            var a = document.createElement("a");
            a.href = "https://wa.me/" + (C.whatsappNumber || "17879684078");
            a.target = "_blank"; a.rel = "noopener"; a.textContent = "+1 (787) 968-4078";
            status.appendChild(a);
            status.classList.add("is-visible");
          }
        }).then(function () {
          form.removeAttribute("data-sending");
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
      });
    });

    /* Occasion: choosing "Other" reveals a box where the customer types it */
    $$("form select[name='occasion']").forEach(function (select) {
      var form = select.closest("form");
      var box = form && $("[data-occasion-other]", form);
      var input = box && $("input", box);
      if (!box || !input) return;
      var sync = function () {
        var other = select.value === "Other";
        box.hidden = !other;
        input.required = other;
        if (!other) { input.value = ""; input.setAttribute("aria-invalid", "false"); var e = $(".error-text", box); if (e) e.textContent = ""; }
      };
      select.addEventListener("change", function () { sync(); if (select.value === "Other") input.focus(); });
      form.addEventListener("reset", function () { setTimeout(sync, 0); });
      sync();
    });

    /* Catering date floor = today */
    $$("input[type='date'][data-min-today]").forEach(function (input) {
      input.min = new Date().toISOString().split("T")[0];
    });
  }

  /* --- Boot ------------------------------------------------------------ */
  function boot() {
    initHeader();
    initScrollChrome();

    renderFeatured();
    renderMenu();
    renderOrderList();
    renderGallery();
    renderReviews();
    renderBasket();

    initOrderInteractions();
    initBasketFab();
    initAddons();

    initCheckoutForm();
    initPaidReturn();
    initHours();
    initForms();
    initParallax();
    initCounters();

    syncFavButtons();
    syncBasketBadge();

    Track.visit();
    window.addEventListener("error", function (e) {
      Track.problem("page", String(e.message || "script error").slice(0, 200) + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : ""));
    });
    window.addEventListener("unhandledrejection", function (e) {
      Track.problem("page", "promise: " + String((e.reason && e.reason.message) || e.reason || "").slice(0, 200));
    });

    initPromoBanner();
    applyStagger();
    hydrateImages();
    observeReveals();

    /* Newsletter (footer, every page) */
    $$("[data-newsletter]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $("input", form);
        if (!input.value.trim() || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(input.value.trim())) {
          input.focus();
          toast("Please enter a valid email address");
          return;
        }
        toast("You are on the list — check your inbox.");
        form.reset();
      });
    });

    /* Year stamp */
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
