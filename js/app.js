/* Comportamentos mínimos da landing page: contadores, tema e chips de filtro. */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Contadores em estilo odômetro ---------- */
  function buildOdometer(el) {
    var value = el.getAttribute("data-odo");
    var suffix = el.getAttribute("data-suffix") || "";
    var digitIndex = 0;
    el.textContent = "";
    el.setAttribute("role", "img");

    value.split("").forEach(function (ch) {
      if (/\d/.test(ch)) {
        var d = document.createElement("span");
        d.className = "odo-d";
        d.setAttribute("aria-hidden", "true");
        var r = document.createElement("span");
        r.className = "odo-r";
        r.dataset.target = ch;
        r.style.setProperty("--delay", (digitIndex * 0.07).toFixed(2) + "s");
        for (var n = 0; n <= 9; n++) {
          var s = document.createElement("span");
          s.textContent = n;
          r.appendChild(s);
        }
        d.appendChild(r);
        el.appendChild(d);
        digitIndex++;
      } else {
        var sep = document.createElement("span");
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = ch;
        el.appendChild(sep);
      }
    });

    if (suffix) {
      var sf = document.createElement("span");
      sf.setAttribute("aria-hidden", "true");
      sf.textContent = suffix;
      el.appendChild(sf);
    }
  }

  function roll(el) {
    el.querySelectorAll(".odo-r").forEach(function (r) {
      /* cada dígito tem 1.15em de altura */
      r.style.transform = "translateY(calc(" + (-Number(r.dataset.target)) + " * 1.15em))";
    });
  }

  var counters = document.querySelectorAll("[data-odo]");
  counters.forEach(buildOdometer);

  if (reduce || !("IntersectionObserver" in window)) {
    counters.forEach(roll);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { roll(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ---------- Tema claro/escuro ---------- */
  var root = document.documentElement;
  var btn = document.getElementById("tema");
  if (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("tema", next); } catch (e) {}
    });
  }

  /* ---------- Chips de filtro (prévia visual) ---------- */
  document.querySelectorAll(".filters .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var on = chip.getAttribute("aria-pressed") === "true";
      chip.setAttribute("aria-pressed", on ? "false" : "true");
    });
  });

  /* ---------- Revelação dos gráficos ao rolar ---------- */
  document.documentElement.classList.add("js");
  var charts = document.querySelectorAll(".chart");
  if (reduce || !("IntersectionObserver" in window)) {
    charts.forEach(function (c) { c.classList.add("in"); });
  } else {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); cio.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    charts.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Fluxo hexadecimal no fundo do hero (cobre a altura toda) ---------- */
  var hex = document.getElementById("hexbg");
  if (hex) {
    var HEX = "0123456789abcdef", grid = [], rows = 0, cols = 0, rt = null;
    var byte = function () { return HEX[(Math.random() * 16) | 0] + HEX[(Math.random() * 16) | 0]; };
    var paint = function () { hex.textContent = grid.map(function (row) { return row.join("  "); }).join("\n"); };
    var build = function () {
      var hero = hex.closest(".hero");
      var cs = getComputedStyle(hex);
      var lh = parseFloat(cs.lineHeight) || 21, fs = parseFloat(cs.fontSize) || 12;
      rows = Math.ceil(hero.offsetHeight / lh) + 1;
      cols = Math.ceil(hero.offsetWidth / (fs * 2.45)) + 1;
      grid = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) row.push(byte());
        grid.push(row);
      }
      paint();
    };
    build();
    window.addEventListener("load", build);
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 200); });
    if (!reduce) {
      setInterval(function () {
        for (var k = 0; k < 16; k++) grid[(Math.random() * rows) | 0][(Math.random() * cols) | 0] = byte();
        paint();
      }, 140);
    }
  }

  /* ---------- Terminal com logs sendo "digitados" ---------- */
  var term = document.getElementById("term");
  if (term && !reduce) {
    var lines = Array.prototype.slice.call(term.querySelectorAll("p"));
    var htmls = lines.map(function (l) { return l.innerHTML; });
    var texts = lines.map(function (l) { return l.textContent; });
    lines.forEach(function (l) { l.innerHTML = ""; l.style.visibility = "hidden"; });

    var caret = document.createElement("span");
    caret.className = "cursor";
    caret.setAttribute("aria-hidden", "true");

    function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

    function typeCmd(el, text) {
      el.style.visibility = "visible";
      el.appendChild(document.createTextNode(""));
      var node = el.firstChild;
      el.appendChild(caret);
      return new Promise(function (res) {
        var i = 0;
        (function step() {
          node.nodeValue = text.slice(0, ++i);
          if (i < text.length) setTimeout(step, 14 + Math.random() * 26); else res();
        })();
      });
    }

    function countUp(el, target, prefix) {
      el.style.visibility = "visible";
      return new Promise(function (res) {
        var start = null, dur = 1600;
        (function frame(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(target * eased).toLocaleString("pt-BR");
          if (p < 1) requestAnimationFrame(frame); else res();
        })(performance.now());
      });
    }

    function run() {
      var chain = Promise.resolve();
      lines.forEach(function (el, i) {
        chain = chain.then(function () {
          if (el.classList.contains("cmd")) {
            return wait(380).then(function () { return typeCmd(el, texts[i]); }).then(function () { caret.remove(); });
          }
          if (el.dataset.count) {
            el.className = "wait";
            return wait(120).then(function () { return countUp(el, Number(el.dataset.count), el.dataset.prefix || ""); })
              .then(function () { el.className = "ok"; el.innerHTML = htmls[i]; });
          }
          return wait(260).then(function () { el.innerHTML = htmls[i]; el.style.visibility = "visible"; });
        });
      });
      return chain.then(function () {
        var last = lines[lines.length - 1];
        last.appendChild(caret);
      });
    }

    if ("IntersectionObserver" in window) {
      var tio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { tio.disconnect(); run(); }
      }, { threshold: 0.3 });
      tio.observe(term);
    } else { run(); }
  }
})();
