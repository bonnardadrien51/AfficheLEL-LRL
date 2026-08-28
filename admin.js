```js
const GITHUB_OWNER =
    "bonnardadrien51";

const GITHUB_REPO =
    "AfficheLEL-LRL";

const OVERRIDES_PATH =
    "status-overrides.json";

const AGENDA_PATH =
    "agenda.json";


/* =========================================================
   TOKEN GITHUB
========================================================= */

function getToken(){

    return (
        localStorage.getItem(
            "gh_token"
        ) || ""
    );

}


function setToken(token){

    if(token){

        localStorage.setItem(
            "gh_token",
            token
        );

    } else {

        localStorage.removeItem(
            "gh_token"
        );

    }

    refreshTokenBar();

}


function refreshTokenBar(){

    const token =
        getToken();

    document.getElementById(
        "tokenStatus"
    ).textContent =
        token
            ? "Token enregistré ✓"
            : "Aucun token enregistré";

    document.getElementById(
        "tokenInput"
    ).value = "";

}


document
    .getElementById("tokenSave")
    .addEventListener(
        "click",
        () => {

            const value =
                document
                    .getElementById(
                        "tokenInput"
                    )
                    .value
                    .trim();


            if(value){

                setToken(
                    value
                );

                loadEvents();

            }

        }
    );


document
    .getElementById("tokenClear")
    .addEventListener(
        "click",
        () => {

            setToken("");

        }
    );


/* =========================================================
   BASE64 UTF-8
========================================================= */

function utf8ToBase64(str){

    return btoa(
        unescape(
            encodeURIComponent(
                str
            )
        )
    );

}


function base64ToUtf8(str){

    return decodeURIComponent(
        escape(
            atob(str)
        )
    );

}


/* =========================================================
   GITHUB
========================================================= */

async function githubGetFile(){

    const headers = {

        "Accept":
            "application/vnd.github+json"

    };


    const token =
        getToken();


    if(token){

        headers[
            "Authorization"
        ] =
            "Bearer " + token;

    }


    const url =
        `https://api.github.com/repos/` +
        `${GITHUB_OWNER}/` +
        `${GITHUB_REPO}/contents/` +
        `${OVERRIDES_PATH}`;


    const response =
        await fetch(
            url,
            {
                headers
            }
        );


    if(!response.ok){

        throw new Error(
            "Impossible de lire " +
            OVERRIDES_PATH +
            " (code " +
            response.status +
            ")"
        );

    }


    const data =
        await response.json();


    const content =
        JSON.parse(
            base64ToUtf8(
                data.content
            )
        );


    return {

        content,

        sha:
            data.sha

    };

}


/* =========================================================
   ÉCRITURE GITHUB
========================================================= */

async function githubPutFile(
    newContent,
    sha
){

    const token =
        getToken();


    if(!token){

        throw new Error(
            "Aucun token GitHub enregistré."
        );

    }


    const url =
        `https://api.github.com/repos/` +
        `${GITHUB_OWNER}/` +
        `${GITHUB_REPO}/contents/` +
        `${OVERRIDES_PATH}`;


    const body = {

        message:
            "🔧 Mise à jour statut événement",

        content:
            utf8ToBase64(
                JSON.stringify(
                    newContent,
                    null,
                    2
                )
            ),

        sha

    };


    const response =
        await fetch(
            url,
            {

                method:
                    "PUT",

                headers: {

                    "Accept":
                        "application/vnd.github+json",

                    "Authorization":
                        "Bearer " + token,

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        body
                    )

            }
        );


    if(!response.ok){

        const text =
            await response.text();


        throw new Error(
            "Échec de la sauvegarde " +
            "(code " +
            response.status +
            ") : " +
            text
        );

    }

}


/* =========================================================
   FORMATAGE
========================================================= */

function formatDate(
    value
){

    const date =
        new Date(value);


    return date.toLocaleDateString(
        "fr-FR",
        {

            weekday:
                "long",

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            timeZone:
                "Europe/Paris"

        }
    );

}


function formatTime(
    value
){

    const date =
        new Date(value);


    return date.toLocaleTimeString(
        "fr-FR",
        {

            hour:
                "2-digit",

            minute:
                "2-digit",

            timeZone:
                "Europe/Paris"

        }
    );

}


/* =========================================================
   COULEUR CALENDRIER
========================================================= */

function hexToRgba(
    hex,
    alpha
){

    if(
        !hex ||
        !/^#[0-9a-f]{6}$/i.test(hex)
    ){

        return `rgba(255,255,255,${alpha})`;

    }


    const r =
        parseInt(
            hex.substring(1,3),
            16
        );

    const g =
        parseInt(
            hex.substring(3,5),
            16
        );

    const b =
        parseInt(
            hex.substring(5,7),
            16
        );


    return `rgba(${r},${g},${b},${alpha})`;

}


/* =========================================================
   STATUT ACTIF
========================================================= */

function highlightActive(
    card,
    status
){

    card
        .querySelectorAll(
            ".statusButtons button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.status ===
                        status
                );

            }
        );

}


/* =========================================================
   MODIFICATION DU STATUT
========================================================= */

async function setStatus(
    uid,
    newStatus,
    card
){

    if(!uid){

        showError(
            card,
            "Cet événement n'a pas de UID Google Calendar."
        );

        return;

    }


    card.classList.add(
        "saving"
    );


    const oldError =
        card.querySelector(
            ".errorMsg"
        );


    if(oldError){

        oldError.remove();

    }


    try{

        const {
            content,
            sha
        } =
            await githubGetFile();


        if(newStatus){

            content[uid] = {

                statut:
                    newStatus

            };

        } else {

            delete content[
                uid
            ];

        }


        await githubPutFile(
            content,
            sha
        );


        highlightActive(
            card,
            newStatus
        );


    } catch(error){

        console.error(
            error
        );


        showError(
            card,
            error.message
        );

    } finally {

        card.classList.remove(
            "saving"
        );

    }

}


/* =========================================================
   ERREUR
========================================================= */

function showError(
    card,
    message
){

    const oldError =
        card.querySelector(
            ".errorMsg"
        );


    if(oldError){

        oldError.remove();

    }


    const error =
        document.createElement(
            "div"
        );


    error.className =
        "errorMsg";


    error.textContent =
        message;


    card.appendChild(
        error
    );

}


/* =========================================================
   CRÉATION D'UNE CARTE
========================================================= */

function createEventCard(
    event,
    overrides
){

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "eventCard";


    const campaign =
        event.campaign || {};


    const currentStatus =
        (
            overrides[
                event.uid
            ] &&
            overrides[
                event.uid
            ].statut
        ) ||
        campaign.statut ||
        "";


    const header =
        document.createElement(
            "div"
        );


    header.className =
        "eventHeader";


    /* -------------------------------------------------------
       ICÔNE
    ------------------------------------------------------- */

    if(event.icon){

        const icon =
            document.createElement(
                "img"
            );


        icon.className =
            "eventIcon";


        icon.src =
            "img/" +
            event.icon;


        icon.alt =
            "";


        header.appendChild(
            icon
        );

    }


    /* -------------------------------------------------------
       CONTENU
    ------------------------------------------------------- */

    const main =
        document.createElement(
            "div"
        );


    main.className =
        "eventMain";


    const title =
        document.createElement(
            "div"
        );


    title.className =
        "eventTitle";


    title.textContent =
        event.title ||
        "Événement sans titre";


    main.appendChild(
        title
    );


    /* -------------------------------------------------------
       TITRE CAMPAGNE
    ------------------------------------------------------- */

    if(campaign.titre){

        const campaignTitle =
            document.createElement(
                "div"
            );


        campaignTitle.className =
            "eventCampaign";


        campaignTitle.textContent =
            campaign.titre;


        main.appendChild(
            campaignTitle
        );

    }


    /* -------------------------------------------------------
       DATE / HEURE
    ------------------------------------------------------- */

    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "eventMeta";


    let metaText =
        `${formatDate(event.start)} – ${formatTime(event.start)}`;


    if(event.end){

        metaText +=
            ` → ${formatTime(event.end)}`;

    }


    if(event.location){

        metaText +=
            ` · ${event.location}`;

    }


    meta.textContent =
        metaText;


    main.appendChild(
        meta
    );


    /* -------------------------------------------------------
       LABEL
    ------------------------------------------------------- */

    if(event.label){

        const label =
            document.createElement(
                "span"
            );


        label.className =
            "eventLabel";


        label.textContent =
            event.label;


        label.style.background =
            hexToRgba(
                event.color,
                .25
            );


        label.style.color =
            event.color ||
            "white";


        main.appendChild(
            label
        );

    }


    header.appendChild(
        main
    );


    card.appendChild(
        header
    );


    /* =======================================================
       BOUTONS
    ======================================================= */

    const buttons =
        document.createElement(
            "div"
        );


    buttons.className =
        "statusButtons";


    const statuses = [

        {
            label:
                "Aucun",

            value:
                ""

        },

        {
            label:
                "Annulé",

            value:
                "Annulé"

        },

        {
            label:
                "Complet",

            value:
                "Complet"

        },

        {
            label:
                "Reporté",

            value:
                "Reporté"

        }

    ];


    statuses.forEach(
        status => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.dataset.status =
                status.value;


            button.textContent =
                status.label;


            button.addEventListener(
                "click",
                () => {

                    setStatus(
                        event.uid,
                        status.value,
                        card
                    );

                }
            );


            buttons.appendChild(
                button
            );

        }
    );


    card.appendChild(
        buttons
    );


    highlightActive(
        card,
        currentStatus
    );


    return card;

}


/* =========================================================
   CHARGEMENT
========================================================= */

let allEvents = [];

let overridesContent = {};


async function loadEvents(){

    const list =
        document.getElementById(
            "eventList"
        );


    list.textContent =
        "Chargement des événements…";


    /* -------------------------------------------------------
       AGENDA
    ------------------------------------------------------- */

    try{

        const response =
            await fetch(
                AGENDA_PATH +
                "?t=" +
                Date.now()
            );


        if(!response.ok){

            throw new Error(
                "Erreur HTTP " +
                response.status
            );

        }


        const json =
            await response.json();


        allEvents =
            json.events || [];


    } catch(error){

        list.innerHTML =
            `<div class="emptyMessage">
                Impossible de charger agenda.json.
                <br>
                ${error.message}
            </div>`;

        return;

    }


    /* -------------------------------------------------------
       OVERRIDES
    ------------------------------------------------------- */

    try{

        const {
            content
        } =
            await githubGetFile();


        overridesContent =
            content || {};


    } catch(error){

        console.warn(
            "Lecture des overrides impossible :",
            error.message
        );


        overridesContent =
            {};

    }


    /* -------------------------------------------------------
       FILTRE CALENDRIERS
    ------------------------------------------------------- */

    populateLabelFilter();


    renderEvents();

}


/* =========================================================
   FILTRE CALENDRIER
========================================================= */

function populateLabelFilter(){

    const select =
        document.getElementById(
            "labelFilter"
        );


    const labels =
        [
            ...new Set(
                allEvents
                    .map(
                        event =>
                            event.label
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a,b) =>
                a.localeCompare(
                    b
                )
        );


    select.innerHTML =
        `<option value="">
            Tous les calendriers
        </option>`;


    labels.forEach(
        label => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                label;


            option.textContent =
                label;


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   AFFICHAGE
========================================================= */

function renderEvents(){

    const list =
        document.getElementById(
            "eventList"
        );


    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .trim()
            .toLowerCase();


    const label =
        document
            .getElementById(
                "labelFilter"
            )
            .value;


    const filtered =
        allEvents.filter(
            event => {

                const campaign =
                    event.campaign ||
                    {};


                const searchText =
                    [
                        event.title,
                        event.location,
                        event.label,
                        campaign.titre,
                        campaign.lieu
                    ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                const matchSearch =
                    !search ||
                    searchText.includes(
                        search
                    );


                const matchLabel =
                    !label ||
                    event.label ===
                        label;


                return (
                    matchSearch &&
                    matchLabel
                );

            }
        );


    list.innerHTML =
        "";


    if(!filtered.length){

        list.innerHTML =
            `<div class="emptyMessage">
                Aucun événement ne correspond aux critères.
            </div>`;

        return;

    }


    filtered.forEach(
        event => {

            list.appendChild(
                createEventCard(
                    event,
                    overridesContent
                )
            );

        }
    );

}


/* =========================================================
   RECHERCHE / FILTRE
========================================================= */

document
    .getElementById(
        "searchInput"
    )
    .addEventListener(
        "input",
        renderEvents
    );


document
    .getElementById(
        "labelFilter"
    )
    .addEventListener(
        "change",
        renderEvents
    );


/* =========================================================
   INITIALISATION
========================================================= */

refreshTokenBar();

loadEvents();
```
