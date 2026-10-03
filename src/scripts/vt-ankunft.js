/**
 * Seitenwechsel, Ankunft (C6): steht inline im <head> (Base.astro), weil
 * `pagereveal` vor dem ersten Zeichnen der neuen Seite kommt, also bevor
 * Modul-Skripte wie global.ts laufen. <link rel="expect" blocking="render">
 * hält das Zeichnen an, bis <main> gelesen ist; dann gibt es die Ziele schon.
 *
 * Die alte Seite (global.ts, pageswap) hat in sessionStorage "lj-vt" notiert:
 *  - { art: "hin", key: Zielpfad, namen }     Klick auf eine Karte: das passende
 *    Ziel hier (data-vt-ziel, data-vt-hauptfoto) übernimmt den Namen
 *  - { art: "zurueck", key: alter Pfad, namen } Zurück/Vor: die Karte, die auf die
 *    alte Seite verlinkt (data-vt-quelle, data-vt-foto), übernimmt ihn
 * Dazu morphen data-vt-statisch-Bausteine (Fotokopf, Seitentitel). Namen nur für
 * sichtbare Elemente, jeder Name nur einmal. Klassisches JS ohne Abhängigkeiten.
 */
(function () {
  addEventListener("pagereveal", function (e) {
    var spur = null;
    try {
      spur = JSON.parse(sessionStorage.getItem("lj-vt") || "null");
      sessionStorage.removeItem("lj-vt");
    } catch (err) {
      /* ohne sessionStorage: nur die statischen Morphs */
    }
    var vt = e.viewTransition;
    if (!vt) return;

    // Sicherheitsnetz: Während eines Übergangs nimmt die Seite keine Klicks an. Er endet
    // spätestens nach 1,2 s oder sofort bei der ersten Eingabe, nie blockiert er die Seite.
    var ende = function () {
      try {
        vt.skipTransition();
      } catch (err) {
        /* schon fertig */
      }
    };
    var timer = setTimeout(ende, 1200);
    var opts = { capture: true, once: true };
    addEventListener("pointerdown", ende, opts);
    addEventListener("keydown", ende, opts);

    var benannt = [];
    var vergeben = {};
    var sichtbar = function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    };
    var pfad = function (href) {
      try {
        return new URL(href, location.href).pathname;
      } catch (err) {
        return "";
      }
    };
    var benennen = function (el, name) {
      if (!name || vergeben[name] || el.style.viewTransitionName) return;
      vergeben[name] = true;
      el.style.viewTransitionName = name;
      benannt.push(el);
    };
    var alle = function (sel) {
      return Array.prototype.slice.call(document.querySelectorAll(sel));
    };
    var zielName = function (el) {
      return el.getAttribute("data-vt-ziel") || (el.hasAttribute("data-vt-hauptfoto") ? "produktfoto" : "") || el.getAttribute("data-vt-statisch") || "";
    };
    var quelleName = function (el) {
      return el.getAttribute("data-vt-quelle") || (el.hasAttribute("data-vt-foto") ? "produktfoto" : "");
    };

    if (spur && spur.art === "hin" && spur.key === location.pathname) {
      spur.namen.forEach(function (n) {
        var ziel = alle("[data-vt-ziel], [data-vt-hauptfoto], [data-vt-statisch]").filter(function (el) {
          return zielName(el) === n && sichtbar(el);
        })[0];
        if (ziel) benennen(ziel, n);
      });
    } else if (spur && spur.art === "zurueck") {
      spur.namen.forEach(function (n) {
        var quelle = alle("[data-vt-quelle], [data-vt-foto]").filter(function (el) {
          if (quelleName(el) !== n || !sichtbar(el)) return false;
          var karte = el.closest("[data-karte], [data-vt-karte]");
          var a = karte && karte.querySelector("a[href]");
          return !!a && pfad(a.href) === spur.key;
        })[0];
        if (quelle) benennen(quelle, n);
      });
    }
    alle("[data-vt-statisch]").forEach(function (el) {
      if (sichtbar(el)) benennen(el, el.getAttribute("data-vt-statisch"));
    });
    // zum Nachsehen in den Entwicklerwerkzeugen
    window.ljVt = { namen: Object.keys(vergeben), spur: spur };

    var aufraeumen = function () {
      clearTimeout(timer);
      removeEventListener("pointerdown", ende, opts);
      removeEventListener("keydown", ende, opts);
      benannt.forEach(function (el) {
        el.style.viewTransitionName = "";
      });
    };
    // Bricht der Browser den Übergang ab (etwa weil die Seite schon gezeigt wird),
    // lehnen ready und finished ab; das ist kein Fehler und wird hier abgefangen.
    vt.ready.catch(function () {});
    vt.finished.then(aufraeumen, aufraeumen);
  });
})();
