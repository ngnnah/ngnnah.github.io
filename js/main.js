// The portrait shows a second photo on hover; a tap or a key press flips it.
document.querySelectorAll(".portrait").forEach(function (button) {
  button.addEventListener("click", function () {
    var on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Show the photo of Nhat" : "Show Nhat's face as a glacier");
  });
});

/* The map's four small motions. The same code is in I And AI's index.html;
   change both together. Each map's own numbers are data attributes on .map,
   in the 1672 x 941 picture's pixels: data-route (points, ";" starts another
   route) and data-compass ("x,y,radius" of the painted rose); the glows are
   .glow spans in the markup. */
(function () {
  var map = document.querySelector(".map");
  if (!map) return;
  var W = 1672, H = 941, NS = "http://www.w3.org/2000/svg";
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pins = map.querySelectorAll(".pin");

  /* 1. The route lights up: a small warm light walks the painted dots and a
     soft trail follows it, then fades into the haze. Drawn as three stacked
     dashes of the same path (long and faint, short and bright). */
  function pathD(pts) { // curve through the points' midpoints, so no corners
    var mid = function (a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    var d = "M" + pts[0] + "L" + mid(pts[0], pts[1]);
    for (var i = 1; i < pts.length - 1; i++) d += "Q" + pts[i] + " " + mid(pts[i], pts[i + 1]);
    return d + "L" + pts[pts.length - 1];
  }
  function svg(tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    parent.appendChild(el);
    return el;
  }
  function travel() {
    var routes = map.dataset.route.split(";").map(function (r) {
      return r.trim().split(/\s+/).map(function (p) { return p.split(",").map(Number); });
    });
    var root = svg("svg", { "class": "route", viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", "aria-hidden": "true" }, map);
    map.insertBefore(root, pins[0]);
    var walkers = routes.map(function (pts) {
      var d = pathD(pts), g = svg("g", {}, root);
      var trail = [[260, 15, 0.1], [170, 8, 0.25], [90, 3.5, 0.6]].map(function (t) {
        var p = svg("path", { d: d, "stroke-width": t[1], opacity: t[2] }, g);
        return { el: p, len: t[0] };
      });
      var halo = svg("circle", { r: 14, "class": "halo" }, g), dot = svg("circle", { r: 4.5, "class": "dot" }, g);
      return { g: g, trail: trail, halo: halo, dot: dot, total: trail[0].el.getTotalLength() };
    });
    var start = null, DURATION = 4200;
    function frame(now) {
      start = start || now;
      var t = Math.min((now - start) / DURATION, 1);
      var p = (1 - Math.cos(Math.PI * t)) / 2;                // slow at both ends
      var fade = 1 - Math.max(0, (t - 0.85) / 0.15);          // dims over the last stretch
      walkers.forEach(function (w) {
        var head = p * w.total, at = w.trail[0].el.getPointAtLength(head);
        w.g.setAttribute("opacity", fade);
        w.trail.forEach(function (s) {
          s.el.setAttribute("stroke-dasharray", s.len + " " + (w.total + s.len));
          s.el.setAttribute("stroke-dashoffset", s.len - head); // dash covers [head - len, head]
        });
        [w.halo, w.dot].forEach(function (c) { c.setAttribute("cx", at.x); c.setAttribute("cy", at.y); });
      });
      if (t < 1) requestAnimationFrame(frame); else root.remove(); // the painted route rests as it was
    }
    requestAnimationFrame(frame);
  }
  if (!still && map.dataset.route) {
    if ("IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        seen.disconnect();
        travel();
      }, { threshold: 0.5 });
      seen.observe(map);
    } else travel();
  }

  /* 4. The compass needle sits on the painted rose; it sways a little at rest
     and turns to the banner being pointed at. */
  var needle = null, turn = 0;
  if (map.dataset.compass) {
    var c = map.dataset.compass.split(",").map(Number);
    needle = document.createElement("div");
    needle.className = "needle";
    needle.setAttribute("aria-hidden", "true");
    needle.style.cssText = "left:" + c[0] / W * 100 + "%;top:" + c[1] / H * 100 + "%;width:" + c[2] * 1.5 / W * 100 + "%";
    needle.innerHTML = '<svg viewBox="-50 -50 100 100"><path d="M0-46L4.5 0H-4.5Z" class="n"/><path d="M0 46L4.5 0H-4.5Z" class="s"/><circle r="3.6"/></svg>';
    map.insertBefore(needle, pins[0]);
  }
  function aim(pin) {
    if (!needle) return;
    var c = map.dataset.compass.split(",").map(Number), to = 0;
    if (pin) { // banner centre minus rose centre, in picture pixels (so the aspect ratio counts)
      var dx = parseFloat(pin.style.getPropertyValue("--x")) / 100 * W - c[0];
      var dy = parseFloat(pin.style.getPropertyValue("--y")) / 100 * H - c[1];
      to = Math.atan2(dx, -dy) * 180 / Math.PI;               // degrees clockwise from north
    }
    turn += ((to - turn + 540) % 360) - 180;                  // the short way round
    needle.style.setProperty("--a", turn + "deg");
    needle.classList.toggle("aim", !!pin);
  }

  /* 3. Banner and section heading light each other, and the needle follows. */
  pins.forEach(function (pin) {
    var section = document.querySelector(pin.getAttribute("href"));
    var head = section && (section.querySelector(".section-head, h2") || section.querySelector("h1"));
    function on() { pin.classList.add("lit"); if (head) head.classList.add("lit"); aim(pin); }
    function off() { pin.classList.remove("lit"); if (head) head.classList.remove("lit"); aim(null); }
    pin.addEventListener("mouseenter", on);
    pin.addEventListener("mouseleave", off);
    pin.addEventListener("focus", function () { if (pin.matches(":focus-visible")) on(); });
    pin.addEventListener("blur", off);
    if (head) {
      head.addEventListener("mouseenter", on);
      head.addEventListener("mouseleave", off);
    }
  });
})();
