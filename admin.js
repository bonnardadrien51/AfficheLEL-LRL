const GITHUB_OWNER = "bonnardadrien51";
const GITHUB_REPO = "AfficheLEL-LRL";
const OVERRIDES_PATH = "status-overrides.json";
const COMMUNICATION_PATH = "communication.json";
const AGENDA_PATH = "agenda.json";

function getToken(){ return localStorage.getItem("gh_token") || ""; }

function setToken(token){
    if(token) localStorage.setItem("gh_token", token);
    else localStorage.removeItem("gh_token");
    refreshTokenBar();
}

function refreshTokenBar(){
    const token = getToken();
    document.getElementById("tokenStatus").textContent = token ? "Token enregistré ✓" : "Aucun token enregistré";
    document.getElementById("tokenInput").value = "";
}

document.getElementById("tokenSave").addEventListener("click", () => {
    const value = document.getElementById("tokenInput").value.trim();
    if(value){ setToken(value); loadEvents(); }
});

document.getElementById("tokenClear").addEventListener("click", () => setToken(""));

function utf8ToBase64(str){ return btoa(unescape(encodeURIComponent(str))); }
function base64ToUtf8(str){ return decodeURIComponent(escape(atob(str))); }

async function githubGet(path){
    const headers = { "Accept": "application/vnd.github+json" };
    const token = getToken();
    if(token) headers["Authorization"] = "Bearer " + token;

    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?t=${Date.now()}`, {headers});
    if(!response.ok) throw new Error(`Impossible de lire ${path} (code ${response.status})`);
    const data = await response.json();
    return { content: JSON.parse(base64ToUtf8(data.content)), sha: data.sha };
}

async function githubPut(path, newContent, sha, message){
    const token = getToken();
    if(!token) throw new Error("Aucun token GitHub enregistré.");

    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
        method: "PUT",
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message,
            content: utf8ToBase64(JSON.stringify(newContent, null, 2)),
            sha
        })
    });

    if(!response.ok){
        const text = await response.text();
        throw new Error(`Échec de la sauvegarde (code ${response.status}) : ${text}`);
    }
}

function formatDate(value){
    return new Date(value).toLocaleDateString("fr-FR", {
        weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris"
    });
}

function formatTime(value){
    return new Date(value).toLocaleTimeString("fr-FR", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
    });
}

function hexToRgba(hex, alpha){
    if(!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(hex.substring(1,3),16);
    const g = parseInt(hex.substring(3,5),16);
    const b = parseInt(hex.substring(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function highlightActive(card, status){
    card.querySelectorAll(".statusButtons button").forEach(button => {
        button.classList.toggle("active", button.dataset.status === status);
    });
}

async function setStatus(uid, newStatus, card){
    if(!uid){ showError(card, "Cet événement n'a pas de UID Google Calendar."); return; }
    card.classList.add("saving");
    try{
        const {content, sha} = await githubGet(OVERRIDES_PATH);
        if(newStatus) content[uid] = {statut:newStatus};
        else delete content[uid];
        await githubPut(OVERRIDES_PATH, content, sha, "🔧 Mise à jour statut événement");
        highlightActive(card, newStatus);
    }catch(error){
        console.error(error);
        showError(card, error.message);
    }finally{
        card.classList.remove("saving");
    }
}

async function saveCommunication(uid, card){
    if(!uid){ showError(card, "Impossible d'enregistrer : UID manquant."); return; }
    const communication = communicationContent[uid] || {
        uid,
        type: "facebook_instagram",
        publie: false,
        post: "",
        hashtags: ""
    };

    communication.post = card.querySelector(".communicationText").value.trim();
    communication.hashtags = card.querySelector(".communicationHashtags").value.trim();
    communication.publie = card.querySelector(".communicationPublished").checked;

    const dateInput = card.querySelector(".communicationDate").value;
    communication.date_publication = dateInput || "";

    card.classList.add("saving");
    try{
        const {content, sha} = await githubGet(COMMUNICATION_PATH);
        content.posts = Array.isArray(content.posts) ? content.posts : [];

        const index = content.posts.findIndex(p => p.uid === uid);
        const existing = index >= 0 ? content.posts[index] : {};
        const updated = {...existing, ...communication};

        if(index >= 0) content.posts[index] = updated;
        else content.posts.push(updated);

        await githubPut(COMMUNICATION_PATH, content, sha, "📣 Mise à jour communication événement");
        communicationContent[uid] = updated;
        setCommunicationMessage(card, "Communication enregistrée ✓");
    }catch(error){
        console.error(error);
        showError(card, error.message);
    }finally{
        card.classList.remove("saving");
    }
}

function copyCommunication(card){
    const text = card.querySelector(".communicationText").value.trim();
    const hashtags = card.querySelector(".communicationHashtags").value.trim();
    const full = hashtags ? `${text}\n\n${hashtags}` : text;

    navigator.clipboard.writeText(full).then(() => {
        setCommunicationMessage(card, "Post copié dans le presse-papiers ✓");
    }).catch(() => {
        const textarea = card.querySelector(".communicationText");
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        setCommunicationMessage(card, "Post copié ✓");
    });
}

function setCommunicationMessage(card, message){
    const element = card.querySelector(".communicationMessage");
    if(element){
        element.textContent = message;
        clearTimeout(element._timer);
        element._timer = setTimeout(() => element.textContent = "", 3500);
    }
}

function showError(card, message){
    const oldError = card.querySelector(".errorMsg");
    if(oldError) oldError.remove();
    const error = document.createElement("div");
    error.className = "errorMsg";
    error.textContent = message;
    card.appendChild(error);
}

function escapeHtml(value){
    return String(value || "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

function createCommunicationSection(event, card){
    const communication = communicationContent[event.uid] || {};
    const section = document.createElement("div");
    section.className = "communicationSection";

    const title = document.createElement("div");
    title.className = "communicationTitle";
    title.innerHTML = "📣 Communication réseaux sociaux";
    section.appendChild(title);

    const textarea = document.createElement("textarea");
    textarea.className = "communicationText";
    textarea.rows = 10;
    textarea.placeholder = "Texte du post Facebook / Instagram…";
    textarea.value = communication.post || "";
    section.appendChild(textarea);

    const hashtags = document.createElement("input");
    hashtags.className = "communicationHashtags";
    hashtags.type = "text";
    hashtags.placeholder = "Hashtags";
    hashtags.value = communication.hashtags || "";
    section.appendChild(hashtags);

    const controls = document.createElement("div");
    controls.className = "communicationControls";

    const dateLabel = document.createElement("label");
    dateLabel.className = "communicationDateLabel";
    dateLabel.textContent = "Date de publication";

    const date = document.createElement("input");
    date.className = "communicationDate";
    date.type = "date";
    date.value = communication.date_publication || "";
    dateLabel.appendChild(date);
    controls.appendChild(dateLabel);

    const publishedLabel = document.createElement("label");
    publishedLabel.className = "communicationPublishedLabel";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "communicationPublished";
    checkbox.checked = communication.publie === true;
    publishedLabel.appendChild(checkbox);
    publishedLabel.appendChild(document.createTextNode(" Publié"));
    controls.appendChild(publishedLabel);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "communicationButton copyButton";
    copyButton.textContent = "📋 Copier le post";
    copyButton.addEventListener("click", () => copyCommunication(card));
    controls.appendChild(copyButton);

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "communicationButton saveCommunication";
    saveButton.textContent = "💾 Enregistrer";
    saveButton.addEventListener("click", () => saveCommunication(event.uid, card));
    controls.appendChild(saveButton);

    section.appendChild(controls);

    const message = document.createElement("div");
    message.className = "communicationMessage";
    section.appendChild(message);

    return section;
}

function createEventCard(event, overrides){
    const card = document.createElement("div");
    card.className = "eventCard";
    const campaign = event.campaign || {};

    const currentStatus = (overrides[event.uid] && overrides[event.uid].statut) || campaign.statut || "";

    const header = document.createElement("div");
    header.className = "eventHeader";

    if(event.icon){
        const icon = document.createElement("img");
        icon.className = "eventIcon";
        icon.src = "img/categories/" + event.icon;
        icon.alt = "";
        header.appendChild(icon);
    }

    const main = document.createElement("div");
    main.className = "eventMain";

    const title = document.createElement("div");
    title.className = "eventTitle";
    title.textContent = event.title || "Événement sans titre";
    main.appendChild(title);

    if(campaign.titre){
        const campaignTitle = document.createElement("div");
        campaignTitle.className = "eventCampaign";
        campaignTitle.textContent = campaign.titre;
        main.appendChild(campaignTitle);
    }

    const meta = document.createElement("div");
    meta.className = "eventMeta";
    let metaText = `${formatDate(event.start)} – ${formatTime(event.start)}`;
    if(event.end) metaText += ` → ${formatTime(event.end)}`;
    if(event.location) metaText += ` · ${event.location}`;
    meta.textContent = metaText;
    main.appendChild(meta);

    if(event.label){
        const label = document.createElement("span");
        label.className = "eventLabel";
        label.textContent = event.label;
        label.style.background = hexToRgba(event.color, .25);
        label.style.color = event.color || "white";
        main.appendChild(label);
    }

    header.appendChild(main);
    card.appendChild(header);

    const buttons = document.createElement("div");
    buttons.className = "statusButtons";
    const statuses = [
        {label:"Aucun", value:""},
        {label:"Annulé", value:"Annulé"},
        {label:"Complet", value:"Complet"},
        {label:"Reporté", value:"Reporté"}
    ];

    statuses.forEach(status => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.status = status.value;
        button.textContent = status.label;
        button.addEventListener("click", () => setStatus(event.uid, status.value, card));
        buttons.appendChild(button);
    });
    card.appendChild(buttons);
    highlightActive(card, currentStatus);

    card.appendChild(createCommunicationSection(event, card));
    return card;
}

let allEvents = [];
let overridesContent = {};
let communicationContent = {};

async function loadEvents(){
    const list = document.getElementById("eventList");
    list.textContent = "Chargement des événements…";

    try{
        const response = await fetch(AGENDA_PATH + "?t=" + Date.now());
        if(!response.ok) throw new Error("Erreur HTTP " + response.status);
        const json = await response.json();
        allEvents = json.events || [];
    }catch(error){
        list.innerHTML = `<div class="emptyMessage">Impossible de charger agenda.json.<br>${escapeHtml(error.message)}</div>`;
        return;
    }

    try{
        const {content} = await githubGet(OVERRIDES_PATH);
        overridesContent = content || {};
    }catch(error){
        console.warn("Lecture des overrides impossible :", error.message);
        overridesContent = {};
    }

    try{
        const {content} = await githubGet(COMMUNICATION_PATH);
        communicationContent = {};
        (content.posts || []).forEach(post => {
            if(post.uid) communicationContent[post.uid] = post;
        });
    }catch(error){
        console.warn("Lecture de la communication impossible :", error.message);
        communicationContent = {};
    }

    populateLabelFilter();
    renderEvents();
}

function populateLabelFilter(){
    const select = document.getElementById("labelFilter");
    const labels = [...new Set(allEvents.map(event => event.label || event.calendar).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    select.innerHTML = `<option value="">Tous les calendriers</option>`;
    labels.forEach(label => {
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        select.appendChild(option);
    });
}

function renderEvents(){
    const list = document.getElementById("eventList");
    const search = document.getElementById("searchInput").value.trim().toLowerCase();
    const label = document.getElementById("labelFilter").value;

    const filtered = allEvents.filter(event => {
        const campaign = event.campaign || {};
        const searchText = [event.title,event.location,event.label,event.calendar,campaign.titre,campaign.lieu].filter(Boolean).join(" ").toLowerCase();
        const matchSearch = !search || searchText.includes(search);
        const eventLabel = event.label || event.calendar || "";
        const matchLabel = !label || eventLabel === label;
        return matchSearch && matchLabel;
    });

    list.innerHTML = "";
    if(!filtered.length){
        list.innerHTML = `<div class="emptyMessage">Aucun événement ne correspond aux critères.</div>`;
        return;
    }

    filtered.forEach(event => list.appendChild(createEventCard(event, overridesContent)));
}

document.getElementById("searchInput").addEventListener("input", renderEvents);
document.getElementById("labelFilter").addEventListener("change", renderEvents);

refreshTokenBar();
loadEvents();
