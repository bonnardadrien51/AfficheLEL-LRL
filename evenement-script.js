// Script principal des affiches événement

const DATA_URL = "agenda.json";
const OVERRIDES_URL = "status-overrides.json";
const REFRESH_DATA_MS = 60 * 1000;
const REFRESH_COUNTDOWN_MS = 30 * 1000;

let currentEvent = null;

function applyScale(){
    const screen = document.getElementById("screen");
    if(!screen) return;
    const refWidth = screen.offsetWidth;
    const refHeight = screen.offsetHeight;
    if(!refWidth || !refHeight) return;
    const scale = Math.min(window.innerWidth / refWidth, window.innerHeight / refHeight);
    screen.style.transform = `scale(${scale})`;
}
window.addEventListener("resize", applyScale);
applyScale();

function formatHour(date){
    const h = date.getHours();
    const m = date.getMinutes();
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,"0")}`;
}

function formatDate(date){
    return date.toLocaleDateString("fr-FR", {
        day:"2-digit", month:"2-digit", year:"numeric", timeZone:"Europe/Paris"
    });
}

function stripCountry(location){
    if(!location) return "";
    const parts = location.split(",").map(s => s.trim());
    if(parts.length > 1 && !/\d/.test(parts[parts.length - 1])) parts.pop();
    return parts.join(", ");
}

function resolveLocation(eventLocation, campaignLieu, mode){
    const ev = stripCountry(eventLocation || "");
    const js = String(campaignLieu || "").trim();
    const modeNum = parseInt(mode, 10);
    switch(modeNum){
        case 0: return "";
        case 1: return ev;
        case 2: return js;
        case 3: return ev || js;
        case 4: return js || ev;
        default: return ev || js;
    }
}

const STATUS_COLORS = {
    "annulé":"#c0392b", "annule":"#c0392b",
    "complet":"#e08e0b",
    "reporté":"#6c5ce7", "reporte":"#6c5ce7"
};

function renderRegistrationQr(campaign){
    const box = document.getElementById("registrationBox");
    const qr = document.getElementById("registrationQr");
    const text = document.getElementById("registrationQrText");
    if(!box || !qr) return;
    qr.innerHTML = "";
    const url = campaign && campaign.lien_inscription ? String(campaign.lien_inscription).trim() : "";
    if(!url){
        box.classList.add("hidden");
        return;
    }
    if(typeof QRCode === "undefined"){
        box.classList.add("hidden");
        return;
    }
    try{
        new QRCode(qr, {
            text:url, width:220, height:220,
            colorDark:"#000000", colorLight:"#ffffff",
            correctLevel:QRCode.CorrectLevel.H
        });
        if(text) text.textContent = "Scannez pour vous inscrire";
        box.classList.remove("hidden");
    }catch(error){
        console.error("Erreur QR code :", error);
        box.classList.add("hidden");
    }
}

function setOptionalLine(elementId, value){
    const el = document.getElementById(elementId);
    if(!el) return;
    const line = el.closest(".infoLine");
    const valueText = String(value || "").trim();
    el.textContent = valueText;
    if(line) line.classList.toggle("hidden", !valueText);
}

function renderEvent(event){
    currentEvent = event;
    document.body.classList.remove("empty");

    const start = new Date(event.start);
    const end = new Date(event.end);
    const campaign = event.campaign || {};

    const campaignTitle = document.getElementById("campaignTitle");
    if(campaignTitle){
        campaignTitle.textContent = String(campaign.titre || event.title || "Événement").trim();
    }

    const eventTitle = document.getElementById("eventTitle");
    const subtitle = String(campaign.sous_titre || "").trim();
    if(eventTitle){
        eventTitle.textContent = subtitle;
        eventTitle.classList.toggle("hidden", !subtitle);
    }

    const associationLogo = document.getElementById("associationLogo");
    if(associationLogo){
        if((event.icon || "").startsWith("LRL")){
            associationLogo.src = "img/logo-raffut.svg";
            associationLogo.alt = "Le Raffut Ludique";
        }else{
            associationLogo.src = "img/logo-etabli.svg";
            associationLogo.alt = "L'Établi Ludique";
        }
    }

    setOptionalLine("campaignDate", formatDate(start));
    setOptionalLine("eventHours", `${formatHour(start)} – ${formatHour(end)}`);

    const locationText = resolveLocation(
        event.location,
        campaign.lieu,
        campaign.affichage_lieu !== undefined ? campaign.affichage_lieu : 3
    );
    setOptionalLine("eventLocation", locationText);
    setOptionalLine("eventTarif", campaign.tarif);
    setOptionalLine("eventInscription", campaign.inscription);

    const photoBox = document.getElementById("photoBox");
    const campaignImage = document.getElementById("campaignImage");
    if(photoBox && campaignImage){
        if(campaign.image){
            campaignImage.src = campaign.image;
            photoBox.classList.remove("hidden");
        }else{
            campaignImage.removeAttribute("src");
            photoBox.classList.add("hidden");
        }
    }

    const campaignLogoBox = document.getElementById("campaignLogoBox");
    const campaignLogo = document.getElementById("campaignLogo");
    if(campaignLogoBox && campaignLogo){
        if(campaign.logo){
            campaignLogo.src = campaign.logo;
            campaignLogoBox.style.background = campaign.logo_fond || "transparent";
            campaignLogoBox.classList.remove("hidden");
        }else{
            campaignLogo.removeAttribute("src");
            campaignLogoBox.classList.add("hidden");
        }
    }

    const screen = document.getElementById("screen");
    const bgOverlay = document.getElementById("bgOverlay");
    if(screen){
        screen.style.backgroundImage = campaign.fond ? `url("${campaign.fond}")` : "";
    }
    if(bgOverlay) bgOverlay.style.display = campaign.fond ? "block" : "none";

    const statusRibbon = document.getElementById("statusRibbon");
    const statusText = document.getElementById("statusText");
    if(statusRibbon && statusText){
        const statut = String(campaign.statut || "").trim();
        statusText.textContent = statut;
        statusRibbon.style.background = STATUS_COLORS[statut.toLowerCase()] || "#c0392b";
        statusRibbon.style.display = statut ? "block" : "none";
    }

    renderRegistrationQr(campaign);
    requestAnimationFrame(fitContent);
}

function fitContent(){
    const content = document.getElementById("content");
    const screen = document.getElementById("screen");
    const bottomZone = document.getElementById("bottomZone");
    if(!content || !screen) return;
    content.style.transform = "scale(1)";
    const available = (screen.clientHeight - (bottomZone ? bottomZone.offsetHeight : 0)) * 0.97;
    const natural = content.scrollHeight;
    if(natural > available && natural > 0){
        content.style.transform = `scale(${Math.max(0.5, available / natural)})`;
    }
}

function renderEmpty(){
    currentEvent = null;
    document.body.classList.add("empty");
}

async function loadEvents(){
    try{
        const response = await fetch(DATA_URL + "?t=" + Date.now());
        if(!response.ok) throw new Error("Impossible de charger agenda.json");
        const json = await response.json();

        let overrides = {};
        try{
            const r = await fetch(OVERRIDES_URL + "?t=" + Date.now());
            if(r.ok) overrides = await r.json();
        }catch(e){}

        const events = Array.isArray(json.events) ? json.events : [];
        if(!events.length){ renderEmpty(); return; }

        const requestedUid = new URLSearchParams(window.location.search).get("id");
        let event = requestedUid ? events.find(e => String(e.uid) === String(requestedUid)) : null;
        if(!event) event = events[0];

        const override = overrides[event.uid];
        if(override && override.statut !== undefined){
            event.campaign = event.campaign || {};
            event.campaign.statut = override.statut;
        }
        renderEvent(event);
    }catch(error){
        console.error("Erreur de chargement :", error);
        renderEmpty();
    }
}

loadEvents();
setInterval(loadEvents, REFRESH_DATA_MS);
setInterval(() => {
    if(currentEvent && window.HIDE_COUNTDOWN && currentEvent.end && new Date(currentEvent.end).getTime() <= Date.now()) loadEvents();
}, REFRESH_COUNTDOWN_MS);

async function loadHtml2Canvas(){
    if(typeof html2canvas !== "undefined") return html2canvas;
    await new Promise((resolve,reject)=>{
        const script=document.createElement("script");
        script.src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
        script.onload=resolve; script.onerror=reject; document.head.appendChild(script);
    });
    return html2canvas;
}

/*
 * Capture propre de l'affiche.
 * #screen est affiché avec transform:scale(...) pour s'adapter à la fenêtre.
 * La capture est faite dans les dimensions natives de l'affiche, sans ce scale.
 */
async function downloadImage(format){
    const canvasLib = await loadHtml2Canvas();
    const target = document.getElementById("screen");
    if(!target) return;

    const toolbar = document.querySelector(".downloadToolbar");
    const previousTransform = target.style.transform;
    const previousOrigin = target.style.transformOrigin;
    const previousVisibility = toolbar ? toolbar.style.visibility : "";

    try{
        if(toolbar) toolbar.style.visibility = "hidden";

        if(document.fonts && document.fonts.ready){
            try{ await document.fonts.ready; }catch(e){}
        }

        const images = Array.from(target.querySelectorAll("img"));
        await Promise.all(images.map(img => {
            if(img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.addEventListener("load", resolve, {once:true});
                img.addEventListener("error", resolve, {once:true});
            });
        }));

        target.style.transform = "none";
        target.style.transformOrigin = "top left";

        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const width = target.offsetWidth || 1920;
        const height = target.offsetHeight || 1080;

        let mime = "image/png";
        let quality;
        let extension = "png";

        if(format === "jpg"){
            mime = "image/jpeg";
            quality = 0.95;
            extension = "jpg";
        }else if(format === "webp"){
            mime = "image/webp";
            quality = 0.95;
            extension = "webp";
        }

        const canvas = await canvasLib(target, {
            width,
            height,
            windowWidth: width,
            windowHeight: height,
            backgroundColor: "#0a1330",
            useCORS: true,
            allowTaint: false,
            scale: 1,
            logging: false
        });

        const blob = await new Promise(resolve =>
            canvas.toBlob(resolve, mime, quality)
        );

        if(!blob) throw new Error("Impossible de créer l'image.");

        let finalExtension = extension;
        if(blob.type === "image/png") finalExtension = "png";
        else if(blob.type === "image/jpeg") finalExtension = "jpg";
        else if(blob.type === "image/webp") finalExtension = "webp";

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `affiche-evenement.${finalExtension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }catch(error){
        console.error("Erreur lors de la capture :", error);
        alert("Impossible de générer l'image : " + error.message);
    }finally{
        target.style.transform = previousTransform;
        target.style.transformOrigin = previousOrigin;
        if(toolbar) toolbar.style.visibility = previousVisibility;
        requestAnimationFrame(fitContent);
    }
}

function bindDownloadButtons(){
    const png=document.getElementById("downloadPngBtn");
    const jpg=document.getElementById("downloadJpgBtn");
    const webp=document.getElementById("downloadWebpBtn");
    if(png) png.addEventListener("click",()=>downloadImage("png"));
    if(jpg) jpg.addEventListener("click",()=>downloadImage("jpg"));
    if(webp) webp.addEventListener("click",()=>downloadImage("webp"));
}

document.addEventListener("DOMContentLoaded", bindDownloadButtons);
