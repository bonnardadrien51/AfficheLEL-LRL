// Le design est fait pour une taille de référence définie par le CSS
// de chaque page (via la largeur/hauteur fixes de #screen) ; on calcule
// le facteur d'échelle pour que ça tienne dans n'importe quelle fenêtre
// (plein écran ou non), sans jamais déformer les proportions internes.
function applyScale(){

    const screen = document.getElementById("screen");

    if(!screen) return;

    // Dimensions de référence lues directement sur l'élément
    // (celles fixées dans le CSS de la page : 1920x1080, 1080x1080,
    // 1640x624...), donc ce script n'a rien à connaître du format.
    const refWidth = screen.offsetWidth;
    const refHeight = screen.offsetHeight;

    if(!refWidth || !refHeight) return;

    const scale = Math.min(
        window.innerWidth / refWidth,
        window.innerHeight / refHeight
    );

    screen.style.transform = `scale(${scale})`;

}

window.addEventListener("resize", applyScale);
applyScale();


const DATA_URL = "agenda.json";
const OVERRIDES_URL = "status-overrides.json";

// Réinterroge events.json + status-overrides.json à cet intervalle.
// events.json n'est régénéré côté serveur que toutes les 30 min, mais
// status-overrides.json (modifié depuis la page admin) doit remonter
// vite ; comme les deux fichiers sont petits, on vérifie souvent.
const REFRESH_DATA_MS = 60 * 1000;

// Recalcule le compte à rebours à cet intervalle, sans refaire d'appel réseau.
const REFRESH_COUNTDOWN_MS = 30 * 1000;

let currentEvent = null;


function formatHour(date){

    const h = date.getHours();
    const m = date.getMinutes();

    return m === 0
        ? `${h}h`
        : `${h}h${String(m).padStart(2,"0")}`;

}


function formatDate(date){

    return date.toLocaleDateString("fr-FR", {
        day:"2-digit",
        month:"2-digit",
        year:"numeric",
        timeZone:"Europe/Paris"
    });

}


function momentOfDay(hour){

    if(hour < 12) return "matin";
    if(hour < 18) return "après-midi";
    return "soir";

}


function dateOnly(d){

    return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
    );

}


function computeCountdown(event){

    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);

    if(now >= start && now <= end){

        return "En cours";

    }

    const diffMs = start - now;

    if(diffMs <= 0){

        return null; // événement terminé, ne devrait plus être affiché

    }

    // Différence en jours calendaires (et non en durée brute /24h),
    // pour que "demain soir" reste "demain" même si on est encore
    // aujourd'hui à moins de 24h de l'événement.
    const dayDiff = Math.round(
        (dateOnly(start) - dateOnly(now)) / 86400000
    );

    if(dayDiff > 1){

        const days =
            Math.floor(diffMs / 86400000);

        const hours =
            Math.floor(
                (diffMs % 86400000) / 3600000
            );

        return `Dans ${days} jours et ${hours} heures`;

    }

    if(dayDiff === 1){

        return `Demain ${momentOfDay(start.getHours())}`;

    }

    // dayDiff === 0 : plus tard aujourd'hui
    const hoursLeft =
        Math.max(
            1,
            Math.round(diffMs / 3600000)
        );

    return `Dans ${hoursLeft} heure${hoursLeft > 1 ? "s" : ""}`;

}


// ============================================================
// GESTION DU LIEU
// ============================================================

// Supprime le dernier segment d'une adresse si c'est un nom de pays
// (typiquement ", France" ajouté automatiquement par Google Calendar).
// Heuristique : on retire la dernière partie après la dernière virgule
// si elle ne contient pas de chiffre (donc pas un code postal ni un n°).
function stripCountry(location){

    if(!location) return "";

    const parts =
        location
            .split(",")
            .map(s => s.trim());

    if(parts.length > 1){

        const last =
            parts[parts.length - 1];

        // Un code postal ou un numéro de rue contient des chiffres → on garde.
        if(!/\d/.test(last)){

            parts.pop();

        }

    }

    return parts.join(", ");

}


// Résout le texte à afficher pour le lieu selon le mode :
// 0 → rien
// 1 → lieu de l'événement Google Calendar (sans pays)
// 2 → lieu du JSON campaign
// 3 → lieu événement, puis JSON si l'événement est vide
// 4 → lieu JSON, puis événement si le JSON est vide
function resolveLocation(
    eventLocation,
    campaignLieu,
    mode
){

    const ev =
        stripCountry(
            eventLocation || ""
        );

    const js =
        (campaignLieu || "").trim();

    const modeNum =
        parseInt(mode, 10);

    switch(modeNum){

        case 0:
            return "";

        case 1:
            return ev;

        case 2:
            return js;

        case 3:
            return ev || js;

        case 4:
            return js || ev;

        default:
            return ev || js;

    }

}


const STATUS_COLORS = {

    "annulé": "#c0392b",
    "annule": "#c0392b",
    "complet": "#e08e0b",
    "reporté": "#6c5ce7",
    "reporte": "#6c5ce7"

};


// ============================================================
// QR CODE D'INSCRIPTION
// ============================================================

function renderRegistrationQr(campaign){

    const registrationBox =
        document.getElementById(
            "registrationBox"
        );

    const registrationQr =
        document.getElementById(
            "registrationQr"
        );

    const registrationLink =
        document.getElementById(
            "registrationLink"
        );

    const registrationQrText =
        document.getElementById(
            "registrationQrText"
        );


    // Si le HTML ne contient pas encore les éléments du QR,
    // on ne bloque surtout pas l'affichage de l'événement.
    if(
        !registrationBox ||
        !registrationQr
    ){

        return;

    }


    // Nettoyage du QR précédent
    registrationQr.innerHTML = "";


    const url =
        campaign &&
        campaign.lien_inscription
            ? String(
                campaign.lien_inscription
            ).trim()
            : "";


    // --------------------------------------------------------
    // Aucun lien
    // --------------------------------------------------------

    if(!url){

        registrationBox.classList.add(
            "hidden"
        );

        if(registrationLink){

            registrationLink.removeAttribute(
                "href"
            );

        }

        return;

    }


    // --------------------------------------------------------
    // Lien cliquable
    // --------------------------------------------------------

    if(registrationLink){

        registrationLink.href =
            url;

        registrationLink.target =
            "_blank";

        registrationLink.rel =
            "noopener noreferrer";

    }


    // --------------------------------------------------------
    // Bibliothèque QRCode
    // --------------------------------------------------------

    if(
        typeof QRCode === "undefined"
    ){

        console.error(
            "QRCode n'est pas chargé. Vérifie que qrcode.min.js est présent avant script.js."
        );

        registrationBox.classList.add(
            "hidden"
        );

        return;

    }


    // --------------------------------------------------------
    // Génération du QR code
    // --------------------------------------------------------

    try{

        new QRCode(
            registrationQr,
            {
                text: url,

                width: 220,

                height: 220,

                colorDark: "#000000",

                colorLight: "#ffffff",

                correctLevel:
                    QRCode.CorrectLevel.H
            }
        );


        if(registrationQrText){

            registrationQrText.textContent =
                "Scannez pour vous inscrire";

        }


        registrationBox.classList.remove(
            "hidden"
        );


    } catch(error){

        console.error(
            "Erreur lors de la génération du QR code :",
            error
        );

        registrationBox.classList.add(
            "hidden"
        );

    }

}


function renderEvent(event){

    currentEvent = event;

    document.body.classList.remove("empty");

    const start = new Date(event.start);
    const end = new Date(event.end);

    const campaign = event.campaign || {};


    document.getElementById("campaignTitle").textContent =
        campaign.titre || event.title;


    // Logo association dynamique : L'Établi Ludique ou Le Raffut
    // Ludique selon le calendrier d'origine de l'événement (champ
    // icon, déjà utilisé partout ailleurs sur ce dépôt : LEL*/LRL*).
    // Par défaut (icon absent), on retombe sur L'Établi Ludique.
    const associationLogo =
        document.getElementById("associationLogo");

    if(associationLogo){

        if((event.icon || "").startsWith("LRL")){

            associationLogo.src = "img/logo-raffut.svg";
            associationLogo.alt = "Le Raffut Ludique";

        } else {

            associationLogo.src = "img/logo-etabli.svg";
            associationLogo.alt = "L'Établi Ludique";

        }

    }


    document.getElementById("campaignDate").textContent =
        `${formatDate(start)} – ${formatHour(start)} à ${formatHour(end)}`;


    document.getElementById("eventTitle").textContent =
        campaign.sous_titre || event.title;


    document.getElementById("eventHours").textContent =
        `${formatHour(start)} – ${formatHour(end)}`;


    const locationEl =
        document.getElementById("eventLocation");


    const locationText =
        resolveLocation(
            event.location,
            campaign.lieu,
            campaign.affichage_lieu !== undefined
                ? campaign.affichage_lieu
                : 3
        );


    if(locationText){

        locationEl.textContent =
            locationText;

        locationEl
            .closest(".infoLine")
            .classList.remove("hidden");

    } else {

        locationEl
            .closest(".infoLine")
            .classList.add("hidden");

    }


    const photoBox =
        document.getElementById("photoBox");

    const campaignImage =
        document.getElementById("campaignImage");


    if(campaign.image){

        campaignImage.src =
            campaign.image;

        photoBox.classList.remove(
            "hidden"
        );

    } else {

        photoBox.classList.add(
            "hidden"
        );

    }


    const campaignLogoBox =
        document.getElementById(
            "campaignLogoBox"
        );

    const campaignLogo =
        document.getElementById(
            "campaignLogo"
        );


    if(campaign.logo){

        campaignLogo.src =
            campaign.logo;

        campaignLogoBox.classList.remove(
            "hidden"
        );

        // Couleur de fond du logo : celle fournie,
        // sinon transparent.
        campaignLogoBox.style.background =
            campaign.logo_fond ||
            "transparent";

    } else {

        campaignLogoBox.classList.add(
            "hidden"
        );

    }


    // Photo de fond de l'écran : si fournie, on l'applique avec un voile
    // sombre pour garder le texte lisible ; sinon on garde le fond uni.
    const screen =
        document.getElementById("screen");

    const bgOverlay =
        document.getElementById("bgOverlay");


    if(campaign.fond){

        screen.style.backgroundImage =
            `url("${campaign.fond}")`;

        bgOverlay.style.display =
            "block";

    } else {

        screen.style.backgroundImage =
            "";

        bgOverlay.style.display =
            "none";

    }


    const tarifEl =
        document.getElementById("eventTarif");


    if(campaign.tarif){

        tarifEl.textContent =
            campaign.tarif;

        tarifEl
            .closest(".infoLine")
            .classList.remove("hidden");

    } else {

        tarifEl
            .closest(".infoLine")
            .classList.add("hidden");

    }


    // ========================================================
    // INSCRIPTION — TEXTE LIBRE
    // ========================================================

    const inscriptionEl =
        document.getElementById(
            "eventInscription"
        );


    if(campaign.inscription){

        inscriptionEl.textContent =
            campaign.inscription;

        inscriptionEl
            .closest(".infoLine")
            .classList.remove("hidden");

    } else {

        inscriptionEl
            .closest(".infoLine")
            .classList.add("hidden");

    }


    // ========================================================
    // QR CODE + LIEN CLIQUABLE
    // ========================================================

    renderRegistrationQr(
        campaign
    );


    const statusRibbon =
        document.getElementById(
            "statusRibbon"
        );

    const statusText =
        document.getElementById(
            "statusText"
        );


    if(campaign.statut){

        const key =
            campaign.statut
                .trim()
                .toLowerCase();

        statusText.textContent =
            campaign.statut;

        statusRibbon.style.background =
            STATUS_COLORS[key] ||
            "#c0392b";

        statusRibbon.style.display =
            "block";

    } else {

        statusRibbon.style.display =
            "none";

    }


    updateCountdown();


    // Après avoir tout rempli (donc une fois la vraie hauteur du texte
    // connue, y compris le bandeau de statut qui vient d'apparaître ou
    // non), on vérifie que ça tient dans l'espace disponible.
    requestAnimationFrame(
        fitContent
    );

}


// Réduit #content dans son ensemble (titre, compte à rebours, photo,
// infos...) si son contenu naturel dépasse l'espace disponible au-dessus
// du bandeau de statut, pour qu'aucun texte ne soit jamais coupé/masqué,
// quelle que soit la longueur du titre ou des autres champs.
function fitContent(){

    const content =
        document.getElementById(
            "content"
        );

    const screen =
        document.getElementById(
            "screen"
        );

    const bottomZone =
        document.getElementById(
            "bottomZone"
        );


    if(!content || !screen) return;


    // On repart d'une échelle neutre avant de mesurer, sinon une réduction
    // précédente fausserait la mesure du contenu naturel.
    content.style.transform =
        "scale(1)";


    const bottomZoneHeight =
        bottomZone
            ? bottomZone.offsetHeight
            : 0;


    const available =
        (screen.clientHeight -
            bottomZoneHeight) *
        0.97;


    const natural =
        content.scrollHeight;


    if(
        natural > available &&
        natural > 0
    ){

        const scale =
            Math.max(
                0.5,
                available / natural
            );

        content.style.transform =
            `scale(${scale})`;

    }

}


function renderEmpty(){

    currentEvent = null;

    document.body.classList.add(
        "empty"
    );

}


function updateCountdown(){

    if(!currentEvent){

        return;

    }

    // Page "affiche" (sans compte à rebours) : on ne calcule ni
    // n'affiche rien ici. On garde quand même l'appel actif ailleurs
    // dans le code pour ne pas casser le rechargement automatique
    // lorsque l'événement affiché se termine (voir plus bas).
    if(window.HIDE_COUNTDOWN){

        if(
            currentEvent.end &&
            new Date(currentEvent.end).getTime() <= Date.now()
        ){
            loadEvents();
        }

        return;

    }


    const text =
        computeCountdown(
            currentEvent
        );


    if(text === null){

        // L'événement affiché est maintenant terminé :
        // on recharge pour passer au suivant.
        loadEvents();

        return;

    }


    document.getElementById(
        "countdownText"
    ).textContent =
        text;

}


async function loadEvents(){

    try{

        const response =
            await fetch(
                DATA_URL +
                "?t=" +
                Date.now()
            );


        const json =
            await response.json();


        let overrides = {};


        try{

            const overridesRes =
                await fetch(
                    OVERRIDES_URL +
                    "?t=" +
                    Date.now()
                );

            overrides =
                await overridesRes.json();

        } catch(err){

            // Pas grave si absent :
            // on reste sur le statut de events.json.

        }


        if(
            json.events &&
            json.events.length
        ){

            const requestedUid =
                new URLSearchParams(
                    window.location.search
                ).get("id");

            let event = null;

            if(requestedUid){

                event =
                    json.events.find(
                        e => e.uid === requestedUid
                    );

            }

            // Pas de paramètre, ou uid introuvable
            // (événement passé/supprimé entretemps) :
            // on retombe sur le prochain événement.
            if(!event){

                event = json.events[0];

            }


            const override =
                overrides[event.uid];


            if(
                override &&
                override.statut !== undefined
            ){

                event.campaign =
                    event.campaign || {};

                event.campaign.statut =
                    override.statut;

            }


            renderEvent(
                event
            );

        } else {

            renderEmpty();

        }


    } catch(err){

        console.error(
            "Erreur de chargement de events.json :",
            err
        );

    }

}


loadEvents();


setInterval(
    loadEvents,
    REFRESH_DATA_MS
);


setInterval(
    updateCountdown,
    REFRESH_COUNTDOWN_MS
);


/**************************************************
    TÉLÉCHARGEMENT DE L'AFFICHE (PNG / JPG / WebP)
**************************************************/

async function downloadAsFormat(format){

    const screen = document.getElementById("screen");
    const toolbar = document.querySelector(".downloadToolbar");

    if(!screen) return;

    const buttons = toolbar
        ? toolbar.querySelectorAll("button")
        : [];

    buttons.forEach(btn => btn.disabled = true);

    // On masque la barre le temps de la capture pour qu'elle
    // n'apparaisse jamais sur l'image exportée.
    if(toolbar) toolbar.style.display = "none";

    try {

        // S'assure que toutes les images (logos, photo de campagne...)
        // sont bien chargées avant la capture, sinon certaines peuvent
        // manquer sur l'export.
        const images = Array.from(screen.querySelectorAll("img"));

        await Promise.all(images.map(img =>
            img.complete && img.naturalWidth !== 0
                ? Promise.resolve()
                : new Promise(resolve => {
                    img.addEventListener("load", resolve, {once:true});
                    img.addEventListener("error", resolve, {once:true});
                })
        ));

        const canvas = await html2canvas(screen, {
            scale:2,
            backgroundColor: format === "png" ? null : "#0a1330",
            useCORS:true,
            allowTaint:true,
            imageTimeout:0
        });

        const mime =
            format === "jpg" ? "image/jpeg" :
            format === "webp" ? "image/webp" :
            "image/png";

        const extension = format === "jpg" ? "jpg" : format;

        const dataUrl = canvas.toDataURL(mime, 0.92);

        const link = document.createElement("a");
        link.download = "affiche-evenement." + extension;
        link.href = dataUrl;
        link.click();

    } catch(err){

        console.error("Erreur lors de l'export " + format + " :", err);

    } finally {

        if(toolbar) toolbar.style.display = "flex";
        buttons.forEach(btn => btn.disabled = false);

    }

}

const pngBtn = document.getElementById("downloadPngBtn");
const jpgBtn = document.getElementById("downloadJpgBtn");
const webpBtn = document.getElementById("downloadWebpBtn");

if(pngBtn) pngBtn.addEventListener("click", () => downloadAsFormat("png"));
if(jpgBtn) jpgBtn.addEventListener("click", () => downloadAsFormat("jpg"));
if(webpBtn) webpBtn.addEventListener("click", () => downloadAsFormat("webp"));
