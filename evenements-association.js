/* Liste des événements d'une association et liens vers les 3 formats d'affiche. */

const DATA_URL = "agenda.json";

const ASSOCIATIONS = {
    lel: {
        name: "L'Établi Ludique",
        calendars: ["Partenaire", "Animation", "Marché / Expo"],
        logo: "img/logo-etabli.svg",
        className: "lel"
    },
    lrl: {
        name: "Le Raffut Ludique",
        calendars: ["Soirée au chapeau", "Soirée adhérents"],
        logo: "img/logo-raffut.svg",
        className: "lrl"
    }
};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(date) {
    return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function formatHour(date) {
    const h = date.getHours();
    const m = date.getMinutes();
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function normalizeLocation(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[–—-]/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function displayLocation(event) {
    const campaign = event.campaign || {};
    const mode = String(campaign.affichage_lieu || "3");
    const custom = String(campaign.lieu || "").trim();
    const calendar = String(event.location || "").trim();

    if (mode === "0") return "";
    if (mode === "1") return custom;
    if (mode === "2") return calendar;
    if (!custom) return calendar;
    if (!calendar) return custom;

    const a = normalizeLocation(custom);
    const b = normalizeLocation(calendar);
    if (a === b || a.includes(b) || b.includes(a)) {
        return custom.length >= calendar.length ? custom : calendar;
    }

    return `${custom} – ${calendar}`;
}

function getStatus(event) {
    return String((event.campaign || {}).statut || "").trim();
}

function posterUrl(file, uid) {
    return `${file}?id=${encodeURIComponent(uid)}`;
}

function renderEvent(event, association) {
    const campaign = event.campaign || {};
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : null;
    const title = String(campaign.titre || event.title || "Événement").trim();
    const subtitle = String(campaign.sous_titre || "").trim();
    const location = displayLocation(event);
    const status = getStatus(event);

    const card = document.createElement("article");
    card.className = "eventItem";

    const image = campaign.image
        ? `<img class="eventImage" src="${escapeHtml(campaign.image)}" alt="">`
        : `<div class="eventImage eventImageEmpty">🎲</div>`;

    card.innerHTML = `
        <div class="eventVisual">${image}</div>
        <div class="eventMain">
            <div class="eventDate">${escapeHtml(formatDate(start))}</div>
            <h2>${escapeHtml(title)}</h2>
            ${subtitle ? `<div class="eventSubtitle">${escapeHtml(subtitle)}</div>` : ""}
            <div class="eventMeta">
                <span>🕐 ${escapeHtml(formatHour(start))}${end ? ` – ${escapeHtml(formatHour(end))}` : ""}</span>
                ${location ? `<span>📍 ${escapeHtml(location)}</span>` : ""}
            </div>
            ${campaign.tarif ? `<div class="eventInfo">💶 ${escapeHtml(campaign.tarif)}</div>` : ""}
            ${campaign.inscription ? `<div class="eventInfo">💬 ${escapeHtml(campaign.inscription)}</div>` : ""}
            ${status ? `<div class="eventStatus">${escapeHtml(status)}</div>` : ""}
            <div class="posterButtons">
                <a class="posterBtn primary" href="${posterUrl("affiche.html", event.uid)}" target="_blank" rel="noopener">🖥️ Affiche</a>
                <a class="posterBtn" href="${posterUrl("affiche-carre-evenement.html", event.uid)}" target="_blank" rel="noopener">⬜ Carré Facebook</a>
                <a class="posterBtn" href="${posterUrl("affiche-facebook-evenement.html", event.uid)}" target="_blank" rel="noopener">📘 Facebook</a>
            </div>
        </div>
    `;

    return card;
}

async function loadAssociationEvents() {
    const key = document.body.dataset.association || "lel";
    const association = ASSOCIATIONS[key] || ASSOCIATIONS.lel;

    document.title = `${association.name} — Événements`;
    const name = document.getElementById("associationName");
    const logo = document.getElementById("associationLogo");
    const calendars = document.getElementById("calendarList");
    if (name) name.textContent = association.name;
    if (logo) {
        logo.src = association.logo;
        logo.alt = association.name;
    }
    if (calendars) calendars.textContent = association.calendars.join(" • ");

    const list = document.getElementById("eventsList");
    const loading = document.getElementById("loading");
    const empty = document.getElementById("empty");
    const error = document.getElementById("error");

    try {
        const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (!response.ok) throw new Error("agenda.json inaccessible");
        const json = await response.json();
        const events = Array.isArray(json.events) ? json.events : [];
        const allowed = new Set(association.calendars);
        const now = Date.now();

        const filtered = events
            .filter(event => allowed.has(event.calendar))
            .filter(event => event.start && new Date(event.start).getTime() >= now)
            .sort((a, b) => new Date(a.start) - new Date(b.start));

        if (loading) loading.style.display = "none";
        if (!filtered.length) {
            if (empty) empty.style.display = "block";
            return;
        }

        filtered.forEach(event => list.appendChild(renderEvent(event, association)));
    } catch (err) {
        console.error(err);
        if (loading) loading.style.display = "none";
        if (error) error.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", loadAssociationEvents);
