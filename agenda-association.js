const DATA_URL = "agenda.json";

const CONFIG = {
    lel: {
        name: "L'Établi Ludique",
        logo: "img/logo-etabli.svg",
        calendars: [
            "Partenaire",
            "Animation",
            "Marché / Expo"
        ],
        accent: "#7e9eea"
    },

    lrl: {
        name: "Le Raffut Ludique",
        logo: "img/logo-raffut.svg",
        calendars: [
            "Soirée au chapeau",
            "Soirée adhérents"
        ],
        accent: "#ea3397"
    }
};


// Nombre d'événements lorsqu'on n'utilise PAS ?page=
const LIMITS = {
    affiche: 6,
    carre: 4,
    facebook: 6
};


// --------------------------------------------------
// OUTILS
// --------------------------------------------------

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


// --------------------------------------------------
// LIEU
// --------------------------------------------------

function getDisplayLocation(event) {

    const campaign = event.campaign || {};

    const calendarLocation = clean(event.location);
    const customLocation = clean(campaign.lieu);

    const mode = parseInt(
        campaign.affichage_lieu ?? 3,
        10
    );

    // 0 = aucun
    if (mode === 0) {
        return "";
    }

    // 1 = lieu de campagne
    if (mode === 1) {
        return customLocation;
    }

    // 2 = lieu Google Calendar
    if (mode === 2) {
        return calendarLocation;
    }

    // 4 = campagne OU calendrier
    if (mode === 4) {
        return customLocation || calendarLocation;
    }

    // 3 = les deux avec suppression des doublons
    if (customLocation && calendarLocation) {

        const a = normalize(customLocation);
        const b = normalize(calendarLocation);

        // Même texte
        if (a === b) {
            return customLocation;
        }

        // L'un contient déjà l'autre
        if (a.includes(b)) {
            return customLocation;
        }

        if (b.includes(a)) {
            return calendarLocation;
        }

        return `${customLocation} – ${calendarLocation}`;
    }

    return customLocation || calendarLocation;
}


// --------------------------------------------------
// DATE / HEURE
// --------------------------------------------------

function getStartDate(event) {

    const value =
        event.start ||
        event.startDate ||
        event.date ||
        event.begin;

    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
}


function formatDate(date) {

    if (!date) {
        return "";
    }

    return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}


function formatShortDate(date) {

    if (!date) {
        return "";
    }

    return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}


function formatTime(date) {

    if (!date) {
        return "";
    }

    return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
    }).replace(":", "h");
}


function getEndDate(event) {

    const value =
        event.end ||
        event.endDate ||
        event.finish;

    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
}


function formatTimeRange(event) {

    const start = getStartDate(event);
    const end = getEndDate(event);

    if (!start) {
        return "";
    }

    const startText = formatTime(start);

    if (!end) {
        return startText;
    }

    const endText = formatTime(end);

    return `${startText} – ${endText}`;
}


// --------------------------------------------------
// STATUT
// --------------------------------------------------

function getStatus(event) {

    const status =
        clean(event.status) ||
        clean(event.statut) ||
        clean(event.campaign?.statut);

    if (!status) {
        return "";
    }

    return status;
}


// --------------------------------------------------
// HTML
// --------------------------------------------------

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function createInfoLine(icon, value, extraClass = "") {

    if (!value) {
        return "";
    }

    return `
        <div class="eventInfo ${extraClass}">
            <span class="eventInfoIcon">${icon}</span>
            <span class="eventInfoText">${escapeHtml(value)}</span>
        </div>
    `;
}


// --------------------------------------------------
// EVENEMENT
// --------------------------------------------------

function renderEvent(event, index) {

    const campaign = event.campaign || {};

    const date = getStartDate(event);
    const title =
        clean(campaign.titre) ||
        clean(event.title) ||
        "Événement";

    const subtitle =
        clean(campaign.sous_titre);

    const location =
        getDisplayLocation(event);

    const time =
        formatTimeRange(event);

    const tarif =
        clean(campaign.tarif);

    const inscription =
        clean(campaign.inscription);

    const lien =
        clean(campaign.lien_inscription);

    const image =
        clean(campaign.image);

    const campaignLogo =
        clean(campaign.logo);

    const status =
        getStatus(event);

    const dateText =
        formatShortDate(date);

    // ------------------------------------------------
    // IMAGE
    // ------------------------------------------------

    let imageHtml = "";

    if (image) {

        imageHtml = `
            <div class="eventImage">
                <img
                    src="${escapeHtml(image)}"
                    alt=""
                    loading="eager"
                    crossorigin="anonymous"
                >
            </div>
        `;

    } else {

        imageHtml = `
            <div class="eventImage eventImageEmpty">
                <img
                    src="img/logo-etabli.svg"
                    alt=""
                >
            </div>
        `;
    }


    // ------------------------------------------------
    // INFORMATIONS
    // ------------------------------------------------

    let infoHtml = "";

    infoHtml += createInfoLine(
        "📅",
        dateText
    );

    infoHtml += createInfoLine(
        "🕐",
        time
    );

    infoHtml += createInfoLine(
        "📍",
        location
    );

    infoHtml += createInfoLine(
        "💶",
        tarif
    );

    infoHtml += createInfoLine(
        "💬",
        inscription
    );

    if (lien) {

        infoHtml += `
            <div class="eventInfo eventRegistration">
                <span class="eventInfoIcon">🔗</span>
                <span class="eventInfoText">
                    Réservation en ligne
                </span>
            </div>
        `;
    }


    if (status) {

        infoHtml += `
            <div class="eventStatus">
                ${escapeHtml(status)}
            </div>
        `;
    }


    // ------------------------------------------------
    // LOGO CAMPAGNE
    // ------------------------------------------------

    let campaignLogoHtml = "";

    if (campaignLogo) {

        campaignLogoHtml = `
            <div class="campaignLogo">
                <img
                    src="${escapeHtml(campaignLogo)}"
                    alt=""
                    crossorigin="anonymous"
                >
            </div>
        `;
    }


    // ------------------------------------------------
    // SOUS-TITRE
    // ------------------------------------------------

    let subtitleHtml = "";

    if (subtitle) {

        subtitleHtml = `
            <div class="eventSubtitle">
                ${escapeHtml(subtitle)}
            </div>
        `;
    }


    // ------------------------------------------------
    // CARTE
    // ------------------------------------------------

    return `
        <article
            class="eventCard"
            data-index="${index}"
        >

            ${imageHtml}

            <div class="eventContent">

                <div class="eventTitle">
                    ${escapeHtml(title)}
                </div>

                ${subtitleHtml}

                <div class="eventInfos">
                    ${infoHtml}
                </div>

                ${campaignLogoHtml}

            </div>

        </article>
    `;
}


// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

function getPageConfig() {

    const body = document.body;

    const association =
        clean(body.dataset.association).toLowerCase() || "lel";

    const format =
        clean(body.dataset.format).toLowerCase() || "affiche";

    const config =
        CONFIG[association] || CONFIG.lel;

    return {
        association,
        format,
        config
    };
}


// --------------------------------------------------
// CHARGEMENT
// --------------------------------------------------

async function loadEvents() {

    const {
        association,
        format,
        config
    } = getPageConfig();


    const container =
        document.getElementById("eventGrid");

    const titleElement =
        document.getElementById("associationName");

    const countElement =
        document.getElementById("eventCount");

    if (!container) {

        console.error(
            "agenda-association.js : #eventGrid introuvable."
        );

        return;
    }


    // ------------------------------------------------
    // TITRE
    // ------------------------------------------------

    if (titleElement) {

        titleElement.textContent =
            config.name;
    }


    // ------------------------------------------------
    // COULEUR
    // ------------------------------------------------

    document.documentElement.style
        .setProperty(
            "--association-accent",
            config.accent
        );


    try {

        const response =
            await fetch(
                `${DATA_URL}?t=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        // ------------------------------------------------
        // AGENDA
        // ------------------------------------------------

        let events = Array.isArray(data)
            ? data
            : (
                Array.isArray(data.events)
                    ? data.events
                    : []
            );


        // ------------------------------------------------
        // FILTRE ASSOCIATION
        // ------------------------------------------------

        events = events.filter(event => {

            const calendar =
                clean(event.calendar);

            return config.calendars.some(
                allowed =>
                    normalize(allowed) ===
                    normalize(calendar)
            );
        });


        // ------------------------------------------------
        // FILTRE EVENEMENTS FUTURS
        // ------------------------------------------------

        const now =
            new Date();

        events = events.filter(event => {

            const start =
                getStartDate(event);

            return start && start >= now;
        });


        // ------------------------------------------------
        // TRI CHRONOLOGIQUE
        // ------------------------------------------------

        events.sort((a, b) => {

            const dateA =
                getStartDate(a);

            const dateB =
                getStartDate(b);

            return dateA - dateB;
        });


        // ------------------------------------------------
        // MODE PAGE
        // ------------------------------------------------

        const params =
            new URLSearchParams(
                window.location.search
            );

        const pageParam =
            params.get("page");


        let displayEvents = [];
        let pageMode = false;


        if (pageParam !== null) {

            const page =
                parseInt(pageParam, 10);

            if (
                Number.isInteger(page) &&
                page >= 1
            ) {

                pageMode = true;

                const index =
                    page - 1;

                if (
                    index >= 0 &&
                    index < events.length
                ) {

                    displayEvents = [
                        events[index]
                    ];

                } else {

                    displayEvents = [];
                }
            }

        }


        // ------------------------------------------------
        // MODE NORMAL
        // ------------------------------------------------

        if (!pageMode) {

            const limit =
                LIMITS[format] ||
                LIMITS.affiche;

            displayEvents =
                events.slice(0, limit);
        }


        // ------------------------------------------------
        // COMPTEUR
        // ------------------------------------------------

        if (countElement) {

            if (pageMode) {

                if (displayEvents.length) {

                    const page =
                        parseInt(pageParam, 10);

                    countElement.textContent =
                        `Événement ${page} / ${events.length}`;

                } else {

                    const page =
                        parseInt(pageParam, 10);

                    countElement.textContent =
                        `Aucun événement pour la page ${page}`;
                }

            } else {

                countElement.textContent =
                    `${displayEvents.length} événement${displayEvents.length > 1 ? "s" : ""}`;
            }
        }


        // ------------------------------------------------
        // AUCUN EVENEMENT
        // ------------------------------------------------

        if (!displayEvents.length) {

            container.innerHTML = `
                <div class="emptyAgenda">

                    <div class="emptyAgendaIcon">
                        📅
                    </div>

                    <div class="emptyAgendaTitle">
                        Aucun événement
                    </div>

                    <div class="emptyAgendaText">
                        ${
                            pageMode
                                ? "Cette page ne correspond à aucun événement."
                                : "Aucun événement à venir."
                        }
                    </div>

                </div>
            `;

            return;
        }


        // ------------------------------------------------
        // AFFICHAGE
        // ------------------------------------------------

        container.innerHTML =
            displayEvents
                .map(
                    (event, index) =>
                        renderEvent(
                            event,
                            index
                        )
                )
                .join("");


        // ------------------------------------------------
        // IMAGES
        // ------------------------------------------------

        const images =
            container.querySelectorAll("img");

        await Promise.all(
            Array.from(images).map(img => {

                if (img.complete) {
                    return Promise.resolve();
                }

                return new Promise(resolve => {

                    img.addEventListener(
                        "load",
                        resolve,
                        {
                            once: true
                        }
                    );

                    img.addEventListener(
                        "error",
                        resolve,
                        {
                            once: true
                        }
                    );
                });
            })
        );


        // ------------------------------------------------
        // INFORMATIONS PAGE
        // ------------------------------------------------

        document.body.classList.add(
            "agenda-loaded"
        );

    } catch (error) {

        console.error(
            "Erreur chargement agenda :",
            error
        );

        container.innerHTML = `
            <div class="emptyAgenda">

                <div class="emptyAgendaIcon">
                    ⚠️
                </div>

                <div class="emptyAgendaTitle">
                    Erreur de chargement
                </div>

                <div class="emptyAgendaText">
                    Impossible de charger l'agenda.
                </div>

            </div>
        `;
    }
}


// --------------------------------------------------
// TELECHARGEMENT IMAGE
// --------------------------------------------------

async function downloadAgenda() {

    if (
        typeof html2canvas ===
        "undefined"
    ) {

        alert(
            "html2canvas n'est pas disponible."
        );

        return;
    }


    const screen =
        document.getElementById("screen");

    if (!screen) {
        return;
    }


    const toolbar =
        document.querySelector(
            ".downloadToolbar"
        );


    if (toolbar) {
        toolbar.style.display = "none";
    }


    const previousTransform =
        screen.style.transform;

    screen.style.transform =
        "none";


    try {

        await document.fonts.ready;


        const images =
            screen.querySelectorAll("img");


        await Promise.all(
            Array.from(images).map(img => {

                if (img.complete) {
                    return Promise.resolve();
                }

                return new Promise(resolve => {

                    img.addEventListener(
                        "load",
                        resolve,
                        {
                            once: true
                        }
                    );

                    img.addEventListener(
                        "error",
                        resolve,
                        {
                            once: true
                        }
                    );
                });
            })
        );


        const canvas =
            await html2canvas(
                screen,
                {
                    backgroundColor: "#0a1330",
                    useCORS: true,
                    allowTaint: false,
                    scale: 1,
                    width: screen.offsetWidth,
                    height: screen.offsetHeight,
                    logging: false
                }
            );


        const link =
            document.createElement("a");

        const association =
            document.body.dataset.association ||
            "lel";

        const format =
            document.body.dataset.format ||
            "affiche";

        const params =
            new URLSearchParams(
                window.location.search
            );

        const page =
            params.get("page");


        let filename =
            `agenda-${association}-${format}`;

        if (page) {
            filename += `-page-${page}`;
        }

        filename += ".png";


        link.download =
            filename;

        link.href =
            canvas.toDataURL(
                "image/png"
            );

        link.click();

    } catch (error) {

        console.error(
            "Erreur téléchargement :",
            error
        );

        alert(
            "Impossible de générer l'image."
        );

    } finally {

        screen.style.transform =
            previousTransform;

        if (toolbar) {
            toolbar.style.display = "";
        }
    }
}


// --------------------------------------------------
// INITIALISATION
// --------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadEvents();

        const downloadButton =
            document.getElementById(
                "downloadAgenda"
            );

        if (downloadButton) {

            downloadButton.addEventListener(
                "click",
                downloadAgenda
            );
        }
    }
);