const DATA_URL = "agenda.json";

let currentEvent = null;


// ============================================================
// OUTILS
// ============================================================

function formatDate(date){

    return date.toLocaleDateString(
        "fr-FR",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


function formatHour(date){

    return date.toLocaleTimeString(
        "fr-FR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function resolveLocation(eventLocation, campaignLocation, displayMode){

    const eventText = String(eventLocation || "").trim();
    const campaignText = String(campaignLocation || "").trim();

    if(displayMode === "1"){
        return campaignText || eventText;
    }

    if(displayMode === "2"){
        return eventText || campaignText;
    }

    if(displayMode === "0"){
        return "";
    }

    return campaignText || eventText;
}


function getFileParam(){

    const params = new URLSearchParams(window.location.search);

    return params.get("file");
}


function getEventParam(){

    const params = new URLSearchParams(window.location.search);

    return params.get("event");
}


function getDayParam(){

    const params = new URLSearchParams(window.location.search);

    return params.get("day");
}


async function loadAgenda(){

    const file = getFileParam() || DATA_URL;

    const response = await fetch(file + "?v=" + Date.now());

    if(!response.ok){
        throw new Error("Impossible de charger " + file);
    }

    return await response.json();
}


function getEventsFromData(data){

    if(Array.isArray(data)){
        return data;
    }

    if(Array.isArray(data.events)){
        return data.events;
    }

    return [];
}


function sortEvents(events){

    return [...events].sort(
        (a,b) => new Date(a.start) - new Date(b.start)
    );
}


function filterEvents(events){

    const eventId = getEventParam();
    const day = getDayParam();

    let result = sortEvents(events);

    if(eventId){

        result = result.filter(
            event => String(event.uid) === String(eventId)
        );

    }

    if(day){

        result = result.filter(event => {

            const date = new Date(event.start);

            const localDay =
                date.getFullYear() + "-" +
                String(date.getMonth()+1).padStart(2,"0") + "-" +
                String(date.getDate()).padStart(2,"0");

            return localDay === day;
        });
    }

    return result;
}


function hideOptional(elementId){

    const element = document.getElementById(elementId);

    if(!element){
        return;
    }

    element.textContent = "";

    const line = element.closest(".infoLine");

    if(line){
        line.classList.add("hidden");
    }
}


function showOptional(elementId, text){

    const element = document.getElementById(elementId);

    if(!element){
        return;
    }

    element.textContent = text || "";

    const line = element.closest(".infoLine");

    if(line){
        if(text){
            line.classList.remove("hidden");
        } else {
            line.classList.add("hidden");
        }
    }
}


// ============================================================
// QR CODE
// ============================================================

function renderRegistration(campaign){

    const registrationBox = document.getElementById("registrationBox");
    const registrationQr = document.getElementById("registrationQr");
    const registrationLink = document.getElementById("registrationLink");
    const registrationQrText = document.getElementById("registrationQrText");

    if(!registrationBox || !registrationQr){
        return;
    }

    registrationQr.innerHTML = "";

    const url = campaign && campaign.lien_inscription
        ? String(campaign.lien_inscription).trim()
        : "";

    if(!url){

        registrationBox.classList.add("hidden");

        if(registrationLink){
            registrationLink.removeAttribute("href");
        }

        return;
    }

    if(registrationLink){
        registrationLink.href = url;
        registrationLink.target = "_blank";
        registrationLink.rel = "noopener noreferrer";
    }

    if(typeof QRCode === "undefined"){

        console.error(
            "QRCode n'est pas chargé. Vérifie que qrcode.min.js est présent avant script.js."
        );

        registrationBox.classList.add("hidden");
        return;
    }

    try{

        new QRCode(
            registrationQr,
            {
                text: url,
                width: 220,
                height: 220,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            }
        );

        if(registrationQrText){
            registrationQrText.textContent = "Scannez pour vous inscrire";
        }

        registrationBox.classList.remove("hidden");

    } catch(error){

        console.error(
            "Erreur lors de la génération du QR code :",
            error
        );

        registrationBox.classList.add("hidden");
    }
}


// ============================================================
// AFFICHAGE D'UN ÉVÉNEMENT
// ============================================================

function renderEvent(event){

    currentEvent = event;

    document.body.classList.remove("empty");

    const start = new Date(event.start);
    const end = new Date(event.end);
    const campaign = event.campaign || {};

    const campaignTitle = document.getElementById("campaignTitle");
    const eventTitle = document.getElementById("eventTitle");

    if(campaignTitle){
        campaignTitle.textContent = campaign.titre || event.title;
    }

    if(eventTitle){
        eventTitle.textContent = campaign.sous_titre || event.title;
    }

    // Logo association dynamique : L'Établi Ludique ou Le Raffut
    // Ludique selon le calendrier d'origine de l'événement.
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

    // La date est maintenant affichée dans le bloc des informations.
    // L'heure reste dans sa propre ligne : plus de redondance.
    const campaignDate = document.getElementById("campaignDate");

    if(campaignDate){
        campaignDate.textContent = formatDate(start);
    }

    const eventHours = document.getElementById("eventHours");

    if(eventHours){
        eventHours.textContent = `${formatHour(start)} – ${formatHour(end)}`;
    }

    const locationEl = document.getElementById("eventLocation");

    const locationText = resolveLocation(
        event.location,
        campaign.lieu,
        campaign.affichage_lieu !== undefined
            ? campaign.affichage_lieu
            : 3
    );

    if(locationEl){

        locationEl.textContent = locationText;

        const line = locationEl.closest(".infoLine");

        if(line){
            if(locationText){
                line.classList.remove("hidden");
            } else {
                line.classList.add("hidden");
            }
        }
    }

    const photoBox = document.getElementById("photoBox");
    const campaignImage = document.getElementById("campaignImage");

    if(campaign.image){

        campaignImage.src = campaign.image;
        photoBox.classList.remove("hidden");

    } else {

        photoBox.classList.add("hidden");
    }

    const campaignLogoBox = document.getElementById("campaignLogoBox");
    const campaignLogo = document.getElementById("campaignLogo");

    if(campaign.logo){

        campaignLogo.src = campaign.logo;
        campaignLogoBox.classList.remove("hidden");

        campaignLogoBox.style.background =
            campaign.logo_fond || "transparent";

    } else {

        campaignLogoBox.classList.add("hidden");
    }

    const screen = document.getElementById("screen");

    if(screen){

        if(campaign.fond){
            screen.style.backgroundImage =
                `url("${campaign.fond}")`;
        } else {
            screen.style.backgroundImage = "";
        }
    }

    const tarifEl = document.getElementById("eventTarif");

    if(tarifEl){

        const tarif = campaign.tarif || "";
        tarifEl.textContent = tarif;

        const line = tarifEl.closest(".infoLine");

        if(line){
            if(tarif){
                line.classList.remove("hidden");
            } else {
                line.classList.add("hidden");
            }
        }
    }

    const inscriptionEl = document.getElementById("eventInscription");

    if(inscriptionEl){

        const inscription = campaign.inscription || "";
        inscriptionEl.textContent = inscription;

        const line = inscriptionEl.closest(".infoLine");

        if(line){
            if(inscription){
                line.classList.remove("hidden");
            } else {
                line.classList.add("hidden");
            }
        }
    }

    const statusText = document.getElementById("statusText");
    const statusRibbon = document.getElementById("statusRibbon");

    if(statusText && statusRibbon){

        const statut = campaign.statut || "";

        statusText.textContent = statut;

        if(statut){
            statusRibbon.classList.remove("hidden");
        } else {
            statusRibbon.classList.add("hidden");
        }
    }

    renderRegistration(campaign);
}


// ============================================================
// ÉTAT VIDE
// ============================================================

function renderEmpty(){

    document.body.classList.add("empty");

    const noEvent = document.getElementById("noEvent");

    if(noEvent){
        noEvent.classList.remove("hidden");
    }
}


function hideEmpty(){

    const noEvent = document.getElementById("noEvent");

    if(noEvent){
        noEvent.classList.add("hidden");
    }
}


// ============================================================
// INITIALISATION
// ============================================================

async function init(){

    try{

        const data = await loadAgenda();
        const events = filterEvents(getEventsFromData(data));

        if(!events.length){
            renderEmpty();
            return;
        }

        hideEmpty();
        renderEvent(events[0]);

    } catch(error){

        console.error("Erreur chargement agenda :", error);
        renderEmpty();
    }
}


// ============================================================
// TÉLÉCHARGEMENT D'IMAGE
// ============================================================

async function loadHtml2Canvas(){

    if(typeof html2canvas !== "undefined"){
        return html2canvas;
    }

    await new Promise((resolve,reject) => {

        const script = document.createElement("script");

        script.src =
            "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";

        script.onload = resolve;
        script.onerror = reject;

        document.head.appendChild(script);
    });

    return html2canvas;
}


async function downloadImage(format){

    const canvasLib = await loadHtml2Canvas();
    const target = document.getElementById("screen");

    if(!target){
        return;
    }

    const toolbar = document.querySelector(".downloadToolbar");

    if(toolbar){
        toolbar.style.visibility = "hidden";
    }

    try{

        const canvas = await canvasLib(
            target,
            {
                backgroundColor: null,
                useCORS: true,
                scale: 2
            }
        );

        let mime = "image/png";
        let quality = undefined;
        let extension = "png";

        if(format === "jpg"){
            mime = "image/jpeg";
            quality = 0.95;
            extension = "jpg";
        }

        if(format === "webp"){
            mime = "image/webp";
            quality = 0.95;
            extension = "webp";
        }

        canvas.toBlob(blob => {

            if(!blob){
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "affiche-evenement." + extension;
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

        }, mime, quality);

    } finally {

        if(toolbar){
            toolbar.style.visibility = "visible";
        }
    }
}


function bindDownloadButtons(){

    const png = document.getElementById("downloadPngBtn");
    const jpg = document.getElementById("downloadJpgBtn");
    const webp = document.getElementById("downloadWebpBtn");

    if(png){
        png.addEventListener("click", () => downloadImage("png"));
    }

    if(jpg){
        jpg.addEventListener("click", () => downloadImage("jpg"));
    }

    if(webp){
        webp.addEventListener("click", () => downloadImage("webp"));
    }
}


document.addEventListener("DOMContentLoaded", () => {
    bindDownloadButtons();
    init();
});
