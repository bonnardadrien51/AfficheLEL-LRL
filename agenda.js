// ==========================================================
// AGENDA - AFFICHES CARREE / FACEBOOK
// ==========================================================
// Chaque page peut définir window.AGENDA_CONFIG avant
// d'inclure agenda.js.
// ==========================================================

const CONFIG = Object.assign({
    dataSource: "agenda.json",
    filterLabel: null,
    maxEvents: 6,
    downloadName: "couverture-facebook.png"
}, window.AGENDA_CONFIG || {});

const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const shortMonths = ["JAN","FÉV","MAR","AVR","MAI","JUN","JUL","AOÛ","SEP","OCT","NOV","DÉC"];
const shortWeekdays = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

document.addEventListener("DOMContentLoaded", () => {
    loadAgenda();
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", loadAgenda);
    const downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) downloadBtn.addEventListener("click", exportPNG);
});

async function loadAgenda() {
    try {
        const response = await fetch(CONFIG.dataSource + "?t=" + Date.now());
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
        const json = await response.json();
        const now = new Date();

        const allowedLabels = CONFIG.filterLabel === null
            ? null
            : Array.isArray(CONFIG.filterLabel) ? CONFIG.filterLabel : [CONFIG.filterLabel];

        const events = (Array.isArray(json.events) ? json.events : [])
            .map(event => ({ ...event, date: new Date(event.start) }))
            .filter(event => Number.isFinite(event.date.getTime()) && event.date >= now)
            .filter(event => {
                if (allowedLabels === null) return true;
                const category = event.label || event.calendar || "";
                return allowedLabels.includes(category);
            })
            .sort((a, b) => a.date - b.date)
            .slice(0, CONFIG.maxEvents);

        buildEvents(events);

        const update = document.getElementById("update");
        if (update) update.innerHTML = "Dernière mise à jour : " + (json.updated || json.generated_at || "");

        const currentMonth = document.getElementById("currentMonth");
        if (currentMonth && events.length) {
            currentMonth.innerHTML = months[events[0].date.getMonth()] + " " + events[0].date.getFullYear();
        }
    } catch (error) {
        console.error("Erreur chargement agenda :", error);
        const container = document.getElementById("events");
        if (container) container.innerHTML = `<div class="agenda-error">Impossible de charger les événements.</div>`;
    }
}

function formatDate(eventDate) {
    const day = String(eventDate.getDate()).padStart(2, "0");
    const month = String(eventDate.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${eventDate.getFullYear()}`;
}

function formatHour(date) {
    return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function getCampaign(event) {
    return event.campaign && typeof event.campaign === "object" ? event.campaign : {};
}

function buildEvents(events) {
    const container = document.getElementById("events");
    if (!container) return;
    container.innerHTML = "";

    events.forEach(event => {
        const eventDate = event.date;
        const day = eventDate.getDate();
        const weekday = shortWeekdays[eventDate.getDay()];
        const month = shortMonths[eventDate.getMonth()];
        const fullDate = formatDate(eventDate);
        const startHour = formatHour(event.start);
        const endHour = formatHour(event.end);
        const campaign = getCampaign(event);
        const campaignTitle = String(campaign.titre || "").trim();
        const campaignSubtitle = String(campaign.sous_titre ?? campaign["sous-titre"] ?? "").trim();

        let displayTitle;
        let displaySubtitle;
        if (campaignTitle) {
            displayTitle = campaignTitle;
            displaySubtitle = campaignSubtitle || event.title || "";
        } else {
            displayTitle = event.title || "";
            displaySubtitle = campaignSubtitle;
        }

        const badge = event.label || event.calendar || "";
        const color = event.color || "#0d4c72";
        const location = event.location || "";
        const icon = event.icon || "";

        const card = document.createElement("div");
        card.className = "event";
        card.innerHTML = `
            <div class="date" style="background:${escapeHtml(color)};">
                <div class="weekday">${escapeHtml(weekday)}</div>
                <div class="day">${escapeHtml(day)}</div>
                <div class="month">${escapeHtml(month)}</div>
            </div>
            <div class="left">
                ${icon ? `<img class="categoryIcon" src="img/categories/${escapeAttribute(icon)}" alt="">` : ""}
            </div>
            <div class="content">
                <div class="badge" style="background:${escapeHtml(color)};">${escapeHtml(badge)}</div>
                <div class="title">${escapeHtml(displayTitle)}</div>
                ${displaySubtitle ? `<div class="subtitle">${escapeHtml(displaySubtitle)}</div>` : ""}
                <div class="info">
                    ${location ? `<span class="location">📍 ${escapeHtml(location)}</span>` : ""}
                    <span class="time">📅 ${escapeHtml(fullDate)} · ${escapeHtml(startHour)} à ${escapeHtml(endHour)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) { return escapeHtml(value); }

function rasterizeCategoryIconsForExport(cover) {
    const replacements = [];

    cover.querySelectorAll(".categoryIcon").forEach(img => {
        if (!img.complete || !img.naturalWidth || !img.naturalHeight) return;

        const rect = img.getBoundingClientRect();
        const left = img.closest(".left");
        if (!left) return;

        const leftStyle = getComputedStyle(left);
        const availableWidth = Math.max(1, left.clientWidth - parseFloat(leftStyle.paddingLeft) - parseFloat(leftStyle.paddingRight));
        const availableHeight = Math.max(1, left.clientHeight - parseFloat(leftStyle.paddingTop) - parseFloat(leftStyle.paddingBottom));
        const ratio = img.naturalWidth / img.naturalHeight;

        // On calcule une taille qui respecte TOUJOURS le ratio natif du logo.
        // html2canvas peut sinon étirer certains SVG/PNG contenus dans un flex.
        let width = Math.min(availableWidth, availableHeight * ratio);
        let height = width / ratio;

        // Si l'image était déjà plus petite que l'espace disponible, on la conserve.
        if (rect.width < width && rect.height < height) {
            width = rect.width;
            height = width / ratio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.style.display = "block";
        canvas.style.width = `${Math.max(1, width)}px`;
        canvas.style.height = `${Math.max(1, height)}px`;
        canvas.style.flexShrink = "0";

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

        img.replaceWith(canvas);
        replacements.push({ canvas, img });
    });

    return () => {
        replacements.forEach(({ canvas, img }) => canvas.replaceWith(img));
    };
}

async function exportPNG() {
    const toolbar = document.querySelector(".toolbar");
    if (toolbar) toolbar.style.display = "none";

    const cover = document.getElementById("cover");
    if (!cover) {
        if (toolbar) toolbar.style.display = "flex";
        return;
    }

    const images = Array.from(cover.querySelectorAll("img"));
    const whenReady = images.map(img => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
        });
    });

    try {
        await Promise.all(whenReady);
        const restoreIcons = rasterizeCategoryIconsForExport(cover);

        try {
            const canvas = await html2canvas(cover, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
                allowTaint: true,
                imageTimeout: 0
            });

            const link = document.createElement("a");
            link.download = CONFIG.downloadName;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } finally {
            restoreIcons();
        }
    } catch (error) {
        console.error("Erreur export PNG :", error);
    } finally {
        if (toolbar) toolbar.style.display = "flex";
    }
}
