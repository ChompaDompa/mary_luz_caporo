(function () {
  const STORAGE_KEY = "caporo-reservations";
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const DATA = {
    rooms: [
      {
        id: "garden",
        name: "Habitaci\u00f3n Est\u00e1ndar Jard\u00edn",
        price: 70000,
        description: "Vista al jard\u00edn y desayuno continental incluido.",
        maxGuests: 3
      },
      {
        id: "suite",
        name: "Suite Vista Mar",
        price: 120000,
        description: "Balc\u00f3n privado con hamaca y minibar.",
        maxGuests: 4
      },
      {
        id: "river",
        name: "Suite Playa",
        price: 160000,
        description: "Acceso directo al r\u00edo y servicio de mayordomo.",
        maxGuests: 4
      },
      {
        id: "villa",
        name: "Villa Caporo",
        price: 250000,
        description: "Espacio exclusivo con jacuzzi y chef personal.",
        maxGuests: 6
      }
    ],
    tours: [
      {
        id: "snorkel",
        name: "Tour Isla Coral",
        price: 85000,
        duration: "Medio d\u00eda",
        spots: 12,
        description: "Snorkel guiado y visita a piscinas naturales."
      },
      {
        id: "selva",
        name: "Caminata Selva",
        price: 65000,
        duration: "4 horas",
        spots: 10,
        description: "Explora cascadas y aprende sobre fauna local."
      },
      {
        id: "gastronomia",
        name: "Ruta Gastron\u00f3mica",
        price: 90000,
        duration: "Noche",
        spots: 8,
        description: "Sabores tradicionales con chefs de la regi\u00f3n."
      }
    ],
    souvenirs: [
      {
        id: "hamaca",
        name: "Hamaca artesanal",
        price: 65000,
        stock: 9,
        description: "Tejida por artesanos de Capurgan\u00e1."
      },
      {
        id: "cafe",
        name: "Caf\u00e9 de origen",
        price: 35000,
        stock: 18,
        description: "Tueste medio con notas a cacao y panela."
      },
      {
        id: "kit",
        name: "Kit Relax",
        price: 48000,
        stock: 15,
        description: "Velas arom\u00e1ticas y sales minerales locales."
      }
    ]
  };

  const extrasCatalog = {
    none: { id: "none", name: "Sin extras", price: 0 },
    airport: { id: "airport", name: "Transporte aeropuerto", price: 45000 },
    spa: { id: "spa", name: "Acceso spa", price: 60000 },
    breakfast: { id: "breakfast", name: "Desayuno premium", price: 30000 }
  };

  const state = {
    cart: [],
    reservations: loadReservations()
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const ui = {
      reservationForm: document.getElementById("reservation-form"),
      roomSelect: document.getElementById("roomType"),
      checkInInput: document.getElementById("checkIn"),
      checkOutInput: document.getElementById("checkOut"),
      guestsInput: document.getElementById("guests"),
      extrasSelect: document.getElementById("extras"),
      summaryBox: document.getElementById("reservation-summary"),
      successAlert: document.getElementById("reservation-success"),
      historyBox: document.getElementById("reservation-history"),
      tourContainer: document.getElementById("tour-list"),
      souvenirContainer: document.getElementById("souvenir-list"),
      cartCount: document.getElementById("cart-count"),
      cartItems: document.getElementById("cart-items"),
      cartAlert: document.getElementById("cart-alert"),
      cartSuccess: document.getElementById("cart-success"),
      cartTotal: document.getElementById("cart-total"),
      checkoutButton: document.getElementById("checkoutButton")
    };

    if (!ui.reservationForm || !ui.roomSelect || !ui.tourContainer || !ui.souvenirContainer) {
      return;
    }

    renderRoomOptions(ui.roomSelect);
    renderCollection(DATA.tours, ui.tourContainer, "tours");
    renderCollection(DATA.souvenirs, ui.souvenirContainer, "souvenirs");
    updateReservationHistory(ui.historyBox);
    updateCartUI(ui);

    [ui.roomSelect, ui.checkInInput, ui.checkOutInput, ui.guestsInput, ui.extrasSelect].forEach((field) => {
      if (!field) return;
      field.addEventListener("input", () => updateReservationSummary(ui));
      field.addEventListener("change", () => updateReservationSummary(ui));
    });

    ui.reservationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      ui.reservationForm.classList.add("was-validated");

      const result = buildReservationPayload(ui);
      if (!result.valid) {
        if (result.message) {
          showSummary(ui.summaryBox, result.message, false);
        }
        return;
      }

      state.reservations.unshift(result.reservation);
      saveReservations();
      updateReservationHistory(ui.historyBox);
      showSummary(ui.summaryBox, result.summary, true);
      showSuccess(ui.successAlert, "Reserva confirmada. C\u00f3digo: " + result.reservation.id);

      ui.reservationForm.reset();
      ui.reservationForm.classList.remove("was-validated");
      updateReservationSummary(ui);
    });

    if (ui.historyBox) {
      ui.historyBox.addEventListener("click", (event) => {
        const button = event.target.closest('[data-action="remove-reservation"]');
        if (!button) return;
        const id = button.getAttribute("data-id");
        state.reservations = state.reservations.filter((item) => item.id !== id);
        saveReservations();
        updateReservationHistory(ui.historyBox);
      });
    }

    document.addEventListener("click", (event) => {
      const addButton = event.target.closest('[data-action="add-cart"]');
      if (!addButton) return;
      const collection = addButton.getAttribute("data-collection");
      const id = addButton.getAttribute("data-id");
      addItemToCart(collection, id, ui);
    });

    if (ui.cartItems) {
      ui.cartItems.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const action = button.getAttribute("data-action");
        const id = button.getAttribute("data-id");
        const collection = button.getAttribute("data-collection");

        if (action === "increase-item") {
          adjustCartQuantity(collection, id, 1, ui);
        } else if (action === "decrease-item") {
          adjustCartQuantity(collection, id, -1, ui);
        } else if (action === "remove-item") {
          removeFromCart(collection, id, ui);
        }
      });
    }

    if (ui.checkoutButton) {
      ui.checkoutButton.addEventListener("click", () => {
        if (!state.cart.length) return;
        const reference = "PAY-" + Date.now().toString().slice(-6);
        if (ui.cartSuccess) {
          ui.cartSuccess.textContent = "Pago aprobado (simulado). Referencia " + reference + ".";
          ui.cartSuccess.classList.remove("d-none");
        }
        state.cart = [];
        updateCartUI(ui);
        if (ui.cartSuccess) {
          setTimeout(() => {
            ui.cartSuccess.classList.add("d-none");
            ui.cartSuccess.textContent = "";
          }, 5000);
        }
      });
    }
  }

  function updateReservationSummary(ui) {
    if (!ui.summaryBox) return;
    const result = buildReservationPayload(ui, { preview: true });

    if (!result.valid) {
      if (result.message && hasFilledDates(ui)) {
        showSummary(ui.summaryBox, result.message, false);
      } else {
        hideSummary(ui.summaryBox);
      }
      return;
    }

    showSummary(ui.summaryBox, result.summary, true);
  }

  function buildReservationPayload(ui, options) {
    const opts = options || {};
    const roomId = ui.roomSelect ? ui.roomSelect.value : "";
    const checkInValue = ui.checkInInput ? ui.checkInInput.value : "";
    const checkOutValue = ui.checkOutInput ? ui.checkOutInput.value : "";
    const guestsValue = ui.guestsInput ? parseInt(ui.guestsInput.value, 10) : 0;
    const guests = Number.isFinite(guestsValue) ? guestsValue : 0;
    const extraId = ui.extrasSelect ? ui.extrasSelect.value : "none";

    if (!roomId || !checkInValue || !checkOutValue || guests <= 0) {
      return { valid: false };
    }

    const room = DATA.rooms.find((item) => item.id === roomId);
    if (!room) {
      return { valid: false, message: "Selecciona una habitaci\u00f3n v\u00e1lida." };
    }

    if (guests > room.maxGuests) {
      return {
        valid: false,
        message: "El n\u00famero de huespedes supera la capacidad de la habitaci\u00f3n (" + room.maxGuests + ")."
      };
    }

    const checkIn = parseDate(checkInValue);
    const checkOut = parseDate(checkOutValue);
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      return {
        valid: false,
        message: "Revisa las fechas: la salida debe ser posterior al ingreso."
      };
    }

    const nights = Math.max(1, Math.round((checkOut - checkIn) / MS_PER_DAY));
    const extra = extrasCatalog[extraId] || extrasCatalog.none;
    const total = room.price * nights + extra.price;

    const summary = [
      "Habitaci\u00f3n: " + room.name,
      "Fechas: " + formatDate(checkIn) + " - " + formatDate(checkOut),
      "Huespedes: " + guests,
      "Noches: " + nights,
      "Extras: " + extra.name,
      "Total estimado: " + formatCurrency(total)
    ].join("<br>");

    if (opts.preview) {
      return { valid: true, summary: summary };
    }

    const reservation = {
      id: "RES-" + Date.now().toString().slice(-6),
      roomId: room.id,
      roomName: room.name,
      checkIn: formatDate(checkIn),
      checkOut: formatDate(checkOut),
      guests: guests,
      nights: nights,
      extra: extra.name,
      total: total,
      createdAt: new Date().toISOString()
    };

    return { valid: true, reservation: reservation, summary: summary };
  }

  function addItemToCart(collection, id, ui) {
    const catalogue = DATA[collection];
    if (!catalogue) return;
    const itemData = catalogue.find((item) => item.id === id);
    if (!itemData) return;

    const existing = state.cart.find((entry) => entry.id === id && entry.collection === collection);
    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.push({
        id: id,
        collection: collection,
        name: itemData.name,
        price: itemData.price,
        meta: collection === "tours" ? "Duraci\u00f3n: " + itemData.duration + " | Cupos: " + itemData.spots : "Existencias: " + itemData.stock,
        quantity: 1
      });
    }

    if (ui.cartSuccess) {
      ui.cartSuccess.classList.add("d-none");
      ui.cartSuccess.textContent = "";
    }

    updateCartUI(ui);
  }

  function adjustCartQuantity(collection, id, delta, ui) {
    const item = state.cart.find((entry) => entry.id === id && entry.collection === collection);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(collection, id, ui);
    } else {
      updateCartUI(ui);
    }
  }

  function removeFromCart(collection, id, ui) {
    state.cart = state.cart.filter((entry) => !(entry.id === id && entry.collection === collection));
    updateCartUI(ui);
  }

  function updateCartUI(ui) {
    if (!ui.cartCount || !ui.cartItems || !ui.cartAlert || !ui.cartTotal || !ui.checkoutButton) {
      return;
    }

    const totalItems = state.cart.reduce((acc, item) => acc + item.quantity, 0);
    ui.cartCount.textContent = totalItems;
    ui.cartAlert.classList.toggle("d-none", totalItems > 0);
    ui.checkoutButton.disabled = totalItems === 0;

    if (!totalItems) {
      ui.cartItems.innerHTML = "";
      ui.cartTotal.textContent = "$0";
      return;
    }

    ui.cartItems.innerHTML = state.cart.map((item) => {
      const itemTotal = formatCurrency(item.price * item.quantity);
      return [
        '<div class="list-group-item">',
          '<div class="d-flex justify-content-between align-items-start gap-3">',
            '<div>',
              '<div class="fw-semibold">' + item.name + '</div>',
              (item.meta ? '<div class="small text-muted">' + item.meta + '</div>' : ''),
            '</div>',
            '<div class="text-end">',
              '<div class="fw-semibold">' + itemTotal + '</div>',
              '<div class="btn-group btn-group-sm mt-2" role="group">',
                '<button type="button" class="btn btn-outline-secondary" data-action="decrease-item" data-id="' + item.id + '" data-collection="' + item.collection + '">-</button>',
                '<span class="btn btn-light disabled">' + item.quantity + '</span>',
                '<button type="button" class="btn btn-outline-secondary" data-action="increase-item" data-id="' + item.id + '" data-collection="' + item.collection + '">+</button>',
                '<button type="button" class="btn btn-outline-danger ms-2" data-action="remove-item" data-id="' + item.id + '" data-collection="' + item.collection + '"><i class="bi bi-trash"></i></button>',
              '</div>',
            '</div>',
          '</div>',
        '</div>'
      ].join("");
    }).join("");

    const total = state.cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    ui.cartTotal.textContent = formatCurrency(total);
  }

  function updateReservationHistory(container) {
    if (!container) return;

    if (!state.reservations.length) {
      container.textContent = "A\u00fan no hay reservas.";
      container.classList.add("text-muted");
      return;
    }

    container.classList.remove("text-muted");
    container.innerHTML = state.reservations.map((item) => {
      return [
        '<div class="border-bottom pb-2 mb-3" data-id="' + item.id + '">',
          '<div class="d-flex justify-content-between align-items-center">',
            '<span class="fw-semibold">' + item.roomName + '</span>',
            '<span>' + formatCurrency(item.total) + '</span>',
          '</div>',
          '<div class="small text-muted">Ingreso: ' + item.checkIn + ' &bull; Salida: ' + item.checkOut + '</div>',
          '<div class="small text-muted">Huespedes: ' + item.guests + ' &bull; Noches: ' + item.nights + '</div>',
          '<div class="d-flex justify-content-between align-items-center mt-2">',
            '<span class="badge bg-light text-dark">' + item.extra + '</span>',
            '<button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-reservation" data-id="' + item.id + '">Eliminar</button>',
          '</div>',
        '</div>'
      ].join("");
    }).join("");
  }

  function renderRoomOptions(select) {
    const options = ['<option value="" selected disabled>Selecciona una habitaci\u00f3n</option>'];
    DATA.rooms.forEach((room) => {
      options.push(
        '<option value="' + room.id + '">' + room.name + ' - ' + formatCurrency(room.price) + ' / noche</option>'
      );
    });
    select.innerHTML = options.join("");
  }

  function renderCollection(items, container, type) {
    container.innerHTML = items.map((item) => {
      const priceBadge = formatCurrency(item.price);
      const metaLine = type === "tours"
        ? '<div class="small text-muted mb-3">Duraci\u00f3n: ' + item.duration + ' &bull; Cupos: ' + item.spots + '</div>'
        : '<div class="small text-muted mb-3">Existencias: ' + item.stock + '</div>';
      return [
        '<div class="col-md-6 col-lg-4">',
          '<article class="card h-100 border rounded-3 shadow-sm">',
            '<div class="card-body d-flex flex-column">',
              '<div class="d-flex justify-content-between align-items-start mb-2">',
                '<h5 class="card-title mb-0">' + item.name + '</h5>',
                '<span class="badge bg-primary-subtle text-primary fw-semibold">' + priceBadge + '</span>',
              '</div>',
              '<p class="card-text flex-grow-1">' + item.description + '</p>',
              metaLine,
              '<button class="btn btn-outline-primary mt-auto" data-action="add-cart" data-collection="' + type + '" data-id="' + item.id + '">Agregar al carrito</button>',
            '</div>',
          '</article>',
        '</div>'
      ].join("");
    }).join("");
  }

  function showSummary(container, message, positive) {
    if (!container) return;
    container.innerHTML = message;
    container.classList.remove("d-none");
    container.classList.toggle("border-success", !!positive);
    container.classList.toggle("border-danger", !positive);
  }

  function hideSummary(container) {
    if (!container) return;
    container.classList.add("d-none");
    container.innerHTML = "";
    container.classList.remove("border-success", "border-danger");
  }

  function showSuccess(container, message) {
    if (!container) return;
    container.textContent = message;
    container.classList.remove("d-none");
    setTimeout(() => {
      container.classList.add("d-none");
      container.textContent = "";
    }, 6000);
  }

  function hasFilledDates(ui) {
    return !!(ui.roomSelect && ui.roomSelect.value && ui.checkInInput && ui.checkInInput.value && ui.checkOutInput && ui.checkOutInput.value);
  }

  function formatCurrency(value) {
    return "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value);
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  }

  function formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function loadReservations() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("No se pudieron cargar las reservas simuladas", error);
      return [];
    }
  }

  function saveReservations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reservations));
    } catch (error) {
      console.error("No se pudieron guardar las reservas simuladas", error);
    }
  }
})();
