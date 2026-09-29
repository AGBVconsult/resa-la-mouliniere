/* ==========================================================================
   Interactions de la maquette. JavaScript natif, sans dépendance.
   Tout le mouvement passe par transform / opacity et respecte
   prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileMq = window.matchMedia("(max-width: 1023px)");
  var reduced = function () { return reduceMq.matches; };

  var LOCALES = { fr: "fr-BE", nl: "nl-BE", en: "en-GB", de: "de-DE", it: "it-IT", es: "es-ES" };
  var WIDGET = "https://app.lamouliniere.be/widget";
  var state = { lang: "fr" };

  /* ---------- Texte ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function frTypo(s) { return s.replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« "); }
  function localize(s) { return state.lang === "fr" ? frTypo(s) : s; }
  function tr(key, vars) {
    var entry = I18N[key];
    if (!entry) return key;
    var s = entry[state.lang] || entry.fr;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return localize(s);
  }
  function pick(obj) { return localize(obj[state.lang] || obj.fr); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- Prix ---------- */
  function fracFor(n) { return Math.round(n) === n ? 0 : 2; }
  function nf(opts) { return new Intl.NumberFormat(LOCALES[state.lang], opts); }
  function money(n) {
    var f = fracFor(n);
    return nf({ style: "currency", currency: "EUR", minimumFractionDigits: f, maximumFractionDigits: f }).format(n);
  }
  function num(n) { var f = fracFor(n); return nf({ minimumFractionDigits: f, maximumFractionDigits: f }).format(n); }
  function moneyTpl() { return money(7).replace("7", "{n}"); }
  function priceText(p) {
    if (p == null) return "";
    if (Array.isArray(p)) return moneyTpl().replace("{n}", p.map(num).join(" / "));
    return money(p);
  }
  function supText(s) { return "+" + money(s); }
  function moneyHTML(n, two) {
    var f = two ? 2 : fracFor(n);
    return nf({ style: "currency", currency: "EUR", minimumFractionDigits: f, maximumFractionDigits: f }).formatToParts(n).map(function (p) {
      if (p.type === "currency") return '<span class="cur">' + p.value + "</span>";
      return p.type === "literal" ? "" : esc(p.value);
    }).join("");
  }
  function currencyFirst() { return /^[^\d]/.test(money(1).trim()); }

  function sec(id) {
    for (var i = 0; i < MENU.sections.length; i++) if (MENU.sections[i].id === id) return MENU.sections[i];
    return null;
  }

  /* ---------- Préparations ---------- */
  var NATURE = { n: t6("Nature", "Natuur", "Plain", "Natur", "Al naturale", "Al natural"), base: MENU.moules.nature };
  function tagsFor(item, fam) {
    if (item.noTags) return null;
    var s = (item.n.fr + " " + (item.i ? item.i.fr : "")).toLowerCase();
    var t = new Set();
    if (/(^|[\s,(])ail([\s,)]|$)/.test(s)) t.add("ail");
    if (/crème/.test(s)) t.add("creme");
    if (/(^|[\s,(])vin([\s,)]|$)/.test(s)) t.add("vin");
    if (/curry/.test(s)) t.add("curry");
    if (/tomat/.test(s)) t.add("tomate");
    if (/pili|piquante/.test(s)) t.add("epice");
    if (fam === "fromages") t.add("fromage");
    if (/aneth|estragon|fenouil|thym|basilic/.test(s)) t.add("herbes");
    if (/champignon/.test(s)) t.add("champignons");
    if (/crevette|saumon|bisque/.test(s)) t.add("mer");
    if (!t.has("creme")) t.add("sanscreme");
    return t;
  }
  var PREPS = [];
  MENU.families.forEach(function (f) {
    var items = f.id === "tradition" ? [NATURE].concat(f.items) : f.items;
    items.forEach(function (it, i) { PREPS.push({ id: f.id + "-" + i, fam: f.id, item: it, tags: tagsFor(it, f.id) }); });
  });
  var FILTERS = ["ail", "creme", "vin", "curry", "tomate", "epice", "fromage", "herbes", "champignons", "mer", "sanscreme"];
  var ex = { tab: "all", filters: new Set(), selected: null, addons: new Set(), light: false, total: 0 };

  function findPrep(id) {
    for (var i = 0; i < PREPS.length; i++) if (PREPS[i].id === id) return PREPS[i];
    return null;
  }
  function familyName(id) {
    for (var i = 0; i < MENU.families.length; i++) if (MENU.families[i].id === id) return pick(MENU.families[i].name);
    return "";
  }
  function matches(p, tab, filters) {
    if (tab !== "all" && p.fam !== tab) return false;
    if (!filters.size) return true;
    if (!p.tags) return false;
    var ok = true;
    filters.forEach(function (f) { if (!p.tags.has(f)) ok = false; });
    return ok;
  }
  function visiblePreps() { return PREPS.filter(function (p) { return matches(p, ex.tab, ex.filters); }); }

  /* ---------- Onglets ---------- */
  function renderTabs() {
    var wrap = $("[data-tabs]");
    wrap.innerHTML = '<span class="tabs__pill" aria-hidden="true"></span>';
    var tabs = [{ id: "all", name: tr("carte.all"), count: PREPS.length }].concat(MENU.families.map(function (f) {
      return { id: f.id, name: pick(f.name), count: PREPS.filter(function (p) { return p.fam === f.id; }).length };
    }));
    tabs.forEach(function (t) {
      var b = doc.createElement("button");
      b.type = "button";
      b.className = "tab";
      b.setAttribute("role", "tab");
      b.setAttribute("data-tab", t.id);
      b.setAttribute("aria-controls", "carte-liste");
      b.setAttribute("aria-selected", String(ex.tab === t.id));
      b.tabIndex = ex.tab === t.id ? 0 : -1;
      b.innerHTML = esc(t.name) + " <small>" + t.count + "</small>";
      wrap.appendChild(b);
    });
    requestAnimationFrame(function () { placePill(false); });
  }
  function placePill(animate) {
    var wrap = $("[data-tabs]");
    var pill = $(".tabs__pill", wrap);
    var sel = $('.tab[aria-selected="true"]', wrap);
    if (!pill || !sel) return;
    var before = pill.getBoundingClientRect();
    pill.style.width = sel.offsetWidth + "px";
    pill.style.height = sel.offsetHeight + "px";
    pill.style.left = sel.offsetLeft + "px";
    pill.style.top = sel.offsetTop + "px";
    if (!animate || reduced() || !before.width || !pill.animate) return;
    var after = pill.getBoundingClientRect();
    pill.animate(
      [
        { transform: "translate(" + (before.left - after.left) + "px," + (before.top - after.top) + "px) scaleX(" + before.width / after.width + ")" },
        { transform: "none" }
      ],
      { duration: 480, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }
    );
  }
  function selectTab(id, focus) {
    ex.tab = id;
    $$("[data-tabs] .tab").forEach(function (b) {
      var on = b.getAttribute("data-tab") === id;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    placePill(true);
    renderFilters();
    renderList();
  }

  /* ---------- Filtres ---------- */
  function renderFilters() {
    var wrap = $("[data-filters]");
    wrap.innerHTML = "";
    FILTERS.forEach(function (f) {
      var on = ex.filters.has(f);
      var test = new Set(ex.filters);
      test.add(f);
      var possible = PREPS.some(function (p) { return matches(p, ex.tab, test); });
      var b = doc.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("data-filter", f);
      b.setAttribute("aria-pressed", String(on));
      if (!possible && !on) b.disabled = true;
      b.innerHTML = (on ? '<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>' : "") + esc(tr("f." + f));
      wrap.appendChild(b);
    });
  }

  /* ---------- Liste ---------- */
  function renderList() {
    var list = $("[data-list]");
    var vis = visiblePreps();
    var html = "";
    var n = 0;
    MENU.families.forEach(function (f) {
      var items = vis.filter(function (p) { return p.fam === f.id; });
      if (!items.length) return;
      html += '<section class="family"><h3 class="family__title">' + esc(pick(f.name)) + " <small>" + items.length + "</small>" +
        (f.sup ? '<span class="sup-note">' + esc(supText(f.sup)) + "</span>" : "") + '</h3><div class="family__items">';
      items.forEach(function (p) {
        var it = p.item;
        var right = it.base ? money(it.base) : it.s && f.id !== "fromages" ? supText(it.s) : "";
        html += '<button type="button" class="prep" data-id="' + p.id + '" aria-pressed="' + (ex.selected === p.id) + '" style="--n:' + n++ + '">' +
          '<span class="prep__name">' + esc(pick(it.n)) + "</span>" +
          '<span class="prep__sup">' + esc(right) + "</span>" +
          (it.i ? '<span class="prep__ing">' + esc(pick(it.i)) + "</span>" : "") +
          "</button>";
      });
      html += "</div></section>";
    });
    list.innerHTML = html;
    $("[data-empty]").hidden = vis.length > 0;
    $("[data-count]").textContent = vis.length === 1 ? tr("carte.count1") : tr("carte.count", { n: vis.length });
  }

  /* ---------- Votre casserole ---------- */
  function pairingFor(p) {
    var t = p.tags || new Set();
    if (t.has("mer")) return PAIRINGS.seafood;
    if (p.fam === "fromages") return PAIRINGS.cheese;
    if (p.fam === "caractere") return PAIRINGS.spirit;
    if (p.fam === "exotique" || t.has("epice") || t.has("curry")) return PAIRINGS.spicy;
    if (t.has("tomate")) return PAIRINGS.tomato;
    if (t.has("creme")) return PAIRINGS.house;
    return PAIRINGS.classic;
  }
  function formulaById(id) {
    var rows = sec("formules").rows;
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
    return null;
  }
  function addonById(key) {
    var parts = key.split("-");
    var g = MENU.addons[+parts[0]];
    return { s: g.s, name: g.items[+parts[1]] };
  }
  function renderCasserole(pop) {
    var p = ex.selected ? findPrep(ex.selected) : null;
    $("[data-cas-empty]").hidden = !!p;
    $("[data-cas-body]").hidden = !p;
    if (!p) return;
    var it = p.item;
    var base = it.base || MENU.moules.price;
    var total = base + (it.s || 0);

    $("[data-cas-name]").textContent = pick(it.n);
    $("[data-cas-ing]").textContent = it.i ? pick(it.i) : familyName(p.fam);

    var lines = '<div><dt>' + esc(it.base ? pick(it.n) : pick(MENU.moules.title)) + "</dt><dd>" + esc(money(base)) + "</dd></div>";
    if (it.s) lines += "<div><dt>" + esc(tr("cas.supplement")) + "</dt><dd>" + esc(supText(it.s)) + "</dd></div>";
    ex.addons.forEach(function (key) {
      var a = addonById(key);
      total += a.s;
      lines += "<div><dt>+ " + esc(pick(a.name)) + "</dt><dd>" + esc(supText(a.s)) + "</dd></div>";
    });
    if (ex.light) lines += "<div><dt>" + esc(tr("cas.lightLine")) + "</dt><dd>" + esc(tr("cas.included")) + "</dd></div>";
    $("[data-cas-lines]").innerHTML = lines;

    var hasCream = p.tags && p.tags.has("creme");
    $("[data-cas-light-wrap]").hidden = !hasCream;
    $("[data-cas-light]").checked = ex.light && hasCream;

    var addons = "";
    MENU.addons.forEach(function (g, gi) {
      addons += '<div class="addon-group"><p>' + esc(supText(g.s)) + "</p><div>";
      g.items.forEach(function (name, ii) {
        var key = gi + "-" + ii;
        addons += '<button type="button" class="chip" data-addon="' + key + '" aria-pressed="' + ex.addons.has(key) + '">' + esc(pick(name)) + "</button>";
      });
      addons += "</div></div>";
    });
    $("[data-cas-addons]").innerHTML = addons;

    var pair = pairingFor(p);
    $("[data-cas-wine]").textContent = pair.wine + " (" + money(pair.price) + " " + tr("cas.bottle") + ")";
    var formula = pair.formula ? formulaById(pair.formula) : null;
    $("[data-cas-formula]").textContent = formula ? tr("cas.formula", { name: pick(formula.n), price: money(formula.p) }) : "";
    $("[data-cas-fries]").textContent = tr("cas.fries", { s: money(4), l: money(6) });

    animateTotal(total);
    if (pop && !reduced()) {
      var body = $("[data-cas-body]");
      body.classList.remove("is-pop");
      void body.offsetWidth;
      body.classList.add("is-pop");
    }
  }
  var totalRaf = 0;
  function animateTotal(to) {
    var el = $("[data-cas-total]");
    var from = ex.total || to;
    ex.total = to;
    cancelAnimationFrame(totalRaf);
    if (reduced() || from === to) { el.innerHTML = moneyHTML(to); return; }
    var start = performance.now();
    var dur = 420;
    (function frame(now) {
      var k = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      var v = Math.round((from + (to - from) * e) * 100) / 100;
      el.innerHTML = moneyHTML(v, true);
      if (k < 1) totalRaf = requestAnimationFrame(frame);
      else el.innerHTML = moneyHTML(to);
    })(start);
  }
  function selectPrep(id) {
    ex.selected = id;
    ex.addons.clear();
    ex.light = false;
    $$("[data-list] .prep").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-id") === id)); });
    renderCasserole(true);
    if (mobileMq.matches) openSheet();
  }
  function openSheet() {
    $("[data-casserole]").classList.add("is-open");
    root.classList.add("sheet-open");
  }
  function closeSheet() {
    $("[data-casserole]").classList.remove("is-open");
    root.classList.remove("sheet-open");
  }
  function surprise() {
    var vis = visiblePreps();
    if (!vis.length) { ex.filters.clear(); renderFilters(); renderList(); vis = visiblePreps(); }
    var target = vis[Math.floor(Math.random() * vis.length)];
    if (reduced()) { selectPrep(target.id); return; }
    var btns = $$("[data-list] .prep");
    var steps = 9;
    var delay = 55;
    var last = null;
    (function tick() {
      if (last) last.classList.remove("is-flicker");
      if (steps-- <= 0) {
        selectPrep(target.id);
        var el = $('[data-list] .prep[data-id="' + target.id + '"]');
        if (el && !mobileMq.matches) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      last = btns[Math.floor(Math.random() * btns.length)];
      if (last) last.classList.add("is-flicker");
      delay *= 1.2;
      setTimeout(tick, delay);
    })();
  }

  /* ---------- Bento et textes de la carte ---------- */
  function menuText(k) {
    switch (k) {
      case "title": return pick(MENU.moules.title);
      case "tagline": return pick(MENU.moules.tagline);
      case "nature": return pick(MENU.moules.natureLabel);
      case "light": return pick(MENU.moules.light);
      case "merTitle": return pick(sec("menus").rows[0].n);
      case "kidsTitle": return pick(sec("enfants").name);
      case "tapasTitle": return pick(sec("tapas").name);
      case "tapasNote": return pick(sec("tapas").note);
      case "payLine": return pick(MENU.footer[1]);
      case "billLine": return pick(MENU.footer[0]);
    }
    return "";
  }
  function li(name, price, desc) {
    return '<li><span class="pl-name">' + esc(name) + '</span><span class="pl-price">' + esc(price) + "</span>" +
      (desc ? '<span class="pl-desc">' + esc(desc) + "</span>" : "") + "</li>";
  }
  function renderBento() {
    var f = sec("formules");
    var duo = sec("menus").rows[1];
    var html = f.rows.map(function (r) { return li(pick(r.n), money(r.p), pick(f.common) + " " + pick(r.d)); }).join("");
    html += li(pick(duo.n), money(duo.p), duo.list.map(pick).join(", "));
    $("[data-list-formules]").innerHTML = html;

    var mer = sec("menus").rows[0];
    $("[data-price-mer]").innerHTML = moneyHTML(mer.p);
    $("[data-list-mer]").innerHTML = mer.list.map(function (x) { return "<li>" + esc(pick(x)) + "</li>"; }).join("");

    $("[data-list-plats]").innerHTML = sec("plats").rows.map(function (r) { return li(pick(r.n), priceText(r.p)); }).join("");
    $("[data-list-kids]").innerHTML = sec("enfants").rows.map(function (r) { return li(pick(r.n), priceText(r.p)); }).join("");
    $("[data-list-tapas]").innerHTML = sec("tapas").rows.map(function (r) { return li(pick(r.n), priceText(r.p)); }).join("");
  }
  function renderPrices() {
    var el = $("[data-price-main]");
    var wrap = el.parentNode;
    var cur = $(".carte__price-cur", wrap);
    el.textContent = nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(MENU.moules.price);
    if (currencyFirst()) wrap.insertBefore(cur, el); else wrap.appendChild(cur);
    $("[data-price-nature]").textContent = money(MENU.moules.nature);
  }

  /* ---------- Carte complète ---------- */
  function fmRow(name, price, desc) {
    return '<div class="fm-row"><b>' + esc(name) + "</b><span>" + esc(price || "") + "</span>" + (desc ? "<i>" + esc(desc) + "</i>" : "") + "</div>";
  }
  function renderFullMenu() {
    var h = '<section class="fm-section"><h3>' + esc(pick(MENU.moules.title)) + "<span>" + esc(money(MENU.moules.price)) + "</span></h3>";
    h += '<p class="fm-tagline">' + esc(pick(MENU.moules.tagline)) + "</p>";
    h += fmRow(pick(MENU.moules.natureLabel), money(MENU.moules.nature));
    MENU.families.forEach(function (f) {
      h += "<h4>" + esc(pick(f.name)) + (f.sup ? " (" + esc(supText(f.sup)) + ")" : "") + "</h4>";
      f.items.forEach(function (it) { h += fmRow(pick(it.n), it.s && !f.sup ? supText(it.s) : "", it.i ? pick(it.i) : ""); });
    });
    h += "<h4>" + esc(tr("cas.custom")) + "</h4>";
    MENU.addons.forEach(function (g) { h += fmRow(g.items.map(pick).join(", "), supText(g.s)); });
    h += '<p class="fm-note">' + esc(pick(MENU.moules.light)) + "</p></section>";

    ["formules", "menus", "tapas", "plats", "enfants", "desserts", "cafes", "aperitifs", "softs", "bieres", "vins", "extra"].forEach(function (id) {
      var s = sec(id);
      h += '<section class="fm-section"><h3>' + esc(pick(s.name)) + "</h3>";
      s.rows.forEach(function (r) {
        if (r.sub) { h += "<h4>" + esc(pick(r.sub)) + "</h4>"; return; }
        var desc = "";
        if (r.d) desc = (s.common ? pick(s.common) + " " : "") + pick(r.d);
        if (r.list) desc = r.list.map(pick).join(", ");
        var price = r.p != null ? priceText(r.p) : r.s ? supText(r.s) : "";
        if (r.w) {
          var units = MENU.wineUnits[state.lang] || MENU.wineUnits.fr;
          desc = r.w.map(function (v, i) { return v == null ? null : units[i] + " " + money(v); }).filter(Boolean).join(" / ");
        }
        h += fmRow(pick(r.n), price, desc);
      });
      if (s.note) h += '<p class="fm-note">' + esc(pick(s.note)) + "</p>";
      h += "</section>";
    });
    h += '<div class="fm-foot">' + MENU.footer.map(function (x) { return "<span>" + esc(pick(x)) + "</span>"; }).join("") + "</div>";
    $("[data-full-body]").innerHTML = h;
  }

  /* ---------- Réservation ---------- */
  // Exemple : saison standard (lun, mar, ven soir, sam, dim). À brancher sur les disponibilités réelles.
  var SCHEDULE = { 0: ["lunch", "dinner"], 1: ["lunch", "dinner"], 2: ["lunch", "dinner"], 3: [], 4: [], 5: ["dinner"], 6: ["lunch", "dinner"] };
  var SLOTS = { lunch: ["12:00", "12:30", "13:00"], dinner: ["18:00", "18:30", "19:00"] };
  var bk = { guests: 2, date: null, service: null, time: null, step: 1 };

  function days() {
    var out = [];
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    for (var i = 0; i < 14; i++) { var x = new Date(d); x.setDate(d.getDate() + i); out.push(x); }
    return out;
  }
  function isoOf(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dateOf(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function servicesOn(iso) { return SCHEDULE[dateOf(iso).getDay()] || []; }
  function slotPassed(iso, time) {
    var now = new Date();
    if (iso !== isoOf(now)) return false;
    var hm = time.split(":");
    var t = new Date(now);
    t.setHours(+hm[0], +hm[1], 0, 0);
    return t.getTime() - now.getTime() < 30 * 60000;
  }
  function openSlots(iso, service) { return SLOTS[service].filter(function (t) { return !slotPassed(iso, t); }); }
  function firstOpenDay() {
    var list = days();
    for (var i = 0; i < list.length; i++) {
      var iso = isoOf(list[i]);
      var ok = servicesOn(iso).some(function (s) { return openSlots(iso, s).length; });
      if (ok) return iso;
    }
    return null;
  }
  function renderGuests() {
    var out = $("[data-guests-out]");
    out.textContent = bk.guests === 1 ? tr("book.person") : tr("book.people", { n: bk.guests });
    $("[data-guests-minus]").disabled = bk.guests <= 1;
    $("[data-guests-plus]").disabled = bk.guests >= 20;
    $("[data-note-big]").hidden = !(bk.guests >= 5 && bk.guests < 16);
    $("[data-note-group]").hidden = bk.guests < 16;
  }
  function renderDates() {
    var wrap = $("[data-dates]");
    var loc = LOCALES[state.lang];
    var wd = new Intl.DateTimeFormat(loc, { weekday: "short" });
    var mo = new Intl.DateTimeFormat(loc, { month: "short" });
    wrap.innerHTML = days().map(function (d, i) {
      var iso = isoOf(d);
      var open = servicesOn(iso).some(function (s) { return openSlots(iso, s).length; });
      var top = i === 0 ? tr("book.today") : i === 1 ? tr("book.tomorrow") : wd.format(d).replace(".", "");
      var bottom = open ? mo.format(d).replace(".", "") : tr("book.closed");
      return '<button type="button" class="date" data-date="' + iso + '" aria-pressed="' + (bk.date === iso) + '"' + (open ? "" : " disabled") + ">" +
        "<small>" + esc(top) + "</small><strong>" + d.getDate() + "</strong><span>" + esc(bottom) + "</span></button>";
    }).join("");
  }
  function renderServices() {
    $$("[data-service]").forEach(function (b) {
      var s = b.getAttribute("data-service");
      var ok = !!bk.date && servicesOn(bk.date).indexOf(s) >= 0 && openSlots(bk.date, s).length > 0;
      b.disabled = !ok;
      b.setAttribute("aria-pressed", String(bk.service === s));
    });
  }
  function renderSlots() {
    var wrap = $("[data-slots]");
    if (!bk.date || !bk.service) { wrap.innerHTML = '<p class="slots__empty">' + esc(tr("book.pickFirst")) + "</p>"; return; }
    var list = openSlots(bk.date, bk.service);
    if (!list.length) { wrap.innerHTML = '<p class="slots__empty">' + esc(tr("book.noSlot")) + "</p>"; return; }
    wrap.innerHTML = list.map(function (t, i) {
      return '<button type="button" class="slot" data-time="' + t + '" aria-pressed="' + (bk.time === t) + '" style="--n:' + i + '">' + t + "</button>";
    }).join("");
  }
  function longDate(iso) {
    return cap(new Intl.DateTimeFormat(LOCALES[state.lang], { weekday: "long", day: "numeric", month: "long" }).format(dateOf(iso)));
  }
  function peopleText() { return bk.guests === 1 ? tr("book.person") : tr("book.people", { n: bk.guests }); }
  function renderSummary() {
    var complete = bk.date && bk.service && bk.time;
    $("[data-summary]").textContent = complete ? tr("book.at", { date: longDate(bk.date), time: bk.time }) + ", " + peopleText() : tr("book.summaryEmpty");
    $("[data-continue]").disabled = !complete || bk.guests >= 16;
  }
  function renderBooking() { renderGuests(); renderDates(); renderServices(); renderSlots(); renderSummary(); }
  function setStep(n) {
    bk.step = n;
    $('[data-step="1"]').hidden = n !== 1;
    $('[data-step="2"]').hidden = n !== 2;
    $(".drawer__foot").hidden = n !== 1;
    if (n === 2) {
      $("[data-recap]").innerHTML = esc(tr("book.at", { date: longDate(bk.date), time: bk.time })) + "<span>" + esc(peopleText()) + "</span>";
      var link = $("[data-widget-link]");
      link.focus();
    }
  }
  function openDrawer() {
    var drawer = $("[data-drawer]");
    if (drawer.open) return;
    closeSheet();
    if (!bk.date) {
      bk.date = firstOpenDay();
      var s = bk.date ? servicesOn(bk.date).filter(function (x) { return openSlots(bk.date, x).length; }) : [];
      bk.service = s.length === 1 ? s[0] : null;
    }
    setStep(1);
    renderBooking();
    drawer.showModal();
    root.classList.add("drawer-open");
  }
  function closeDrawer() {
    var drawer = $("[data-drawer]");
    if (!drawer.open) return;
    var done = function () { drawer.classList.remove("is-closing"); drawer.close(); root.classList.remove("drawer-open"); };
    if (reduced()) { done(); return; }
    drawer.classList.add("is-closing");
    setTimeout(done, 280);
  }

  /* ---------- Avis ---------- */
  var q = { i: 0, timer: 0, hover: false, manual: false };
  function showQuote(i) {
    var quotes = $$(".quote");
    q.i = (i + quotes.length) % quotes.length;
    quotes.forEach(function (el, k) { el.classList.toggle("is-active", k === q.i); el.setAttribute("aria-hidden", String(k !== q.i)); });
    $$("[data-q-dots] button").forEach(function (b, k) { b.setAttribute("aria-current", String(k === q.i)); });
  }
  function renderQuoteDots() {
    var quotes = $$(".quote");
    $("[data-q-dots]").innerHTML = quotes.map(function (_, k) {
      return '<button type="button" data-q-dot="' + k + '" aria-label="' + esc(tr("avis.dot", { n: k + 1 })) + '" aria-current="' + (k === q.i) + '"></button>';
    }).join("");
    var pause = $("[data-q-pause]");
    pause.setAttribute("aria-label", tr(q.manual ? "avis.play" : "avis.pause"));
  }
  function quoteLoop() {
    clearInterval(q.timer);
    if (q.manual || q.hover || reduced()) return;
    q.timer = setInterval(function () { showQuote(q.i + 1); }, 6500);
  }

  /* ---------- Notes 60/40 ---------- */
  function decorateNotes() {
    $$(".note-tag").forEach(function (n) { n.remove(); });
    if (!root.classList.contains("show-notes")) return;
    $$("[data-note]").forEach(function (el) {
      var v = el.getAttribute("data-note");
      var k = v.slice(0, 2);
      if (getComputedStyle(el).position === "static") el.classList.add("note-rel");
      var tag = doc.createElement("span");
      tag.className = "note-tag";
      tag.setAttribute("data-k", k);
      tag.setAttribute("aria-hidden", "true");
      tag.innerHTML = "<b>" + k + "</b>" + esc(v.slice(3));
      el.appendChild(tag);
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer = 0;
  function toast(msg) {
    var t = $("[data-toast]");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2400);
  }

  /* ---------- Langue ---------- */
  function applyTexts() {
    root.lang = state.lang;
    $$("[data-i18n]").forEach(function (el) { el.textContent = tr(el.getAttribute("data-i18n")); });
    $$("[data-i18n-html]").forEach(function (el) { el.innerHTML = tr(el.getAttribute("data-i18n-html")); });
    $$("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        el.setAttribute(p[0].trim(), tr(p[1].trim()));
      });
    });
    $$("[data-menu-text]").forEach(function (el) { el.textContent = menuText(el.getAttribute("data-menu-text")); });
  }
  function splitWords() {
    var el = $("[data-words]");
    var words = el.textContent.split(/ +/).filter(Boolean);
    el.innerHTML = words.map(function (w, i) { return '<span class="w" style="--i:' + i + '">' + esc(w) + "</span>"; }).join(" ");
  }
  // Le titre du héros tient sur deux lignes sur grand écran, quelle que soit la langue
  function fitHeroTitle() {
    var h = $(".hero__title");
    var k = 1;
    h.style.setProperty("--k", "1");
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    var lines = function () { return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)); };
    while (lines() > 2 && k > 0.66) {
      k -= 0.04;
      h.style.setProperty("--k", k.toFixed(2));
    }
  }
  function updateLinks() {
    $$("[data-widget-link]").forEach(function (a) { a.href = WIDGET + "?lang=" + state.lang; });
    $$("[data-group-link]").forEach(function (a) { a.href = WIDGET + "/group-request?lang=" + state.lang; });
  }
  function updateLangUI() {
    $("[data-lang-current]").textContent = state.lang.toUpperCase();
    $$("[data-lang-opt]").forEach(function (o) { o.setAttribute("aria-selected", String(o.getAttribute("data-lang-opt") === state.lang)); });
    var burger = $("[data-burger]");
    burger.setAttribute("aria-label", tr(burger.getAttribute("aria-expanded") === "true" ? "nav.close" : "nav.open"));
  }
  function setLang(l) {
    state.lang = LANGS.indexOf(l) >= 0 ? l : "fr";
    try { localStorage.setItem("lm-lang", state.lang); } catch (e) { /* stockage indisponible */ }
    applyTexts();
    splitWords();
    fitHeroTitle();
    renderPrices();
    renderBento();
    renderTabs();
    renderFilters();
    renderList();
    renderCasserole(false);
    renderBooking();
    renderQuoteDots();
    if ($("[data-fullmenu]").open) renderFullMenu();
    updateLangUI();
    updateLinks();
    decorateNotes();
  }

  /* ---------- Évènements ---------- */
  doc.addEventListener("click", function (e) {
    var t = e.target;
    var el;

    if ((el = t.closest("[data-book]"))) { openDrawer(); return; }
    if ((el = t.closest("[data-tabs] .tab"))) { selectTab(el.getAttribute("data-tab")); return; }
    if ((el = t.closest("[data-filter]"))) {
      var f = el.getAttribute("data-filter");
      if (ex.filters.has(f)) ex.filters.delete(f); else ex.filters.add(f);
      renderFilters();
      renderList();
      var again = $('[data-filter="' + f + '"]');
      if (again) again.focus();
      return;
    }
    if (t.closest("[data-clear]")) { ex.filters.clear(); renderFilters(); renderList(); return; }
    if ((el = t.closest("[data-list] .prep"))) { selectPrep(el.getAttribute("data-id")); return; }
    if (t.closest("[data-surprise]")) { surprise(); return; }
    if ((el = t.closest("[data-addon]"))) {
      var key = el.getAttribute("data-addon");
      if (ex.addons.has(key)) ex.addons.delete(key); else ex.addons.add(key);
      renderCasserole(false);
      var btn = $('[data-addon="' + key + '"]');
      if (btn) btn.focus();
      return;
    }
    if (t.closest("[data-cas-close]")) { closeSheet(); return; }
    if (t.closest("[data-open-full]")) { renderFullMenu(); $("[data-fullmenu]").showModal(); return; }
    if (t.closest("[data-full-close]")) { $("[data-fullmenu]").close(); return; }
    if (t.closest("[data-print]")) { window.print(); return; }
    if (t === $("[data-fullmenu]")) { $("[data-fullmenu]").close(); return; }

    if (t.closest("[data-drawer-close]")) { closeDrawer(); return; }
    if (t === $("[data-drawer]")) { closeDrawer(); return; }
    if (t.closest("[data-guests-minus]")) { bk.guests = Math.max(1, bk.guests - 1); bumpGuests(); return; }
    if (t.closest("[data-guests-plus]")) { bk.guests = Math.min(20, bk.guests + 1); bumpGuests(); return; }
    if ((el = t.closest("[data-date]"))) {
      bk.date = el.getAttribute("data-date");
      var avail = servicesOn(bk.date).filter(function (s) { return openSlots(bk.date, s).length; });
      if (avail.indexOf(bk.service) < 0) bk.service = avail.length === 1 ? avail[0] : null;
      bk.time = null;
      renderDates(); renderServices(); renderSlots(); renderSummary();
      var d = $('[data-date="' + bk.date + '"]');
      if (d) d.focus();
      return;
    }
    if ((el = t.closest("[data-service]"))) {
      bk.service = el.getAttribute("data-service");
      bk.time = null;
      renderServices(); renderSlots(); renderSummary();
      return;
    }
    if ((el = t.closest("[data-time]"))) {
      bk.time = el.getAttribute("data-time");
      $$("[data-slots] .slot").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-time") === bk.time)); });
      renderSummary();
      return;
    }
    if (t.closest("[data-continue]")) { setStep(2); return; }
    if (t.closest("[data-step-back]")) { setStep(1); return; }

    if (t.closest("[data-q-prev]")) { showQuote(q.i - 1); quoteLoop(); return; }
    if (t.closest("[data-q-next]")) { showQuote(q.i + 1); quoteLoop(); return; }
    if ((el = t.closest("[data-q-dot]"))) { showQuote(+el.getAttribute("data-q-dot")); quoteLoop(); return; }
    if ((el = t.closest("[data-q-pause]"))) {
      q.manual = !q.manual;
      $("use", el).setAttribute("href", q.manual ? "#i-play" : "#i-pause");
      el.setAttribute("aria-label", tr(q.manual ? "avis.play" : "avis.pause"));
      quoteLoop();
      return;
    }

    if (t.closest("[data-soon]")) { toast(tr("toast.soon")); return; }
    if ((el = t.closest("[data-theme-set]"))) {
      var mode = el.getAttribute("data-theme-set");
      if (mode === "auto") delete root.dataset.theme; else root.dataset.theme = mode;
      try { localStorage.setItem("lm-theme", mode); } catch (err) { /* stockage indisponible */ }
      $$("[data-theme-set]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === el)); });
      return;
    }
    if ((el = t.closest("[data-review-toggle]"))) {
      var on = !root.classList.contains("show-notes");
      root.classList.toggle("show-notes", on);
      el.setAttribute("aria-expanded", String(on));
      $("[data-review-panel]").hidden = !on;
      decorateNotes();
      return;
    }
  });

  function bumpGuests() {
    renderGuests();
    renderSummary();
    var out = $("[data-guests-out]");
    if (reduced()) return;
    out.classList.remove("is-bump");
    void out.offsetWidth;
    out.classList.add("is-bump");
  }

  $("[data-cas-light]").addEventListener("change", function (e) { ex.light = e.target.checked; renderCasserole(false); });

  // Onglets au clavier
  $("[data-tabs]").addEventListener("keydown", function (e) {
    var tabs = $$("[data-tabs] .tab");
    var i = tabs.indexOf(doc.activeElement);
    if (i < 0) return;
    var n = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = tabs.length - 1;
    if (n === null) return;
    e.preventDefault();
    selectTab(tabs[n].getAttribute("data-tab"), true);
  });

  // Dialogues : Échap anime la fermeture
  $("[data-drawer]").addEventListener("cancel", function (e) { e.preventDefault(); closeDrawer(); });

  // Langue
  var langBtn = $("[data-lang-btn]");
  var langList = $("[data-lang-list]");
  function openLang(open) {
    langList.hidden = !open;
    langBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      var cur = $('[data-lang-opt="' + state.lang + '"]');
      $$("[data-lang-opt]").forEach(function (o) { o.classList.toggle("is-focus", o === cur); o.tabIndex = -1; });
      if (cur) { cur.tabIndex = 0; cur.focus(); }
    }
  }
  langBtn.addEventListener("click", function () { openLang(langList.hidden); });
  langList.addEventListener("click", function (e) {
    var o = e.target.closest("[data-lang-opt]");
    if (!o) return;
    setLang(o.getAttribute("data-lang-opt"));
    openLang(false);
    langBtn.focus();
  });
  langList.addEventListener("keydown", function (e) {
    var opts = $$("[data-lang-opt]");
    var i = opts.indexOf(doc.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      var n = (i + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
      opts.forEach(function (o) { o.classList.remove("is-focus"); o.tabIndex = -1; });
      opts[n].classList.add("is-focus");
      opts[n].tabIndex = 0;
      opts[n].focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (i >= 0) { setLang(opts[i].getAttribute("data-lang-opt")); openLang(false); langBtn.focus(); }
    } else if (e.key === "Escape") {
      openLang(false);
      langBtn.focus();
    }
  });
  doc.addEventListener("click", function (e) {
    if (!langList.hidden && !e.target.closest("[data-lang]")) openLang(false);
  });

  // Menu mobile
  var burger = $("[data-burger]");
  var menuMobile = $("[data-menu-mobile]");
  function toggleMenu(open) {
    menuMobile.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", tr(open ? "nav.close" : "nav.open"));
    root.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { toggleMenu(menuMobile.hidden); });
  menuMobile.addEventListener("click", function (e) { if (e.target.closest("a")) toggleMenu(false); });
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!menuMobile.hidden) { toggleMenu(false); burger.focus(); }
    if ($("[data-casserole]").classList.contains("is-open")) closeSheet();
  });

  // Avis : pause au survol et au focus
  var avis = $(".avis");
  avis.addEventListener("mouseenter", function () { q.hover = true; quoteLoop(); });
  avis.addEventListener("mouseleave", function () { q.hover = false; quoteLoop(); });
  avis.addEventListener("focusin", function () { q.hover = true; quoteLoop(); });
  avis.addEventListener("focusout", function () { q.hover = false; quoteLoop(); });

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    placePill(false);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitHeroTitle, 150);
  });

  /* ---------- Observateurs ---------- */
  var nav = $("[data-nav]");
  var mobileCta = $("[data-mobile-cta]");
  var review = $("[data-review]");
  var hero = $(".hero");

  var sentinel = doc.createElement("div");
  sentinel.style.cssText = "position:absolute;top:56px;left:0;width:1px;height:1px;pointer-events:none";
  hero.appendChild(sentinel);
  new IntersectionObserver(function (entries) {
    nav.classList.toggle("is-scrolled", !entries[0].isIntersecting);
  }).observe(sentinel);

  new IntersectionObserver(function (entries) {
    mobileCta.classList.toggle("is-visible", !entries[0].isIntersecting);
  }, { rootMargin: "0px 0px -10% 0px" }).observe($(".hero__ctas"));

  // La nuit commence dans la partie sombre du crépuscule
  var nightTargets = [$("[data-night-zone]"), $("[data-night]")];
  function nightWatcher(margin, apply) {
    var hits = new Set();
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) hits.add(en.target); else hits.delete(en.target); });
      apply(hits.size > 0);
    }, { rootMargin: margin });
    nightTargets.forEach(function (t) { obs.observe(t); });
  }
  nightWatcher("0px 0px -92% 0px", function (on) {
    nav.classList.toggle("theme-night", on);
    $("[data-toast]").classList.toggle("theme-night", on);
  });
  nightWatcher("-88% 0px 0px 0px", function (on) {
    mobileCta.classList.toggle("theme-night", on);
    review.classList.toggle("theme-night", on);
  });

  var links = $$(".nav__links a");
  var sectionObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      links.forEach(function (a) { a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)); });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["carte", "maison", "service", "infos"].forEach(function (id) { sectionObs.observe(doc.getElementById(id)); });
  new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) links.forEach(function (a) { a.setAttribute("aria-current", "false"); });
  }, { rootMargin: "-45% 0px -50% 0px" }).observe(hero);

  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".rv").forEach(function (el) { revealObs.observe(el); });

  /* ---------- Démarrage ---------- */
  var initial = "fr";
  try {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    var saved = localStorage.getItem("lm-lang");
    initial = LANGS.indexOf(fromUrl) >= 0 ? fromUrl : LANGS.indexOf(saved) >= 0 ? saved : "fr";
  } catch (e) { /* stockage indisponible */ }
  setLang(initial);
  showQuote(0);
  quoteLoop();

  var savedTheme = null;
  try { savedTheme = localStorage.getItem("lm-theme"); } catch (e) { /* stockage indisponible */ }
  if (savedTheme) $$("[data-theme-set]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-theme-set") === savedTheme)); });

  var ready = function () { fitHeroTitle(); placePill(false); requestAnimationFrame(function () { root.classList.add("is-ready"); }); };
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(ready); else ready();
  setTimeout(ready, 1500);
})();
