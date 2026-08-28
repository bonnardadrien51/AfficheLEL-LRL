const DATA_URL =
    "agenda.json";

const OVERRIDES_URL =
    "status-overrides.json";


const REFRESH_MS =
    60 * 1000;

const CHECK_EVENTS_MS =
    10 * 1000;


const STATUS_COLORS = {

    "annulé":
        "#c0392b",

    "annule":
        "#c0392b",

    "complet":
        "#e08e0b",

    "reporté":
        "#6c5ce7",

    "reporte":
        "#6c5ce7"

};


const shortWeekdays = [

    "DIM",
    "LUN",
    "MAR",
    "MER",
    "JEU",
    "VEN",
    "SAM"

];


let allEvents = [];

let overrides = {};



/* ============================================================
   OUTILS
============================================================ */

function dateOnly(date) {

    return new Date(

        date.getFullYear(),

        date.getMonth(),

        date.getDate()

    );

}



function isFinished(event) {

    if (!event.end) {

        return false;

    }


    const end =
        new Date(event.end);


    return (
        end.getTime()
        <=
        Date.now()
    );

}



function formatHour(date) {

    const h =
        date.getHours();

    const m =
        date.getMinutes();


    return m === 0

        ? `${h}h`

        : `${h}h${String(m).padStart(2, "0")}`;

}



/* ============================================================
   TEXTE / HTML
============================================================ */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

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



/* ============================================================
   LIEU À AFFICHER
============================================================ */

function getDisplayLocation(event) {

    const campaign =
        event.campaign || {};


    /*
     affichage_lieu :

     1 = afficher le lieu du JSON
     2 = afficher le lieu Google Calendar
     3 = afficher les deux

     Si le champ n'existe pas,
     on conserve le comportement classique.
    */

    const mode =
        String(
            campaign.affichage_lieu || "3"
        );


    const customLocation =
        campaign.lieu || "";

    const calendarLocation =
        event.location || "";


    if (
        mode === "1"
    ) {

        return customLocation;

    }


    if (
        mode === "2"
    ) {

        return calendarLocation;

    }


    if (
        mode === "3"
    ) {

        if (
            customLocation &&
            calendarLocation &&
            customLocation !== calendarLocation
        ) {

            return (
                customLocation +
                " – " +
                calendarLocation
            );

        }


        return (
            customLocation ||
            calendarLocation
        );

    }


    return (
        customLocation ||
        calendarLocation
    );

}



/* ============================================================
   STATUT
============================================================ */

function getStatus(event) {

    const override =
        overrides[event.uid];


    if (
        override &&
        override.statut !== undefined
    ) {

        return override.statut;

    }


    if (
        event.campaign &&
        event.campaign.statut
    ) {

        return event.campaign.statut;

    }


    return "";

}



/* ============================================================
   PROCHAIN JOUR
============================================================ */

function findNextEventDay() {

    const today =
        dateOnly(
            new Date()
        );


    const futureEvents =
        allEvents

            .filter(
                event =>
                    event.start &&
                    !isFinished(event)
            )

            .filter(
                event => {

                    const eventDay =
                        dateOnly(
                            new Date(
                                event.start
                            )
                        );


                    return (
                        eventDay.getTime()
                        >
                        today.getTime()
                    );

                }
            );


    if (
        !futureEvents.length
    ) {

        return null;

    }


    const dates =
        futureEvents

            .map(
                event =>
                    dateOnly(
                        new Date(
                            event.start
                        )
                    )
            )

            .sort(
                (a, b) =>
                    a.getTime()
                    -
                    b.getTime()
            );


    return dates[0];

}



/* ============================================================
   ÉVÉNEMENTS DU JOUR
============================================================ */

function getNextDayEvents(
    nextDay
) {

    if (!nextDay) {

        return [];

    }


    return allEvents

        .filter(
            event =>
                event.start
        )

        .filter(
            event => {

                const eventDay =
                    dateOnly(
                        new Date(
                            event.start
                        )
                    );


                return (
                    eventDay.getTime()
                    ===
                    nextDay.getTime()
                );

            }
        )

        .filter(
            event =>
                !isFinished(event)
        )

        .sort(
            (a, b) =>
                new Date(a.start)
                -
                new Date(b.start)
        );

}



/* ============================================================
   CARTE
============================================================ */

function renderCard(event) {

    const start =
        new Date(
            event.start
        );


    const end =
        event.end
        ?
        new Date(
            event.end
        )
        :
        null;


    const campaign =
        event.campaign || {};


    const statut =
        getStatus(event);


    const normalizedStatus =
        statut
            .trim()
            .toLowerCase();


    const location =
        getDisplayLocation(
            event
        );


    const title =
        campaign.titre ||
        event.title ||
        "Événement";


    const image =
        campaign.image ||
        "";


    const badgeHtml =
        statut

        ?

        `
        <div
            class="statusBadge"
            style="
                background:
                ${
                    STATUS_COLORS[
                        normalizedStatus
                    ]
                    ||
                    "#c0392b"
                }
            "
        >
            ${escapeHtml(statut)}
        </div>
        `

        :

        "";


    const thumbHtml =
        image

        ?

        `
        <div class="thumb">

            <img
                src="${escapeHtml(image)}"
                alt=""
            >

        </div>
        `

        :

        "";


    const endHtml =
        end

        ?

        formatHour(end)

        :

        "";


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "eventCard";


    card.innerHTML = `

        <div class="date">

            <div class="weekday">
                ${shortWeekdays[start.getDay()]}
            </div>

            <div class="day">
                ${start.getDate()}
            </div>

        </div>


        ${thumbHtml}


        <div class="infoBlock">

            <div class="textCol">

                <div class="title">
                    ${escapeHtml(title)}
                </div>


                <div class="meta">

                    <svg
                        viewBox="0 0 24 24"
                        class="icon"
                    >

                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="none"
                            stroke="#3a4160"
                            stroke-width="2"
                        />

                        <path
                            d="M12 7v5l3.5 2"
                            fill="none"
                            stroke="#3a4160"
                            stroke-width="2"
                            stroke-linecap="round"
                        />

                    </svg>


                    <span>

                        ${formatHour(start)}

                        ${
                            endHtml
                            ?
                            ` – ${endHtml}`
                            :
                            ""
                        }

                    </span>


                    ${
                        location

                        ?

                        `
                        <svg
                            viewBox="0 0 24 24"
                            class="icon"
                        >

                            <path
                                d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"
                                fill="#e6392b"
                            />

                            <circle
                                cx="12"
                                cy="10"
                                r="3"
                                fill="white"
                            />

                        </svg>


                        <span>
                            ${escapeHtml(location)}
                        </span>
                        `

                        :

                        ""

                    }

                </div>

            </div>


            ${badgeHtml}

        </div>

    `;


    return card;

}



/* ============================================================
   AFFICHAGE
============================================================ */

function renderEvents() {

    const grid =
        document.getElementById(
            "eventGrid"
        );


    const noEvent =
        document.getElementById(
            "noEvent"
        );


    const nextDay =
        findNextEventDay();


    if (!nextDay) {

        grid.innerHTML =
            "";

        noEvent.style.display =
            "block";

        document.body.classList.add(
            "empty"
        );

        document.getElementById(
            "pageDate"
        ).textContent =
            "";

        return;

    }


    const events =
        getNextDayEvents(
            nextDay
        );


    if (!events.length) {

        grid.innerHTML =
            "";

        noEvent.style.display =
            "block";

        document.body.classList.add(
            "empty"
        );

        return;

    }


    noEvent.style.display =
        "none";


    document.body.classList.remove(
        "empty"
    );


    document.getElementById(
        "pageDate"
    ).textContent =

        nextDay.toLocaleDateString(
            "fr-FR",
            {

                weekday:
                    "long",

                day:
                    "2-digit",

                month:
                    "long",

                year:
                    "numeric"

            }
        );


    grid.innerHTML =
        "";


    events.forEach(
        event => {

            grid.appendChild(
                renderCard(event)
            );

        }
    );

}



/* ============================================================
   CHARGEMENT
============================================================ */

async function loadEvents() {

    try {

        const response =
            await fetch(
                DATA_URL +
                "?t=" +
                Date.now()
            );


        if (!response.ok) {

            throw new Error(
                "Impossible de charger agenda.json"
            );

        }


        const json =
            await response.json();


        allEvents =
            json.events || [];


        try {

            const overrideResponse =
                await fetch(
                    OVERRIDES_URL +
                    "?t=" +
                    Date.now()
                );


            if (
                overrideResponse.ok
            ) {

                overrides =
                    await overrideResponse.json();

            }
            else {

                overrides = {};

            }

        }
        catch (error) {

            overrides = {};

        }


        renderEvents();

    }
    catch (error) {

        console.error(
            "Erreur de chargement :",
            error
        );


        document.getElementById(
            "eventGrid"
        ).innerHTML =
            "";


        document.getElementById(
            "noEvent"
        ).style.display =
            "block";

    }

}



/* ============================================================
   INITIALISATION
============================================================ */

loadEvents();


setInterval(
    loadEvents,
    REFRESH_MS
);


setInterval(
    renderEvents,
    CHECK_EVENTS_MS
);
