const DATA_URL = "agenda.json";
const OVERRIDES_URL = "status-overrides.json";
const REFRESH_MS = 60 * 1000;
const CHECK_EVENTS_MS = 10 * 1000;

const STATUS_COLORS = {
    "annulé": "#c0392b",
    "annule": "#c0392b",
    "complet": "#e08e0b",
    "reporté": "#6c5ce7",
    "reporte": "#6c5ce7"
};

const shortWeekdays = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

let allEvents = [];
let overrides = {};

function dateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isFinished(event) {
    return !!event.end && new Date(event.end).getTime() <= Date.now();
}

function formatHour(date) {
    const h = date.getHours();
    const m = date.getMinutes();
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

function getDisplayLocation(event) {
    const campaign = event.campaign || {};
    const mode = String(campaign.affichage_lieu || "3");
    const custom = String(campaign.lieu || "").trim();
    const calendar = String(event.location || "").trim();

    // Conserve les mêmes choix que le générateur :
    // 1 = lieu personnalisé, 2 = lieu Google Calendar, 3 = les deux.
    if (mode === "1") return custom;
    if (mode === "2") return calendar;
    if (mode === "3") {
        if (!custom) return calendar;
        if (!calendar) return custom;

        const a = normalizeLocation(custom);
        const b = normalizeLocation(calendar);

        // Même lieu écrit différemment : on n'affiche qu'une seule fois.
        if (a === b || a.includes(b) || b.includes(a)) {
            return custom.length >= calendar.length ? custom : calendar;
        }

        return `${custom} – ${calendar}`;
    }

    return custom || calendar;
}

function getStatus(event) {
    const override = overrides[event.uid];
    if (override && override.statut !== undefined) return override.statut;
    if (event.campaign && event.campaign.statut) return event.campaign.statut;
    return "";
}

function getRequestedDate() {
    const requested = new URLSearchParams(window.location.search).get("date");
    if (!requested || !/^\d{4}-\d{2}-\d{2}$/.test(requested)) return null;
    const parts = requested.split("-");
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return Number.isNaN(date.getTime()) ? null : dateOnly(date);
}

function getEventsForDate(date) {
    if (!date) return [];
    const wanted = date.getTime();
    return allEvents
        .filter(event => event.start)
        .filter(event => dateOnly(new Date(event.start)).getTime() === wanted)
        .filter(event => !isFinished(event))
        .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function renderCard(event) {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : null;
    const campaign = event.campaign || {};
    const title = campaign.titre || event.title || "Événement";
    const image = campaign.image || "";
    const location = getDisplayLocation(event);
    const statut = getStatus(event);
    const normalizedStatus = String(statut).trim().toLowerCase();

    const badgeHtml = statut ? `
        <div class="statusBadge" style="background:${STATUS_COLORS[normalizedStatus] || "#c0392b"}">
            ${escapeHtml(statut)}
        </div>` : "";

    const imageHtml = image ? `
        <div class="thumb">
            <img src="${escapeHtml(image)}" alt="">
        </div>` : "";

    const card = document.createElement("div");
    card.className = "eventCard";
    card.innerHTML = `
        <div class="date">
            <div class="weekday">${shortWeekdays[start.getDay()]}</div>
            <div class="day">${start.getDate()}</div>
        </div>

        ${imageHtml}

        <div class="infoBlock">
            <div class="textCol">
                <div class="title">${escapeHtml(title)}</div>

                <div class="meta">
                    <svg viewBox="0 0 24 24" class="icon">
                        <circle cx="12" cy="12" r="9" fill="none" stroke="#3a4160" stroke-width="2"/>
                        <path d="M12 7v5l3.5 2" fill="none" stroke="#3a4160" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <span>${formatHour(start)}${end ? ` – ${formatHour(end)}` : ""}</span>

                    ${location ? `
                        <svg viewBox="0 0 24 24" class="icon">
                            <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z" fill="#e6392b"/>
                            <circle cx="12" cy="10" r="3" fill="white"/>
                        </svg>
                        <span>${escapeHtml(location)}</span>
                    ` : ""}
                </div>
            </div>
            ${badgeHtml}
        </div>
    `;

    // Aperçu des informations du JSON campagne.
    const preview = document.createElement("div");
    preview.className = "campaignPreview";

    const subtitle = String(campaign.sous_titre || "").trim();
    const tarif = String(campaign.tarif || "").trim();
    const inscription = String(campaign.inscription || "").trim();
    const link = String(campaign.lien_inscription || "").trim();

    if (subtitle) {
        const el = document.createElement("div");
        el.className = "campaignSubtitle";
        el.textContent = subtitle;
        preview.appendChild(el);
    }

    if (tarif || inscription) {
        const el = document.createElement("div");
        el.className = "campaignDetails";
        el.textContent = [
            tarif ? `💶 ${tarif}` : "",
            inscription ? `💬 ${inscription}` : ""
        ].filter(Boolean).join(" · ");
        preview.appendChild(el);
    }

    if (link) {
        const el = document.createElement("div");
        el.className = "campaignRegistration";
        el.textContent = "🔗 Réservation en ligne";
        preview.appendChild(el);
    }

    if (preview.childElementCount) {
        const textCol = card.querySelector(".textCol");
        if (textCol) textCol.appendChild(preview);
    }

    return card;
}

function renderEvents() {
    const grid = document.getElementById("eventGrid");
    const noEvent = document.getElementById("noEvent");
    if (!grid || !noEvent) return;

    const selectedDate = getRequestedDate() || dateOnly(new Date());
    const events = getEventsForDate(selectedDate);

    const pageDate = document.getElementById("pageDate");
    if (pageDate) {
        pageDate.textContent = selectedDate.toLocaleDateString("fr-FR", {
            weekday: "long", day: "2-digit", month: "long", year: "numeric"
        });
    }

    if (!events.length) {
        grid.innerHTML = "";
        noEvent.style.display = "block";
        document.body.classList.add("empty");
        return;
    }

    noEvent.style.display = "none";
    document.body.classList.remove("empty");
    grid.innerHTML = "";
    events.forEach(event => grid.appendChild(renderCard(event)));
}

async function loadEvents() {
    try {
        const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (!response.ok) throw new Error("Impossible de charger agenda.json");
        const json = await response.json();
        allEvents = Array.isArray(json.events) ? json.events : [];

        try {
            const overrideResponse = await fetch(`${OVERRIDES_URL}?t=${Date.now()}`);
            overrides = overrideResponse.ok ? await overrideResponse.json() : {};
        } catch (error) {
            overrides = {};
        }

        renderEvents();
    } catch (error) {
        console.error("Erreur de chargement :", error);
        const grid = document.getElementById("eventGrid");
        const noEvent = document.getElementById("noEvent");
        if (grid) grid.innerHTML = "";
        if (noEvent) noEvent.style.display = "block";
    }
}

loadEvents();
setInterval(loadEvents, REFRESH_MS);
setInterval(renderEvents, CHECK_EVENTS_MS);
