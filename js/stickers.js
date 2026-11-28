/* Sticker decor for the home page. Plain JS, no libraries.
   Reads the data-* attributes in _includes/stickers.html and puts each sticker
   in the side margins at a page height, never over the content. */
(function () {
  var layer = document.querySelector(".stickers");
  var main = document.querySelector("main");
  if (!layer || !main) return;

  var stickers = Array.prototype.slice.call(layer.querySelectorAll(".stk"));
  var wide = window.matchMedia("(min-width: 1240px)");
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  var EDGE = 10;       // px kept clear at the window's edge
  var GAP = 18;        // px kept clear beside the content
  var MIN_W = { age: 54, now: 70 };  // narrower than this a sticker is hidden rather than squeezed
  var placed = [];     // {el, cy, k} for the drift

  function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }

  // Content blocks = the page's sections (the map is wider than the text column).
  function blocks() {
    var out = [];
    for (var i = 0; i < main.children.length; i++) {
      var c = main.children[i];
      if (c === layer) continue;
      var r = c.getBoundingClientRect();
      if (r.height > 0) out.push({ top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, right: r.right });
    }
    return out;
  }

  // Free space left and right of the content over the vertical span [y, y+h].
  function margins(bl, y, h) {
    var left = Infinity, right = 0, vw = document.documentElement.clientWidth;
    bl.forEach(function (b) {
      if (b.bottom > y && b.top < y + h) { left = Math.min(left, b.left); right = Math.max(right, b.right); }
    });
    if (left === Infinity) { left = (vw - 1000) / 2; right = vw - left; }
    return { left: left - GAP - EDGE, right: vw - right - GAP - EDGE, leftEdge: left, rightEdge: right };
  }

  function layout() {
    placed = [];
    stickers.forEach(function (s) { s.classList.remove("on"); });
    if (!wide.matches) return;

    var bl = blocks();
    var origin = layer.getBoundingClientRect();
    var ox = origin.left, oy = origin.top + window.scrollY;     // layer's corner in page coordinates
    var vw = document.documentElement.clientWidth;
    var first = document.querySelector("#about"), last = document.querySelector("#reading");
    var top0 = first ? docTop(first) : 0;
    var bottom0 = last ? docTop(last) + last.offsetHeight : main.offsetHeight;
    var scale = Math.min(1, ((vw - 1000) / 2) / 200);   // narrow margins: shrink everything so all 17 still fit
    var lastAge = -Infinity;        // top of the previous age sticker: the next one never sits higher
    var taken = { l: [], r: [] };   // [top, bottom] of stickers already on each side

    // Now stickers first, so they get their spot beside their section; ages fill in around them.
    var order = stickers.filter(function (s) { return s.classList.contains("stk-now"); })
      .concat(stickers.filter(function (s) { return s.classList.contains("stk-age"); }));

    order.forEach(function (s) {
      var d = s.dataset, side = d.side === "r" ? "r" : "l";
      var want = (parseFloat(d.w) || 100) * scale;
      var ratio = s.height / s.width || 1.4;
      var y, y0, ymin = -Infinity, ymax = Infinity;
      if (d.sec) {
        var sec = document.querySelector(d.sec);
        if (!sec) return;
        var st = docTop(sec), sh = sec.offsetHeight;
        var h0 = want * ratio;
        y = st + (sh - h0) * parseFloat(d.at || 0.5);   // inside the section, by the fraction asked
        ymin = st - h0 * 0.7; ymax = st + sh - h0 * 0.3;   // may hang past a short section, never fully outside it
      } else {
        y = top0 + (bottom0 - top0 - want * ratio) * parseFloat(d.p || 0);
        y = Math.max(y, lastAge);
      }
      y0 = y;

      // Look for a clean spot: the wanted height first, then alternately 24px lower and higher,
      // on the wanted side, then on the other side. A spot needs a wide enough margin and
      // nothing already on it. Ages may roam over the whole page; now stickers stay in their section.
      var w = want, h = w * ratio, x = 0, ok = false, side0 = side;
      var lo = d.sec ? ymin : Math.max(top0 - 20, lastAge), hi = d.sec ? ymax : bottom0 + 30 - want * ratio;
      var sides = d.sec ? [side0] : [side0, side0 === "l" ? "r" : "l"];
      for (var si = 0; si < sides.length && !ok; si++) {
        side = sides[si];
        for (var step = 0; step < 120 && !ok; step++) {
          var yy = y0 + (step % 2 ? -1 : 1) * Math.ceil(step / 2) * 24;
          if (yy < lo || yy > hi) continue;
          var m = margins(bl, yy, want * ratio);
          var room = side === "l" ? m.left : m.right;
          w = Math.min(want, room);
          h = w * ratio;
          if (w < (d.sec ? MIN_W.now : MIN_W.age)) continue;
          var clash = taken[side].some(function (t) { return yy < t[1] + 14 && yy + h > t[0] - 14; });
          if (clash) continue;
          // sit near the content, a little further out when there is room
          var inner = side === "l" ? m.leftEdge - GAP - w : m.rightEdge + GAP;
          x = inner + (side === "l" ? -1 : 1) * Math.min(24, Math.max(0, room - w) * 0.3);
          y = yy; ok = true;
        }
      }
      if (!ok) return;           // no clean spot: leave this one out

      if (!d.sec) lastAge = y;
      taken[side].push([y, y + h]);
      s.style.width = Math.round(w) + "px";
      s.style.left = Math.round(x - ox) + "px";
      s.style.top = Math.round(y - oy) + "px";
      s.style.setProperty("--r", (parseFloat(d.r) || 0) + "deg");
      s.classList.add("on");
      placed.push({ el: s, cy: y + h / 2, k: parseFloat(d.k) || 0 });
    });
    drift();
  }

  // A few px of drift as you scroll: each sticker moves a little against the page,
  // zero when it is level with the middle of the window, capped at 14px.
  var ticking = false;
  function drift() {
    ticking = false;
    if (calm.matches) { placed.forEach(function (p) { p.el.style.setProperty("--dy", "0px"); }); return; }
    var mid = window.scrollY + window.innerHeight / 2;
    placed.forEach(function (p) {
      var dy = Math.max(-14, Math.min(14, (mid - p.cy) * p.k));
      p.el.style.setProperty("--dy", dy.toFixed(1) + "px");
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }

  var queued = false;
  function relayout() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; layout(); });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", relayout);
  window.addEventListener("load", relayout);
  wide.addEventListener ? wide.addEventListener("change", relayout) : wide.addListener(relayout);
  // The page grows when fonts, images and the map load; follow it.
  if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(main);
  layout();
})();
