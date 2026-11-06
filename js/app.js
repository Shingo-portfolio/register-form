(function () {
  "use strict";
  var COUNTRIES = window.COUNTRIES, I18N = window.I18N, SAMPLE = window.SAMPLE, INTRO = window.INTRO;
  var lang = "en";
  var combos = {};
  var errKey = null;

  function $(id) { return document.getElementById(id); }
  function t(key) { return I18N[lang][key]; }

  /* ---------- 選び欄 ---------- */
  function createCombo(host) {
    var id = host.getAttribute("data-combo");
    var mode = host.getAttribute("data-mode");
    var inputId = id + (mode === "dial" ? "-dial" : "-input");
    var listId = id + "-list";
    var input = document.createElement("input");
    input.type = "text";
    input.id = inputId;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listId);
    input.setAttribute("autocomplete", "off");
    var list = document.createElement("ul");
    list.id = listId;
    list.className = "combo__list";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    host.appendChild(input);
    host.appendChild(list);

    var selected = null; // 国コード
    var active = -1;
    var shown = [];

    function label(c) { return mode === "dial" ? c.dial + " " + c.code : c.name + " (" + c.code + ")"; }
    function find(code) { for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].code === code) return COUNTRIES[i]; return null; }
    function syncText() { var c = find(selected); input.value = c ? label(c) : ""; }
    function isOpen() { return !list.hidden; }
    function close() {
      list.hidden = true; active = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      syncText();
    }
    function choose(code) { selected = code; close(); }
    function render(q) {
      q = (q || "").toLowerCase();
      shown = COUNTRIES.filter(function (c) {
        return !q || c.name.toLowerCase().indexOf(q) > -1 || c.code.toLowerCase().indexOf(q) > -1 || c.dial.indexOf(q) > -1;
      });
      list.innerHTML = "";
      shown.forEach(function (c, i) {
        var li = document.createElement("li");
        li.id = listId + "-" + i;
        li.className = "combo__option";
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", c.code === selected ? "true" : "false");
        li.textContent = label(c);
        li.addEventListener("mousedown", function (e) { e.preventDefault(); choose(c.code); });
        list.appendChild(li);
      });
      if (!shown.length) {
        var e = document.createElement("li");
        e.className = "combo__empty";
        e.setAttribute("role", "presentation");
        e.textContent = "-";
        list.appendChild(e);
      }
      active = shown.length ? 0 : -1;
      mark();
    }
    function mark() {
      var opts = list.querySelectorAll(".combo__option");
      for (var i = 0; i < opts.length; i++) opts[i].classList.toggle("combo__option--active", i === active);
      if (active > -1 && opts[active]) {
        input.setAttribute("aria-activedescendant", opts[active].id);
        if (opts[active].scrollIntoView) opts[active].scrollIntoView({ block: "nearest" });
      } else input.removeAttribute("aria-activedescendant");
    }
    function open(q) {
      render(q);
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
    input.addEventListener("click", function () { if (!isOpen()) { input.select(); open(""); } });
    input.addEventListener("input", function () {
      if (input.value === "") selected = null;
      open(input.value);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen()) open(""); else if (shown.length) { active = (active + 1) % shown.length; mark(); }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isOpen() && shown.length) { active = (active - 1 + shown.length) % shown.length; mark(); }
      } else if (e.key === "Enter") {
        if (isOpen()) { e.preventDefault(); if (active > -1) choose(shown[active].code); else close(); }
      } else if (e.key === "Escape") {
        if (isOpen()) { e.preventDefault(); close(); }
      }
    });
    input.addEventListener("blur", function () { if (isOpen()) close(); });
    document.addEventListener("mousedown", function (e) { if (isOpen() && !host.contains(e.target)) close(); });

    var api = {
      get: function () { return selected; },
      set: function (code) { selected = code; close(); },
      input: input,
      syncText: syncText
    };
    combos[id] = api;
    api.set("US");
    return api;
  }

  /* ---------- 言葉 ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
    $("langBtn").textContent = t("langButton");
    if (errKey) $("errorBand").textContent = t(errKey);
  }

  /* ---------- 入力 ---------- */
  var TEXT_IDS = ["billingName", "tel-number", "email", "paymentName", "taxId", "addr1", "addr2", "city", "state", "zip",
    "s-recipient", "s-tel-number", "s-email", "s-taxId", "s-addr1", "s-addr2", "s-addr3", "s-city", "s-state", "s-zip",
    "c-name", "c-email", "c-tel"];

  function showShipping() { $("section2").hidden = !$("shipProceed").checked; }

  function resetAll() {
    TEXT_IDS.forEach(function (id) { $(id).value = ""; });
    Object.keys(combos).forEach(function (k) { combos[k].set("US"); });
    $("shipSame").checked = true;
    showShipping();
    hideError();
    lang = "en";
    applyLang();
    $("formView").hidden = false;
    $("doneView").hidden = true;
  }

  function fillSample() {
    $("billingName").value = SAMPLE.billingName;
    combos.tel.set(SAMPLE.country);
    $("tel-number").value = SAMPLE.telNumber;
    $("email").value = SAMPLE.email;
    $("addr1").value = SAMPLE.addressLine1;
    $("city").value = SAMPLE.city;
    $("state").value = SAMPLE.state;
    $("zip").value = SAMPLE.zip;
    combos.country.set(SAMPLE.country);
    hideError();
  }

  function hideError() { var b = $("errorBand"); b.hidden = true; b.textContent = ""; errKey = null; }
  function showError(key) {
    var b = $("errorBand");
    errKey = key;
    b.textContent = t(key);
    b.hidden = false;
    b.scrollIntoView({ behavior: "auto", block: "start" });
    b.focus({ preventScroll: true });
  }

  function empty(id) { return $(id).value.trim() === ""; }

  function submit(e) {
    e.preventDefault();
    var checks = [
      [empty("billingName"), "billingNameRequired"],
      [empty("tel-number"), "telephoneRequired"],
      [empty("email"), "emailRequired"],
      [empty("addr1"), "addressLine1Required"],
      [!combos.country.get(), "countryRequired"]
    ];
    if ($("shipProceed").checked) {
      checks.push([empty("s-recipient"), "recipientNameRequired"]);
      checks.push([empty("s-addr1"), "shippingAddressLine1Required"]);
      checks.push([!combos["s-country"].get(), "shippingCountryRequired"]);
    }
    for (var i = 0; i < checks.length; i++) {
      if (checks[i][0]) { showError(checks[i][1]); return; }
    }
    hideError();
    $("formView").hidden = true;
    $("doneView").hidden = false;
    $("card").scrollIntoView({ block: "start" });
  }

  /* ---------- 起動 ---------- */
  function init() {
    $("notice").textContent = INTRO.notice;
    $("introHeading").textContent = INTRO.heading;
    INTRO.lines.forEach(function (l) {
      var li = document.createElement("li");
      li.textContent = l;
      $("introList").appendChild(li);
    });
    $("fillBtn").textContent = INTRO.fill;
    $("resetBtn").textContent = INTRO.reset;
    $("doneResetBtn").textContent = INTRO.reset;
    $("doneNote").textContent = INTRO.doneNote;
    $("companyName").textContent = window.COMPANY_NAME;

    Array.prototype.forEach.call(document.querySelectorAll("[data-combo]"), createCombo);

    ["tel-number", "s-tel-number"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        var v = this.value.replace(/\D/g, "");
        if (v !== this.value) this.value = v;
      });
    });

    applyLang();
    $("langBtn").addEventListener("click", function () { lang = lang === "en" ? "ja" : "en"; applyLang(); });
    $("fillBtn").addEventListener("click", fillSample);
    $("resetBtn").addEventListener("click", resetAll);
    $("doneResetBtn").addEventListener("click", resetAll);
    $("shipProceed").addEventListener("change", showShipping);
    $("shipSame").addEventListener("change", showShipping);
    $("regForm").addEventListener("submit", submit);
  }
  init();
})();
