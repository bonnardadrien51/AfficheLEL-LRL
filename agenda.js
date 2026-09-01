// ==========================================================
// AGENDA - AFFICHES CARREE / FACEBOOK
// ==========================================================
// Chaque page peut définir window.AGENDA_CONFIG avant
// d'inclure agenda.js.
//
// Exemple :
//
// window.AGENDA_CONFIG = {
//     dataSource: "agenda.json",
//     filterLabel: "Soirée adhérents",
//     maxEvents: 4,
//     downloadName: "affiche-carre.png"
// };
//
// ==========================================================


const CONFIG = Object.assign({

    dataSource: "agenda.json",

    // Une chaîne, un tableau de chaînes,
    // ou null pour ne rien filtrer.
    filterLabel: null,

    maxEvents: 6,

    downloadName: "couverture-facebook.png"

}, window.AGENDA_CONFIG || {});


// ==========================================================
// MOIS
// ==========================================================

const months = [

    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"

];


const shortMonths = [

    "JAN",
    "FÉV",
    "MAR",
    "AVR",
    "MAI",
    "JUN",
    "JUL",
    "AOÛ",
    "SEP",
    "OCT",
    "NOV",
    "DÉC"

];


const shortWeekdays = [

    "Dim",
    "Lun",
    "Mar",
    "Mer",
    "Jeu",
    "Ven",
    "Sam"

];


// ==========================================================
// INITIALISATION
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

    loadAgenda();


    const refreshBtn =
        document.getElementById("refreshBtn");

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            loadAgenda
        );

    }


    const downloadBtn =
        document.getElementById("downloadBtn");

    if (downloadBtn) {

        downloadBtn.addEventListener(
            "click",
            exportPNG
        );

    }

});


// ==========================================================
// CHARGEMENT AGENDA
// ==========================================================

async function loadAgenda() {

    try {

        const response =
            await fetch(CONFIG.dataSource);


        if (!response.ok) {

            throw new Error(
                `Erreur HTTP ${response.status}`
            );

        }


        const json =
            await response.json();


        const now =
            new Date();


        // --------------------------------------------------
        // FILTRE LABEL
        // --------------------------------------------------

        const allowedLabels =
            CONFIG.filterLabel === null

                ? null

                : Array.isArray(CONFIG.filterLabel)

                    ? CONFIG.filterLabel

                    : [CONFIG.filterLabel];


        // --------------------------------------------------
        // PREPARATION DES EVENEMENTS
        // --------------------------------------------------

        let events =
            json.events

                .map(event => {

                    return {

                        ...event,

                        date:
                            new Date(event.start)

                    };

                })

                .filter(event => {

                    return event.date >= now;

                })

                .filter(event => {

                    return (
                        allowedLabels === null ||
                        allowedLabels.includes(event.label)
                    );

                })

                .sort((a, b) => {

                    return a.date - b.date;

                })

                .slice(
                    0,
                    CONFIG.maxEvents
                );


        // --------------------------------------------------
        // AFFICHAGE
        // --------------------------------------------------

        buildEvents(events);


        // --------------------------------------------------
        // DATE DE MISE A JOUR
        // --------------------------------------------------

        const update =
            document.getElementById("update");


        if (update) {

            update.innerHTML =
                "Dernière mise à jour : " +
                (json.updated || "");

        }


        // --------------------------------------------------
        // MOIS PRINCIPAL
        // --------------------------------------------------

        const currentMonth =
            document.getElementById("currentMonth");


        if (
            currentMonth &&
            events.length
        ) {

            currentMonth.innerHTML =

                months[
                    events[0].date.getMonth()
                ]

                + " "

                +

                events[0].date.getFullYear();

        }


    } catch (error) {

        console.error(
            "Erreur chargement agenda :",
            error
        );


        const container =
            document.getElementById("events");


        if (container) {

            container.innerHTML = `

                <div class="agenda-error">

                    Impossible de charger
                    les événements.

                </div>

            `;

        }

    }

}


// ==========================================================
// FORMATAGE DATE
// ==========================================================

function formatDate(eventDate) {

    const day =
        String(
            eventDate.getDate()
        ).padStart(2, "0");


    const month =
        String(
            eventDate.getMonth() + 1
        ).padStart(2, "0");


    const year =
        eventDate.getFullYear();


    return `${day}/${month}/${year}`;

}


// ==========================================================
// FORMATAGE HEURE
// ==========================================================

function formatHour(date) {

    return new Date(date)
        .toLocaleTimeString(
            "fr-FR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

}


// ==========================================================
// RECUPERATION CAMPAGNE
// ==========================================================

function getCampaign(event) {

    if (
        !event.campaign ||
        typeof event.campaign !== "object"
    ) {

        return {};

    }


    return event.campaign;

}


// ==========================================================
// CONSTRUCTION DES EVENEMENTS
// ==========================================================

function buildEvents(events) {

    const container =
        document.getElementById("events");


    if (!container) return;


    container.innerHTML = "";


    events.forEach(event => {


        // --------------------------------------------------
        // DATE
        // --------------------------------------------------

        const eventDate =
            event.date;


        const day =
            eventDate.getDate();


        const weekday =
            shortWeekdays[
                eventDate.getDay()
            ];


        const month =
            shortMonths[
                eventDate.getMonth()
            ];


        const fullDate =
            formatDate(eventDate);


        // --------------------------------------------------
        // HEURES
        // --------------------------------------------------

        const startHour =
            formatHour(event.start);


        const endHour =
            formatHour(event.end);


        // --------------------------------------------------
        // CAMPAGNE
        // --------------------------------------------------

        const campaign =
            getCampaign(event);


        // --------------------------------------------------
        // TITRE GENERAL
        // --------------------------------------------------

        const campaignTitle =
            (
                campaign.titre ||
                ""
            ).trim();


        // --------------------------------------------------
        // SOUS-TITRE
        // --------------------------------------------------

        const campaignSubtitle =
            (
                campaign.sous_titre ??
                campaign["sous-titre"] ??
                ""
            ).trim();


        // --------------------------------------------------
        // TITRE DE SECOURS
        // --------------------------------------------------
        //
        // Si aucun titre général et aucun sous-titre
        // n'est renseigné dans la campagne,
        // on utilise le titre Google Calendar.
        //
        // Si seul le titre général existe :
        // titre général affiché + titre Google Calendar
        // en sous-titre.
        //
        // Si titre + sous-titre existent :
        // titre général + sous-titre.
        //
        // --------------------------------------------------

        let displayTitle;
        let displaySubtitle;


        if (campaignTitle) {

            displayTitle =
                campaignTitle;


            displaySubtitle =
                campaignSubtitle ||
                event.title ||
                "";

        } else {

            displayTitle =
                event.title ||
                "";


            displaySubtitle =
                campaignSubtitle;

        }


        // --------------------------------------------------
        // LABEL
        // --------------------------------------------------

        const badge =
            event.label || "";


        // --------------------------------------------------
        // COULEUR
        // --------------------------------------------------

        const color =
            event.color ||
            "#0d4c72";


        // --------------------------------------------------
        // LIEU
        // --------------------------------------------------

        const location =
            event.location ||
            "";


        // --------------------------------------------------
        // ICONE
        // --------------------------------------------------

        const icon =
            event.icon ||
            "";


        // --------------------------------------------------
        // CARTE
        // --------------------------------------------------

        const card =
            document.createElement("div");


        card.className =
            "event";


        card.innerHTML = `

            <!-- DATE COLOREE -->

            <div
                class="date"
                style="background:${escapeHtml(color)};"
            >

                <div class="weekday">
                    ${escapeHtml(weekday)}
                </div>

                <div class="day">
                    ${escapeHtml(day)}
                </div>

                <div class="month">
                    ${escapeHtml(month)}
                </div>

            </div>


            <!-- ICONE CATEGORIE -->

            <div class="left">

                ${
                    icon

                        ? `

                            <img
                                class="categoryIcon"
                                src="img/categories/${escapeAttribute(icon)}"
                                alt=""
                            >

                          `

                        : ""

                }

            </div>


            <!-- CONTENU -->

            <div class="content">


                <!-- BADGE -->

                <div
                    class="badge"
                    style="background:${escapeHtml(color)};"
                >

                    ${escapeHtml(badge)}

                </div>


                <!-- TITRE -->

                <div class="title">

                    ${escapeHtml(displayTitle)}

                </div>


                <!-- SOUS-TITRE -->

                ${
                    displaySubtitle

                        ? `

                            <div class="subtitle">

                                ${escapeHtml(
                                    displaySubtitle
                                )}

                            </div>

                          `

                        : ""

                }


                <!-- INFORMATIONS -->

                <div class="info">


                    ${
                        location

                            ? `

                                <span class="location">

                                    📍
                                    ${escapeHtml(location)}

                                </span>

                              `

                            : ""

                    }


                    <span class="time">

                        📅
                        ${escapeHtml(fullDate)}

                        ·

                        ${escapeHtml(startHour)}
                        à
                        ${escapeHtml(endHour)}

                    </span>


                </div>


            </div>

        `;


        container.appendChild(card);

    });

}


// ==========================================================
// SECURISATION HTML
// ==========================================================

function escapeHtml(value) {

    return String(value ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(value) {

    return escapeHtml(value);

}


// ==========================================================
// EXPORT PNG
// ==========================================================

function exportPNG() {

    const toolbar =
        document.querySelector(".toolbar");


    if (toolbar) {

        toolbar.style.display =
            "none";

    }


    const cover =
        document.getElementById("cover");


    if (!cover) {

        if (toolbar) {

            toolbar.style.display =
                "flex";

        }

        return;

    }


    // ------------------------------------------------------
    // ATTENDRE LES IMAGES
    // ------------------------------------------------------

    const images =
        Array.from(
            cover.querySelectorAll("img")
        );


    const whenReady =
        images.map(img => {

            if (
                img.complete &&
                img.naturalWidth !== 0
            ) {

                return Promise.resolve();

            }


            return new Promise(resolve => {

                img.addEventListener(
                    "load",
                    resolve,
                    { once: true }
                );


                img.addEventListener(
                    "error",
                    resolve,
                    { once: true }
                );

            });

        });


    // ------------------------------------------------------
    // CAPTURE
    // ------------------------------------------------------

    Promise.all(whenReady)

        .then(() => {

            return html2canvas(

                cover,

                {

                    scale: 2,

                    backgroundColor: null,

                    useCORS: true,

                    allowTaint: true,

                    imageTimeout: 0

                }

            );

        })

        .then(canvas => {


            if (toolbar) {

                toolbar.style.display =
                    "flex";

            }


            const link =
                document.createElement("a");


            link.download =
                CONFIG.downloadName;


            link.href =
                canvas.toDataURL(
                    "image/png"
                );


            link.click();

        })

        .catch(error => {

            console.error(
                "Erreur export PNG :",
                error
            );


            if (toolbar) {

                toolbar.style.display =
                    "flex";

            }

        });

}