/* NebulaGlow store logic: order form, totals, localStorage orders, #admin view */
(function () {
  "use strict";

  var STORAGE_KEY = "nebulaglow_orders";

  var PRICES = { 1: 44.95, 2: 79.95, 3: 99.95 };

  function money(n) {
    return "$" + n.toFixed(2);
  }

  function getOrders() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }

  function genOrderId() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var id = "";
    for (var i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "NG-" + id;
  }

  /* ---- Quantity / total ---- */
  var qtySelect = document.getElementById("f-qty");
  var totalDisplay = document.getElementById("order-total-display");
  if (qtySelect && totalDisplay) {
    qtySelect.addEventListener("change", function () {
      var q = parseInt(qtySelect.value, 10) || 1;
      totalDisplay.textContent = money(PRICES[q] || PRICES[1]);
    });
  }

  /* ---- Order form ---- */
  var form = document.getElementById("order-form");
  var errBox = document.getElementById("form-error");
  var confirmation = document.getElementById("order-confirmation");

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
    errBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errBox.hidden = true;

      var name = document.getElementById("f-name").value.trim();
      var email = document.getElementById("f-email").value.trim();
      var country = document.getElementById("f-country").value;
      var address = document.getElementById("f-address").value.trim();
      var city = document.getElementById("f-city").value.trim();
      var postal = document.getElementById("f-postal").value.trim();
      var qty = parseInt(qtySelect.value, 10) || 1;

      if (!name) return showError("Please enter your full name.");
      if (!validEmail(email)) return showError("Please enter a valid email address — that's where your payment link goes.");
      if (!country) return showError("Please select your country.");
      if (!address) return showError("Please enter your full street address.");
      if (!city) return showError("Please enter your city.");
      if (!postal) return showError("Please enter your postal / ZIP code.");

      var order = {
        id: genOrderId(),
        date: new Date().toISOString(),
        name: name,
        email: email,
        country: country,
        address: address,
        city: city,
        postal: postal,
        qty: qty,
        total: (PRICES[qty] || PRICES[1]).toFixed(2),
        currency: "USD",
        status: "pending_payment"
      };

      var orders = getOrders();
      orders.push(order);
      try {
        saveOrders(orders);
      } catch (err) {
        return showError("Could not save your order in this browser (storage blocked). Please try a different browser.");
      }

      /* ---- Email the order to the owner (FormSubmit, free, no signup) ----
         First order triggers an activation email to the owner; she clicks
         the activation link once, then every order arrives by email. */
      try {
        fetch("https://formsubmit.co/ajax/rozeena031@gmail.com", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            _subject: "New NebulaGlow order " + order.id + " — $" + order.total,
            _template: "table",
            _captcha: "false",
            "Order ID": order.id,
            "Date": order.date,
            "Name": order.name,
            "Email": order.email,
            "Country": order.country,
            "Address": order.address,
            "City": order.city,
            "Postal": order.postal,
            "Qty": String(order.qty),
            "Total": "$" + order.total + " USD",
            "Status": order.status
          })
        }).catch(function () { /* offline — order still saved locally */ });
      } catch (e) { /* noop */ }

      document.getElementById("confirm-order-id").textContent = order.id;
      document.getElementById("confirm-total").textContent = money(parseFloat(order.total));
      document.getElementById("confirm-qty").textContent = qty + (qty === 1 ? " projector" : " projectors");

      form.hidden = true;
      confirmation.hidden = false;
      confirmation.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ---- Admin view (#admin) ---- */
  var adminView = document.getElementById("admin-view");
  var tbody = document.getElementById("admin-tbody");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAdmin() {
    var orders = getOrders();
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="11" class="empty">No orders yet.</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(function (o, i) {
      return (
        "<tr>" +
        "<td><strong>" + esc(o.id) + "</strong></td>" +
        "<td>" + esc((o.date || "").slice(0, 10)) + "</td>" +
        "<td>" + esc(o.name) + "</td>" +
        "<td>" + esc(o.email) + "</td>" +
        "<td>" + esc(o.country) + "</td>" +
        "<td>" + esc(o.address) + "</td>" +
        "<td>" + esc(o.city) + "</td>" +
        "<td>" + esc(o.postal) + "</td>" +
        "<td>" + esc(o.qty) + "</td>" +
        "<td>$" + esc(o.total) + "</td>" +
        '<td><button class="copy-btn" data-i="' + i + '">Copy</button></td>' +
        "</tr>"
      );
    }).join("");
  }

  function checkHash() {
    var isAdmin = window.location.hash === "#admin";
    if (adminView) {
      adminView.hidden = !isAdmin;
      if (isAdmin) {
        renderAdmin();
        adminView.scrollIntoView();
      }
    }
  }

  window.addEventListener("hashchange", checkHash);
  checkHash();

  var refreshBtn = document.getElementById("admin-refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", renderAdmin);

  var clearBtn = document.getElementById("admin-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (confirm("Delete ALL stored orders? This cannot be undone.")) {
        saveOrders([]);
        renderAdmin();
      }
    });
  }

  if (tbody) {
    tbody.addEventListener("click", function (e) {
      var btn = e.target.closest(".copy-btn");
      if (!btn) return;
      var o = getOrders()[parseInt(btn.getAttribute("data-i"), 10)];
      if (!o) return;
      var text =
        "Order " + o.id + " | " + o.date.slice(0, 10) + "\n" +
        o.name + " <" + o.email + ">\n" +
        o.address + ", " + o.city + " " + o.postal + ", " + o.country + "\n" +
        "Qty: " + o.qty + " | Total: $" + o.total + " USD | Status: " + o.status;
      var done = function () {
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = "Copy"; }, 1200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }
})();
