/* ==========================================================================
   PHARAOH'S BITES - Motion (website upgrade, phase 2)
   Everything that moves lives here and in the "Phase 2 motion" section at the end of pages.css.

   Turn it off without touching code:  NB_CONFIG.motion.enabled = false  (config.js)
   Order bar off:                       NB_CONFIG.orderBar = false
   Visitors who ask their device for reduced motion get none of the animation (html.motion is never set).

   Design rules (so it stays calm and fast): CSS first, only transform / opacity / filter move, one shared easing,
   nothing blocks a click, nothing is needed to read the page. GSAP + ScrollTrigger are NOT loaded yet:
   they arrive in phase 3 for the pinned "how it's made" story, where CSS alone cannot do the job.
   ========================================================================== */
(function () {
  "use strict";

  var C = window.NB_CONFIG || {};
  var M = C.motion || {};
  var root = document.documentElement;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var enabled = M.enabled !== false && !reduce;

  /* html.motion is set in <head> before first paint (so reveals do not flash). If motion is switched off in config,
     take it back now. html.motion-ready tells the head fail-safe that this file ran. */
  if (!enabled) root.classList.remove("motion");
  root.classList.add("motion-ready");

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  var isOrderPage = /order\.html$/i.test(window.location.pathname);

  /* --- Fail-safe: anything that should have appeared by now, appears ------------------------------------------- */
  function revealStragglers() {
    $$("[data-reveal]:not(.is-in)").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
    });
  }
  if (enabled) setTimeout(revealStragglers, 3000);

  /* --- Section headings: the gold line under them draws in once they scroll into view --------------------------- */
  function initHeadingLines() {
    var heads = $$(".section-head");
    if (!heads.length) return;
    if (!enabled || !("IntersectionObserver" in window)) { heads.forEach(function (h) { h.classList.add("is-drawn"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-drawn");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.2 });
    heads.forEach(function (h) { io.observe(h); });
  }

  /* --- Home page hero: a few slow golden motes drifting up (CSS does the moving) ------------------------------- */
  function initMotes() {
    var hero = $(".hero");
    if (!enabled || !hero || $(".hero__motes", hero)) return;
    var conn = navigator.connection || {};
    if (conn.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2)) return;   /* low-end phone: skip the extras */
    var wide = window.innerWidth >= 700;
    var count = wide ? 14 : 8;
    var layer = document.createElement("div");
    layer.className = "hero__motes";
    layer.setAttribute("aria-hidden", "true");
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      var size = 3 + Math.random() * (wide ? 6 : 4);
      s.style.setProperty("--x", (4 + Math.random() * 92).toFixed(1) + "%");
      s.style.setProperty("--s", size.toFixed(1) + "px");
      s.style.setProperty("--d", (16 + Math.random() * 18).toFixed(1) + "s");
      s.style.setProperty("--delay", (-Math.random() * 30).toFixed(1) + "s");
      s.style.setProperty("--dx", (Math.random() * 60 - 30).toFixed(0) + "px");
      s.style.setProperty("--o", (0.25 + Math.random() * 0.4).toFixed(2));
      layer.appendChild(s);
    }
    var scrim = $(".hero__scrim", hero);
    if (scrim && scrim.parentNode === hero) hero.insertBefore(layer, scrim.nextSibling); else hero.appendChild(layer);
  }

  /* --- Add to basket: the dish photo flies to the basket, the basket bumps --------------------------------------- */
  function visibleInView(el) {
    if (!el || el.hidden || !el.getClientRects().length) return false;   /* (offsetParent is null for fixed elements) */
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
  }
  function basketTarget() {
    var cand = [".basket-fab[data-basket-fab]", ".basket__count", "a[href='#basket']"];
    for (var i = 0; i < cand.length; i++) {
      var list = $$(cand[i]);
      for (var j = 0; j < list.length; j++) if (visibleInView(list[j])) return list[j];
    }
    return null;
  }
  function bump(el) {
    if (!el || !el.animate) return;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: 360, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
  /* Called by main.js right after a dish was really added. Never throws, never delays the add. */
  function fly(fromEl) {
    if (!enabled || !fromEl || !fromEl.animate) return;
    try {
      var holder = fromEl.closest(".order-item, .hero-item, .dish, .card, article, li") || fromEl.parentElement;
      var img = holder && holder.querySelector("img");
      var from = (img && visibleInView(img) ? img : fromEl).getBoundingClientRect();
      var target = basketTarget();
      if (!target) return;
      var to = target.getBoundingClientRect();
      var size = Math.max(36, Math.min(76, from.width, from.height || from.width));
      var ghost = document.createElement("div");
      ghost.className = "fly-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.width = size + "px";
      ghost.style.height = size + "px";
      if (img && img.currentSrc) ghost.style.backgroundImage = 'url("' + img.currentSrc + '")';
      document.body.appendChild(ghost);
      var x0 = from.left + from.width / 2 - size / 2, y0 = from.top + from.height / 2 - size / 2;
      var x1 = to.left + to.width / 2 - size / 2, y1 = to.top + to.height / 2 - size / 2;
      var anim = ghost.animate([
        { transform: "translate(" + x0 + "px," + y0 + "px) scale(1)", opacity: 0.95 },
        { transform: "translate(" + (x0 + (x1 - x0) * 0.55) + "px," + (y0 + (y1 - y0) * 0.55 - 60) + "px) scale(.7)", opacity: 0.95, offset: 0.55 },
        { transform: "translate(" + x1 + "px," + y1 + "px) scale(.18)", opacity: 0.2 }
      ], { duration: 640, easing: "cubic-bezier(.5,0,.2,1)" });
      var done = function () { ghost.remove(); bump(target); };
      anim.onfinish = done;
      anim.oncancel = function () { ghost.remove(); };
    } catch (e) { /* the animation is only a bonus */ }
  }
  window.NBMotion = { fly: fly };

  /* --- Phones: a sticky "Order now" bar that hides while scrolling down and returns on scroll up --------------- */
  function initOrderBar() {
    if (C.orderBar === false || isOrderPage || $("[data-order-bar]")) return;
    var bar = document.createElement("div");
    bar.className = "order-bar";
    bar.setAttribute("data-order-bar", "");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Order");
    bar.innerHTML = '<a class="btn btn--gold btn--block" href="order.html">Order now</a>';
    document.body.appendChild(bar);
    root.classList.add("has-orderbar");

    var last = window.pageYOffset || 0, shown = false, ticking = false;
    function set(v) { if (v !== shown) { shown = v; bar.classList.toggle("is-shown", v); } }
    function frame() {
      ticking = false;
      var y = window.pageYOffset || 0, dy = y - last;
      if (y < 360) set(false);                 /* the hero has its own button */
      else if (dy < -6) set(true);             /* scrolling up: bring it back */
      else if (dy > 6) set(false);             /* scrolling down: get out of the way */
      last = y;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  }

  function boot() {
    initHeadingLines();
    initMotes();
    initOrderBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
