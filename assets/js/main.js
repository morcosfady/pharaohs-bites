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
  var favourites = Store.read("favourites", []);
  var basket = Store.read("basket", {});

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
  function addToBasket(id, name) {
    basket[id] = (basket[id] || 0) + 1;
    Store.write("basket", basket);
    toast(name + " added to your order");
    renderBasket();
    syncBasketBadge();
    /* First time this dish goes in: offer its add-ons (e.g. sides for feteer). */
    var item = D.MENU.filter(function (m) { return m.id === id; })[0];
    if (item && item.suggest && basket[id] === 1) openAddons(item);
  }
  function setQty(id, qty) {
    if (qty <= 0) delete basket[id]; else basket[id] = qty;
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
    var extras = D.MENU.filter(function (m) { return m.cat === opts.category && m.id !== opts.exclude; });
    if (!extras.length) return false;

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
      var item = D.MENU.filter(function (m) { return m.id === id; })[0];
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
        skip: "No thanks", done: "Continue to WhatsApp",
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
      if (e.target.closest("[data-addon-continue]")) closeAddons(true);
      else if (e.target === box || e.target.closest("[data-addon-close]")) closeAddons(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAddons(false);
    });
  }

  /* Pharaoh mark for house specials. `label` renders an accessible name once
     per item; repeat marks elsewhere on the same card are decorative. */
  function pharaoh(label) {
    return '<img class="pharaoh-mark" src="assets/img/pharaoh-mark.svg" ' +
           (label ? 'alt="House special"' : 'alt="" aria-hidden="true"') +
           ' width="52" height="60" loading="lazy">';
  }

  var SVG_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.6S3.8 15.3 3.8 9.6a4.6 4.6 0 0 1 8.2-2.8 4.6 4.6 0 0 1 8.2 2.8c0 5.7-8.2 11-8.2 11z"/></svg>';
  var SVG_STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  /* --- Card + row templates -------------------------------------------- */
  function dishCard(item, opts) {
    opts = opts || {};
    var tag = item.special
      ? '<span class="tag tag--special">' + pharaoh(false) + "House Special</span>"
      : (item.tags && item.tags.length ? '<span class="tag">' + esc(item.tags[0]) + "</span>" : "");
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

  function menuRow(item) {
    var pills = (item.tags || []).map(function (t) {
      var cls = /vegan|vegetarian/i.test(t) ? "pill pill--veg" : (/signature|chef|tasting|special/i.test(t) ? "pill pill--gold" : "pill");
      return '<span class="' + cls + '">' + esc(t) + "</span>";
    }).join("");
    return '' +
      '<article class="order-item menu-item" data-reveal>' +
        '<div class="media media--1x1"><img data-src="' + esc(item.img) + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async" width="200" height="200"></div>' +
        "<div><h3>" + (item.special ? pharaoh(true) : "") + esc(item.name) +
          ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(item.ar) + "</span></h3>" +
          "<p>" + esc(item.desc) + "</p>" +
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
          return '<button class="chip" type="button" data-filter="' + c.id + '" aria-pressed="false">' + esc(c.name) + "</button>";
        }).join("");
    }

    var state = { cat: "all", q: "" };

    function apply() {
      var visibleTotal = 0;
      $$(".menu-group", host).forEach(function (group) {
        var catMatch = state.cat === "all" || group.getAttribute("data-group") === state.cat;
        var shown = 0;
        $$(".menu-item", group).forEach(function (row) {
          var text = row.textContent.toLowerCase();
          var hit = catMatch && (!state.q || text.indexOf(state.q) > -1);
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
          var target = $("#" + state.cat);
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

    host.innerHTML = D.MENU.map(function (item) {
      return '' +
        '<article class="order-item" data-cat="' + esc(item.cat) + '" data-reveal>' +
          '<div class="media media--1x1"><img data-src="' + esc(item.img) + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async" width="200" height="200"></div>' +
          "<div><h3>" + (item.special ? pharaoh(true) : "") + esc(item.name) +
            ' <span class="dish__ar" lang="ar" dir="rtl">' + esc(item.ar) + "</span></h3><p>" + esc(item.desc.slice(0, 96)) + "…</p></div>" +
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
          return '<button class="chip" type="button" data-order-filter="' + c.id + '" aria-pressed="false">' + esc(c.name) + "</button>";
        }).join("");

      filters.addEventListener("click", function (e) {
        var chip = e.target.closest("[data-order-filter]");
        if (!chip) return;
        var cat = chip.getAttribute("data-order-filter");
        $$("[data-order-filter]", filters).forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        $$(".order-item", host).forEach(function (row) {
          row.hidden = cat !== "all" && row.getAttribute("data-cat") !== cat;
        });
      });
    }
  }

  function renderBasket() {
    var list = $("[data-basket-list]");
    if (!list) return;

    var ids = Object.keys(basket);
    var subtotal = 0;

    if (!ids.length) {
      list.innerHTML = '<p class="basket__empty">Your order is empty.<br>Add something warm.</p>';
    } else {
      list.innerHTML =
        '<div class="basket-head" aria-hidden="true"><span>Item</span><span>Qty</span><span>Each</span><span>Total</span></div>' +
        ids.map(function (id) {
          var item = D.MENU.filter(function (m) { return m.id === id; })[0];
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
              '<button type="button" class="remove" data-remove="' + esc(id) + '">Remove</button>' +
            "</div>";
        }).join("");
    }

    var set = function (sel, val) { var el = $(sel); if (el) el.textContent = money(val); };
    set("[data-subtotal]", subtotal);

    updateCheckoutState(subtotal);
    syncAddons();
  }

  /* --- Customer details ------------------------------------------------ */
  var REQUIRED_FIELDS = ["first_name", "last_name", "phone", "street", "city", "state", "zip"];

  function readCustomer() {
    var form = $("[data-checkout-form]");
    if (!form) return null;
    var c = {};
    ["first_name", "last_name", "phone", "street", "apt", "city", "state", "zip", "instructions", "requested_at"].forEach(function (k) {
      var el = form.elements[k];
      c[k] = el ? el.value.trim() : "";
    });
    /* Everything downstream (WhatsApp message, finance system) takes one name. */
    c.name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    return c;
  }

  function customerComplete(c) {
    if (!c) return false;
    return REQUIRED_FIELDS.every(function (k) { return c[k].length > 0; }) &&
           /^\d{5}(-\d{4})?$/.test(c.zip) &&
           c.phone.replace(/\D/g, "").length >= 7;
  }

  function updateCheckoutState(subtotal) {
    var checkout = $("[data-checkout]");
    if (!checkout) return;
    if (subtotal == null) {
      subtotal = Object.keys(basket).reduce(function (sum, id) {
        var item = D.MENU.filter(function (m) { return m.id === id; })[0];
        return sum + (item ? item.price * basket[id] : 0);
      }, 0);
    }
    var customer = readCustomer();
    var hasItems = subtotal > 0;
    var detailsOk = customerComplete(customer);
    var number = C.orderWhatsappNumber || C.whatsappNumber;

    checkout.disabled = !(hasItems && detailsOk && number);

    var note = $("[data-basket-note]");
    if (note) {
      var min = C.minimumOrder || 0;
      if (!hasItems) note.textContent = "Add a dish and fill in your details to continue.";
      else if (!detailsOk) note.textContent = "Fill in your name, phone number and delivery address to continue.";
      else if (min > 0 && subtotal < min) note.textContent = "Heads up: our usual minimum is " + money(min) + ". Send it anyway and we will confirm.";
      else note.textContent = "WhatsApp opens with your order ready to send. We confirm the delivery fee before payment.";
    }
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
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    updateCheckoutState();
  }

  function initOrderInteractions() {
    document.addEventListener("click", function (e) {
      var add = e.target.closest("[data-add]");
      if (add) { addToBasket(add.getAttribute("data-add"), add.getAttribute("data-name")); return; }

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
      var item = D.MENU.filter(function (m) { return m.id === id; })[0];
      if (!item) return null;
      return { id: id, name: item.name, ar: item.ar || "", qty: basket[id], options: "", unitPrice: item.price, lineTotal: item.price * basket[id] };
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
    var address = [c.street, c.apt, c.city + ", " + c.state + " " + c.zip].filter(Boolean).join(", ");
    var count = order.items.reduce(function (n, l) { return n + l.qty; }, 0);

    var head = ["🔔👑✨ *NEW PHARAOH’S BITES ORDER* ✨👑🔔"];
    if (order.orderNumber) head.push("", "🔖 Order No: *" + order.orderNumber + "* 🆕");
    head.push("🕒 Placed: " + formatRequested(order.placedAt) + " ⏰");

    var cust = [waSection("👤", "CUSTOMER DETAILS  |  بيانات العميل"), "", "1️⃣ 🙋 *Name:* " + c.name];
    if (c.phone) cust.push("2️⃣ 📱 *Phone:* " + c.phone);
    cust.push("3️⃣ 🏠 *Address:* " + address);
    if (c.instructions) cust.push("4️⃣ 📝 *Instructions:* _" + c.instructions + "_");
    if (c.requested_at) cust.push("5️⃣ 🗓️ *Requested for:* " + formatRequested(c.requested_at));

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
      "🚗 Delivery Fee: _To be determined_ ⏳",
      "🏛️ Tax: _To be confirmed_ ⏳",
      "✅ *FINAL TOTAL:* _To be confirmed_ 🔜"
    ];

    return [
      head.join(nl), "",
      cust.join(nl), "",
      waSection("🛒", "ORDER ITEMS  |  الأصناف"), "",
      items.join(nl + WA_THIN + nl), "",
      totals.join(nl), "",
      WA_RULE
    ].join(nl);
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
  function recordOrder(order, token) {
    var payload = {
      checkout_token: token,
      customer: {
        name: order.customer.name, phone: order.customer.phone, street: order.customer.street, apt: order.customer.apt,
        city: order.customer.city, state: order.customer.state, zip: order.customer.zip,
        instructions: order.customer.instructions || "",
        requested_at: order.customer.requested_at ? new Date(order.customer.requested_at).toISOString() : ""
      },
      items: order.items.map(function (l) { return { slug: l.id, quantity: l.qty, options: l.options || "" }; })
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
    var win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;   /* popup blocked: same tab */
    toast("Opening WhatsApp with your order…");
  }

  function setCheckoutBusy(btn, busy, label) {
    btn.disabled = busy;
    btn.classList.toggle("is-busy", busy);
    var span = $("[data-checkout-label]", btn);
    if (span) span.textContent = label || "Complete Order on WhatsApp";
  }

  function showCheckoutError(msg) {
    var box = $("[data-checkout-error]");
    var text = $("[data-checkout-error-text]");
    if (text) text.textContent = msg;
    if (box) box.hidden = !msg;
  }

  function submitOrder(btn, skipNudges) {
    if (submitting) return;                    /* double-click guard */
    if (!Object.keys(basket).length) return;
    if (!customerComplete(readCustomer())) {
      toast("Please fill in your name, phone and delivery address first.");
      updateCheckoutState();
      return;
    }
    var number = C.orderWhatsappNumber || C.whatsappNumber;
    if (!number) { toast("Ordering is not connected yet — please call us."); return; }
    showCheckoutError("");

    /* Last chance to add sides / desserts. The basket is rebuilt afterwards
       so anything added in the dialog is part of the order. */
    if (!skipNudges) { runCheckoutNudges(function () { submitOrder(btn, true); }); return; }
    var order = buildOrder();

    /* No finance endpoint configured: WhatsApp only (previous behaviour). */
    if (!C.financeOrderEndpoint) { openWhatsApp(order, number); return; }

    var state = checkoutToken(order);
    /* Already recorded (e.g. page refreshed after success): reuse the number. */
    if (state.orderNumber) {
      order.orderNumber = state.orderNumber;
      openWhatsApp(order, number);
      return;
    }

    submitting = true;
    setCheckoutBusy(btn, true, "Saving your order…");
    recordOrder(order, state.token).then(function (orderNumber) {
      state.orderNumber = orderNumber;
      Store.write("checkout", state);
      order.orderNumber = orderNumber;
      submitting = false;
      setCheckoutBusy(btn, false);
      toast("Order " + orderNumber + " saved");
      openWhatsApp(order, number);
    }).catch(function (err) {
      submitting = false;
      setCheckoutBusy(btn, false);
      showCheckoutError("We could not save your order (" + err.message + "). Nothing was lost — your basket and details are still here. Please try again, or message us on WhatsApp directly.");
    });
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
          flag.style.cssText = "font-size:.55rem;letter-spacing:.2em;text-transform:uppercase;margin-left:.5rem;opacity:.75";
          flag.textContent = "Today";
          b.appendChild(flag);
        }
      }
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
        if (field.type === "tel" && value && !/^[+\d][\d\s()-]{6,}$/.test(value)) return setError(field, "Enter a valid phone number.");
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

        if (status) {
          status.textContent = form.getAttribute("data-success") || "Thank you — we have received your message.";
          status.classList.add("is-visible");
        }
        toast(form.getAttribute("data-toast") || "Sent successfully");
        form.reset();
        $$("[aria-invalid]", form).forEach(function (f) { f.setAttribute("aria-invalid", "false"); });
        $$(".error-text", form).forEach(function (s) { s.textContent = ""; });
      });
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
    initHours();
    initForms();
    initParallax();
    initCounters();

    syncFavButtons();
    syncBasketBadge();

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
