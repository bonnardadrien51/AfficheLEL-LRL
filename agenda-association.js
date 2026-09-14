const DATA_URL = "agenda.json";

const CONFIG = {
    lel: {
        name: "L'Établi Ludique",
        logo: "img/logo-etabli.svg",
        calendars: ["Partenaire", "Animation", "Marché / Expo"],
        accent: "#7e9eea"
    },
    lrl: {
        name: "Le Raffut Ludique",
        logo: "img/logo-raffut.svg",
        calendars: ["Soirée au chapeau", "Soirée adhérents"],
        accent: "#ea3397"
    }
};

const LIMITS = { affiche: 6, carre: 4, facebook: 6 };

function clean(value) {
    return String(value ?? "").trim();
}

function normalize(value) {
    return clean(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function getDisplayLocation(event) {
    const campaign = event.campaign || {};
    const calendarLocation = clean(event.location);
    const customLocation = clean(campaign.lieu);
    const mode = parseInt(campaign.affichage_lieu ?? 3, 10);

    if (mode === 0) return "";
    if (mode === 1) return customLocation;
    if (mode === 2) return calendarLocation;
    if (mode === 4) return customLocation || calendarLocation;

    if (customLocation && calendarLocation) {
        const a = normalize(customLocation);
        const b = normalize(calendarLocation);
        if (a === b || a.includes(b) || b.includes(a)) {
            return customLocation.length >= calendarLocation.length
                ? customLocation
                : calendarLocation;
        }
        return `${customLocation} – ${calendarLocation}`;
    }

    return customLocation || calendarLocation;
}

function getStartDate(event) {
    const value = event.start || event.startDate || event.date || event.begin;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getEndDate(event) {
    const value = event.end || event.endDate || event.finish;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortDate(date) {
    return date ? date.toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric"
    }) : "";
}

function formatTime(date) {
    return date ? date.toLocaleTimeString("fr-FR", {
        hour: "2-digit", minute: "2-digit"
    }).replace(":", "h") : "";
}

function formatTimeRange(event) {
    const start = getStartDate(event);
    const end = getEndDate(event);
    if (!start) return "";
    const startText = formatTime(start);
    return end ? `${startText} – ${formatTime(end)}` : startText;
}

function getStatus(event) {
    return clean(event.status) || clean(event.statut) || clean(event.campaign?.statut);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderEvent(event, index, config) {
    const campaign = event.campaign || {};
    const date = getStartDate(event);
    const title = clean(campaign.titre) || clean(event.title) || "Événement";
    const subtitle = clean(campaign.sous_titre);
    const location = getDisplayLocation(event);
    const time = formatTimeRange(event);
    const tarif = clean(campaign.tarif);
    const inscription = clean(campaign.inscription);
    const lien = clean(campaign.lien_inscription);
    const image = clean(campaign.image);
    const campaignLogo = clean(campaign.logo);
    const status = getStatus(event);

    const imageHtml = image
        ? `<div class="eventImage"><img src="${escapeHtml(image)}" alt="" loading="eager" crossorigin="anonymous"></div>`
        : `<div class="eventImage eventImageEmpty"><img src="${escapeHtml(config.logo)}" alt=""></div>`;

    const info = [];
    if (date) info.push(`<div class="eventInfo"><span class="eventInfoIcon">📅</span><span class="eventInfoText">${escapeHtml(formatShortDate(date))}</span></div>`);
    if (time) info.push(`<div class="eventInfo"><span class="eventInfoIcon">🕐</span><span class="eventInfoText">${escapeHtml(time)}</span></div>`);
    if (location) info.push(`<div class="eventInfo"><span class="eventInfoIcon">📍</span><span class="eventInfoText">${escapeHtml(location)}</span></div>`);
    if (tarif) info.push(`<div class="eventInfo"><span class="eventInfoIcon">💶</span><span class="eventInfoText">${escapeHtml(tarif)}</span></div>`);
    if (inscription) info.push(`<div class="eventInfo"><span class="eventInfoIcon">💬</span><span class="eventInfoText">${escapeHtml(inscription)}</span></div>`);
    if (lien) info.push(`<div class="eventInfo eventRegistration"><span class="eventInfoIcon">🔗</span><a class="eventInfoText" href="${escapeHtml(lien)}" target="_blank" rel="noopener noreferrer">Réservation en ligne</a></div>`);

    const subtitleHtml = subtitle ? `<div class="eventSubtitle">${escapeHtml(subtitle)}</div>` : "";
    const statusHtml = status ? `<div class="eventStatus">${escapeHtml(status)}</div>` : "";
    const logoHtml = campaignLogo
        ? `<div class="campaignLogo"><img src="${escapeHtml(campaignLogo)}" alt="" crossorigin="anonymous"></div>`
        : "";

    return `<article class="eventCard" data-index="${index}">
        ${imageHtml}
        <div class="eventContent">
            <div class="eventTitle">${escapeHtml(title)}</div>
            ${subtitleHtml}
            <div class="eventInfos">${info.join("")}</div>
            ${statusHtml}
            ${logoHtml}
        </div>
    </article>`;
}

function getPageConfig() {
    const body = document.body;
    const association = clean(body.dataset.association).toLowerCase() || "lel";
    const format = clean(body.dataset.format).toLowerCase() || "affiche";
    return { association, format, config: CONFIG[association] || CONFIG.lel };
}

async function downloadPoster() {
    if (typeof html2canvas !== "function") {
        console.error("html2canvas est indisponible.");
        return;
    }
    const poster = document.getElementById("screen");
    if (!poster) return;

    const toolbar = document.getElementById("toolbar");
    if (toolbar) toolbar.style.display = "none";

    try {
        const canvas = await html2canvas(poster, {
            backgroundColor: null,
            useCORS: true,
            scale: 1
        });
        const link = document.createElement("a");
        const { association, format } = getPageConfig();
        const page = new URLSearchParams(window.location.search).get("page");
        link.download = `agenda-${association}-${format}${page ? `-page-${page}` : ""}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (error) {
        console.error("Erreur lors de la capture :", error);
    } finally {
        if (toolbar) toolbar.style.display = "flex";
    }
}

async function loadEvents() {
    const { association, format, config } = getPageConfig();
    const container = document.getElementById("eventGrid");
    const titleElement = document.getElementById("associationName");
    const countElement = document.getElementById("eventCount");
    const logoElement = document.getElementById("associationLogo");

    if (!container) {
        console.error("agenda-association.js : #eventGrid introuvable.");
        return;
    }

    if (titleElement) titleElement.textContent = config.name;
    if (logoElement) logoElement.src = config.logo;
    document.documentElement.style.setProperty("--association-accent", config.accent);

    try {
        const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        let events = Array.isArray(data) ? data : (Array.isArray(data.events) ? data.events : []);

        events = events.filter(event => config.calendars.some(allowed =>
            normalize(allowed) === normalize(event.calendar)
        ));

        const now = new Date();
        events = events.filter(event => {
            const start = getStartDate(event);
            return start && start >= now;
        });

        events.sort((a, b) => getStartDate(a) - getStartDate(b));

        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get("page");
        let pageMode = false;
        let displayEvents;

        if (pageParam !== null) {
            const page = parseInt(pageParam, 10);
            if (Number.isInteger(page) && page >= 1) {
                pageMode = true;
                document.body.classList.add("page-mode");
                const index = page - 1;
                displayEvents = index < events.length ? [events[index]] : [];
            } else {
                displayEvents = [];
            }
        } else {
            document.body.classList.remove("page-mode");
            const limit = LIMITS[format] || LIMITS.affiche;
            displayEvents = events.slice(0, limit);
        }

        if (countElement) {
            if (pageMode) {
                const page = parseInt(pageParam, 10);
                countElement.textContent = displayEvents.length
                    ? `Événement ${page} / ${events.length}`
                    : `Aucun événement pour la page ${page}`;
            } else {
                countElement.textContent = `${displayEvents.length} événement${displayEvents.length > 1 ? "s" : ""}`;
            }
        }

        if (!displayEvents.length) {
            container.innerHTML = `<div class="emptyAgenda"><div class="emptyAgendaIcon">📅</div><div class="emptyAgendaTitle">Aucun événement</div><div class="emptyAgendaText">${pageMode ? "Cette page ne correspond à aucun événement." : "Aucun événement à venir."}</div></div>`;
            return;
        }

        container.innerHTML = displayEvents.map((event, index) => renderEvent(event, index, config)).join("");

        const images = Array.from(container.querySelectorAll("img"));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
            });
        }));
    } catch (error) {
        console.error("Erreur de chargement de agenda.json :", error);
        container.innerHTML = `<div class="emptyAgenda"><div class="emptyAgendaIcon">⚠️</div><div class="emptyAgendaTitle">Erreur de chargement</div><div class="emptyAgendaText">Impossible de charger les événements.</div></div>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const download = document.getElementById("download");
    if (download) download.addEventListener("click", downloadPoster);
    loadEvents();
});
