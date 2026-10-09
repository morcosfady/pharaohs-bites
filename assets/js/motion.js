/* ==========================================================================
   PHARAOH'S BITES - Motion (website upgrade, phase 2)
   Everything that moves lives here and in the "Phase 2 motion" section at the end of pages.css.

   Turn it off without touching code:  NB_CONFIG.motion.enabled = false  (config.js)
   Order bar off:                       NB_CONFIG.orderBar = false
   Visitors who ask their device for reduced motion get none of the animation (html.motion is never set).

   Design rules (so it stays calm and fast): CSS first, only transform / opacity / filter move, one shared easing,
   nothing blocks a click, nothing is needed to read the page. GSAP + ScrollTrigger are NOT used: sticky positioning
   plus a little scroll maths does the pinned "how it's made" story, so the site ships no animation library.
   Phase 3 adds: 3D tilt + glare and magnetic buttons (mouse only, config motion.threeD), line art that draws itself,
   and the four-step "How feteer is made" story with lazy-loaded videos (assets/video).
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

  /* ======================= Phase 3 ======================================================================== */
  var fine = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  var threeD = enabled && M.threeD !== false && fine;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* --- 3D tilt with a gold glare (mouse only). Uses the CSS "rotate" property so reveal / hover transforms are untouched.
         The parent gets a perspective once, so the tilt has depth. ----------------------------------------------- */
  function initTilt() {
    if (!threeD) return;
    root.classList.add("motion-3d");
    var SEL = ".hero__card, .spotlight, .grid-4 > .card, #featured .dish, .hero-item, .masonry__item";
    var active = null, evt = null, raf = 0;

    function prepare(el) {
      if (el.__tiltReady) return;
      el.__tiltReady = true;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var glare = document.createElement("span");
      glare.className = "tilt__glare";
      glare.setAttribute("aria-hidden", "true");
      el.appendChild(glare);
      el.__glare = glare;
      if (el.parentElement) el.parentElement.style.perspective = "1100px";
      el.style.transition = (getComputedStyle(el).transition || "all 0s") + ", rotate .22s cubic-bezier(.2,.8,.2,1) 0s";
    }
    function reset(el) {
      if (!el) return;
      el.classList.remove("is-tilting");
      el.style.rotate = "";
    }
    function frame() {
      raf = 0;
      if (!active || !evt) return;
      var r = active.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = clamp(((evt.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      var ny = clamp(((evt.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
      var max = active.classList.contains("spotlight") ? 3.5 : 5.5;     /* big cards tilt less */
      var angle = Math.hypot(nx, ny) * max;
      active.style.rotate = angle < 0.05 ? "" : (-ny * max).toFixed(3) + " " + (nx * max).toFixed(3) + " 0 " + angle.toFixed(2) + "deg";
      active.style.setProperty("--gx", ((nx + 1) * 50).toFixed(1) + "%");
      active.style.setProperty("--gy", ((ny + 1) * 50).toFixed(1) + "%");
    }
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (el !== active) {
        reset(active);
        active = el;
        if (el) { prepare(el); el.classList.add("is-tilting"); }
      }
      evt = e;
      if (active && !raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
    document.addEventListener("pointerleave", function () { reset(active); active = null; }, true);
    window.addEventListener("blur", function () { reset(active); active = null; });
  }

  /* --- Magnetic gold buttons: they lean a few pixels toward the cursor when it comes close (mouse only) ------------ */
  function initMagnetic() {
    if (!threeD) return;
    var buttons = [];
    function collect() {
      buttons = $$(".btn--gold:not(.btn--sm):not(.btn--block):not(.btn--place):not([type=submit])");
      buttons.forEach(function (b) {
        if (b.__magnet) return;
        b.__magnet = true;
        b.style.transition = (getComputedStyle(b).transition || "all 0s") + ", translate .25s cubic-bezier(.2,.8,.2,1) 0s";
      });
    }
    collect();
    setTimeout(collect, 1500);
    var evt = null, raf = 0;
    function frame() {
      raf = 0;
      if (!evt) return;
      buttons.forEach(function (b) {
        var r = b.getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return;
        var pad = 56;
        var inside = evt.clientX > r.left - pad && evt.clientX < r.right + pad && evt.clientY > r.top - pad && evt.clientY < r.bottom + pad;
        if (!inside) { if (b.style.translate) b.style.translate = ""; return; }
        var dx = clamp((evt.clientX - (r.left + r.width / 2)) * 0.22, -9, 9);
        var dy = clamp((evt.clientY - (r.top + r.height / 2)) * 0.22, -6, 6);
        b.style.translate = dx.toFixed(1) + "px " + dy.toFixed(1) + "px";
      });
    }
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      evt = e;
      if (!raf) raf = requestAnimationFrame(frame);
    }, { passive: true });
    document.addEventListener("pointerleave", function () { buttons.forEach(function (b) { b.style.translate = ""; }); }, true);
  }

  /* --- Gold line art that draws itself as it scrolls into view (stroke-dashoffset follows --p) --------------------- */
  function initLineDraw() {
    var arts = $$("[data-draw]");
    if (!arts.length || !enabled) return;
    var ticking = false;
    function frame() {
      ticking = false;
      var vh = window.innerHeight;
      arts.forEach(function (a) {
        var r = a.getBoundingClientRect();
        var p = clamp((vh * 0.9 - r.top) / (vh * 0.42), 0, 1);       /* starts at 90% of the screen, done a bit above the middle */
        a.style.setProperty("--p", p.toFixed(3));
      });
    }
    function queue() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    frame();
  }

  /* --- "How feteer is made": four steps, one video each ----------------------------------------------------------
     Desktop: the stage is a tall scroll track; scroll progress picks the step. Phones: swipe the cards, the card that is
     centred picks the step. Videos load only when the section is near, one at a time (plus the next), and only the active
     one plays. With reduced motion, data saver or a very slow connection the posters are shown and nothing autoplays. --- */
  function initStory() {
    var stage = $("[data-story-stage]");
    if (!stage) return;
    var videos = $$(".story__video", stage), steps = $$(".story__step", stage), list = $("[data-story-steps]", stage);
    var sticky = $(".story__sticky", stage);
    var conn = navigator.connection || {};
    var canPlay = enabled && !conn.saveData && !/(^|-)2g$/.test(conn.effectiveType || "");
    var wide = window.matchMedia("(min-width: 900px)");
    var current = -1, near = false, visible = false;

    /* posters of the other steps are fetched when the section is near (a <video poster> would load straight away) */
    function posters() { videos.forEach(function (v) { var p = v.getAttribute("data-poster"); if (p) { v.poster = p; v.removeAttribute("data-poster"); } }); }
    function load(i) {
      var v = videos[i];
      if (!canPlay || !v || v.getAttribute("src") || !v.getAttribute("data-src")) return;
      v.src = v.getAttribute("data-src");
      v.load();
    }
    function playActive() {
      videos.forEach(function (v, k) {
        if (k === current && canPlay && visible && !document.hidden) { var p = v.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ }); }
        else { try { v.pause(); } catch (e) { /* ignore */ } }
      });
    }
    function setStep(i) {
      if (i === current || i < 0 || i >= steps.length) return;
      current = i;
      videos.forEach(function (v, k) { v.classList.toggle("is-active", k === i); });
      steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      stage.setAttribute("data-step", String(i + 1));
      if (near) { load(i); setTimeout(function () { load(i + 1); }, 800); }
      playActive();
    }
    setStep(0);

    /* near / visible tracking */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting && !near) { near = true; posters(); load(current); setTimeout(function () { load(current + 1); }, 800); playActive(); } }, { rootMargin: "700px 0px" }).observe(stage);
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; playActive(); }, { threshold: 0.15 }).observe(sticky || stage);
    } else { near = visible = true; posters(); load(0); playActive(); }
    document.addEventListener("visibilitychange", playActive);

    /* desktop: scroll progress through the track picks the step */
    function onScroll() {
      if (!enabled || !wide.matches) return;
      var r = stage.getBoundingClientRect();
      var top = parseFloat(getComputedStyle(sticky).top) || 0;
      var span = r.height - sticky.offsetHeight;
      if (span <= 0) return;
      var p = clamp((top - r.top) / span, 0, 0.9999);
      setStep(Math.floor(p * steps.length));
    }
    var ticking = false;
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    /* phones: the centred card picks the step */
    if (list && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (wide.matches) return;
        es.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio >= 0.6) setStep(steps.indexOf(e.target)); });
      }, { root: list, threshold: [0.6, 0.8] });
      steps.forEach(function (s) { io.observe(s); });
    }

    /* the step titles are buttons: jump to that step */
    steps.forEach(function (s, i) {
      var b = $(".story__btn", s);
      if (!b) return;
      b.addEventListener("click", function () {
        if (enabled && wide.matches) {
          var r = stage.getBoundingClientRect();
          var top = parseFloat(getComputedStyle(sticky).top) || 0;
          var span = r.height - sticky.offsetHeight;
          window.scrollTo({ top: window.pageYOffset + r.top - top + span * ((i + 0.5) / steps.length), behavior: "smooth" });
        } else {
          setStep(i);
          if (!wide.matches && s.scrollIntoView) s.scrollIntoView({ inline: "center", block: "nearest", behavior: enabled ? "smooth" : "auto" });
        }
      });
    });
  }

  /* ======================= Phase 4 ======================================================================== */
  /* Contact + catering forms: floating labels. JS adds .js-float and keeps .is-floated in step with the value;
     without JS the labels simply stay above the fields. Nothing here touches validation or sending. */
  function initFloatingLabels() {
    $$("form.form").forEach(function (form) {
      var fields = $$(".field", form).filter(function (f) { return f.tagName !== "FIELDSET" && $("input, select, textarea", f) && !$("input[type=radio], input[type=checkbox]", f); });   /* radio groups (the party size picker) keep their own look */
      if (!fields.length) return;
      function sync(field) {
        var c = $("input, select, textarea", field);
        if (!c) return;
        field.classList.toggle("is-floated", c.tagName === "SELECT" || c.type === "date" || c.type === "time" || String(c.value || "").length > 0);   /* date / time boxes always show their own mm/dd/yyyy text */
      }
      function syncAll() { fields.forEach(sync); }
      form.classList.add("js-float");
      syncAll();
      form.addEventListener("input", function (e) { var f = e.target.closest && e.target.closest(".field"); if (f) sync(f); });
      form.addEventListener("change", function (e) { var f = e.target.closest && e.target.closest(".field"); if (f) sync(f); });
      form.addEventListener("reset", function () { setTimeout(syncAll, 0); });
      setTimeout(syncAll, 600);      /* browser autofill can fill fields without an event */
      setTimeout(syncAll, 1800);
    });
  }

  /* Third-party embeds (the contact map) start loading only when they are about to scroll into view */
  function initLazyEmbeds() {
    var frames = $$("iframe[data-embed-src]");
    if (!frames.length) return;
    function load(f) { var s = f.getAttribute("data-embed-src"); if (s) { f.src = s; f.removeAttribute("data-embed-src"); } }
    if (!("IntersectionObserver" in window)) { frames.forEach(load); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }); }, { rootMargin: "250px 0px" });
    frames.forEach(function (f) { io.observe(f); });
  }

  /* Footer: the two columns are open on desktop and fold into accordions on phones */
  function initFooterAccordion() {
    var accs = $$(".footer-acc");
    if (!accs.length || !window.matchMedia) return;
    var wide = window.matchMedia("(min-width: 900px)");
    function sync() { accs.forEach(function (a) { if (wide.matches) a.open = true; else if (!a.__userToggled) a.open = false; }); }
    accs.forEach(function (a) { var s = $("summary", a); if (s) s.addEventListener("click", function () { a.__userToggled = true; }); });
    if (wide.addEventListener) wide.addEventListener("change", sync); else wide.addListener(sync);
    sync();
  }

  /* Home dishes carousel: the track scrolls and snaps natively; this adds arrows, dots and keyboard keys */
  function initSpotlight() {
    var root = $("[data-spot]");
    if (!root) return;
    var track = $("[data-spot-track]", root), prev = $("[data-spot-prev]", root), next = $("[data-spot-next]", root);
    var dots = $$(".spot-dot", root.parentNode), slides = $$(".spotlight", track);
    if (!track || slides.length < 2) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function step() { return slides[1].offsetLeft - slides[0].offsetLeft; }
    function current() { return Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / step()))); }
    var idx = 0;
    function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); track.scrollTo({ left: i * step(), behavior: reduce ? "auto" : "smooth" }); }
    function sync() {
      var i = idx = current();
      dots.forEach(function (d, n) { d.classList.toggle("is-active", n === i); });
      slides.forEach(function (s, n) { s.classList.toggle("is-current", n === i); });
      prev.disabled = i === 0; next.disabled = i === slides.length - 1;
    }
    prev.hidden = false; next.hidden = false;
    prev.addEventListener("click", function () { go(current() - 1); });
    next.addEventListener("click", function () { go(current() + 1); });
    dots.forEach(function (d, n) { d.addEventListener("click", function () { go(n); }); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(current() + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(current() - 1); }
    });
    var t; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(sync, 60); }, { passive: true });
    window.addEventListener("resize", function () { track.scrollLeft = idx * step(); });
    sync();
  }

  function boot() {
    initSpotlight();
    initFloatingLabels();
    initFooterAccordion();
    initLazyEmbeds();
    initHeadingLines();
    initMotes();
    initOrderBar();
    initTilt();
    initMagnetic();
    initLineDraw();
    initStory();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
