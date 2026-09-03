/*
 * Bibliothèque d'images pour le générateur.
 * Sélection d'images existantes + import direct depuis le PC vers GitHub.
 */

const IMAGE_LIBRARY_CONFIG = {
    owner: "bonnardadrien51",
    repo: "AfficheLEL-LRL",
    branch: "main",
    root: "img"
};

const IMAGE_EXTENSIONS = [
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"
];

let imageLibraryCache = null;

function imageGitHubPagesUrl(path){
    return "https://" + IMAGE_LIBRARY_CONFIG.owner + ".github.io/" +
        IMAGE_LIBRARY_CONFIG.repo + "/" +
        path.split("/").map(part => encodeURIComponent(part)).join("/");
}

function isImageFile(path){
    const lower = path.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function isLogoImage(image){
    const path = image.path.toLowerCase();
    const name = image.name.toLowerCase();
    return path.includes("/logo/") ||
        path.includes("/logos/") ||
        name === "logo-etabli.svg" ||
        name === "logo-raffut.svg";
}

function escapeHtml(value){
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchImageFiles(forceRefresh = false){
    if(imageLibraryCache && !forceRefresh) return imageLibraryCache;

    const url = `https://api.github.com/repos/${IMAGE_LIBRARY_CONFIG.owner}/${IMAGE_LIBRARY_CONFIG.repo}/git/trees/${IMAGE_LIBRARY_CONFIG.branch}?recursive=1`;
    const response = await fetch(url);
    if(!response.ok) throw new Error(`GitHub API : ${response.status}`);

    const data = await response.json();
    if(data.truncated) console.warn("L'arborescence GitHub est tronquée.");

    imageLibraryCache = (data.tree || [])
        .filter(item => item.type === "blob")
        .filter(item => item.path.toLowerCase().startsWith("img/"))
        .filter(item => isImageFile(item.path))
        .map(item => ({
            path:item.path,
            name:item.path.split("/").pop(),
            url:imageGitHubPagesUrl(item.path)
        }))
        .sort((a,b) => a.path.localeCompare(b.path,"fr",{sensitivity:"base"}));

    return imageLibraryCache;
}

function closeMediaPicker(){
    const modal = document.getElementById("mediaPickerModal");
    if(!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
}

function createPickerModal(){
    let modal = document.getElementById("mediaPickerModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "mediaPickerModal";
    modal.className = "mediaPickerModal";
    modal.setAttribute("aria-hidden","true");
    modal.innerHTML = `
        <div class="mediaPickerOverlay"></div>
        <div class="mediaPickerContent" role="dialog" aria-modal="true">
            <div class="mediaPickerHeader">
                <div>
                    <h2 id="mediaPickerTitle">Choisir une image</h2>
                    <p id="mediaPickerSubtitle">Toutes les images disponibles</p>
                </div>
                <button id="mediaPickerClose" type="button" class="mediaPickerClose">×</button>
            </div>
            <div class="mediaPickerToolbar">
                <input id="mediaPickerSearch" type="search" placeholder="Rechercher une image...">
                <span id="mediaPickerCount"></span>
            </div>
            <div id="mediaPickerGrid" class="mediaPickerGrid">
                <div class="pickerLoading">Chargement…</div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector(".mediaPickerOverlay").addEventListener("click", closeMediaPicker);
    modal.querySelector("#mediaPickerClose").addEventListener("click", closeMediaPicker);
    return modal;
}

function renderPickerImages(modal){
    const allImages = modal._images || [];
    const search = modal.querySelector("#mediaPickerSearch").value.trim().toLowerCase();
    const excludeLogos = modal.dataset.excludeLogos === "true";
    const logoOnly = modal.dataset.logoOnly === "true";

    let images = allImages;

    if(logoOnly){
        images = images.filter(isLogoImage);
    }else if(excludeLogos){
        images = images.filter(image => !isLogoImage(image));
    }

    if(search){
        images = images.filter(image =>
            image.name.toLowerCase().includes(search) ||
            image.path.toLowerCase().includes(search)
        );
    }

    const count = modal.querySelector("#mediaPickerCount");
    count.textContent = `${images.length} image${images.length > 1 ? "s" : ""}`;

    const grid = modal.querySelector("#mediaPickerGrid");
    grid.innerHTML = "";

    if(!images.length){
        grid.innerHTML = `<div class="pickerEmpty">Aucune image trouvée.</div>`;
        return;
    }

    images.forEach(image => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "pickerImageCard";
        card.innerHTML = `
            <div class="pickerImagePreview">
                <img src="${image.url}" alt="${escapeHtml(image.name)}" loading="lazy">
            </div>
            <div class="pickerImageName">${escapeHtml(image.name)}</div>
            <div class="pickerImagePath">${escapeHtml(image.path)}</div>
        `;
        card.addEventListener("click", () => {
            if(typeof modal._onSelect === "function") modal._onSelect(image);
            closeMediaPicker();
        });
        grid.appendChild(card);
    });
}

async function openMediaPicker(options = {}){
    const modal = createPickerModal();
    modal.dataset.excludeLogos = options.excludeLogos ? "true" : "false";
    modal.dataset.logoOnly = options.logoOnly ? "true" : "false";
    modal._onSelect = typeof options.onSelect === "function" ? options.onSelect : null;

    modal.querySelector("#mediaPickerTitle").textContent = options.title || "Choisir une image";
    modal.querySelector("#mediaPickerSubtitle").textContent = options.subtitle || "Toutes les images disponibles";
    modal.querySelector("#mediaPickerSearch").value = "";
    modal.querySelector("#mediaPickerGrid").innerHTML = `<div class="pickerLoading">Chargement des images…</div>`;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");

    try{
        modal._images = await fetchImageFiles();
        renderPickerImages(modal);
    }catch(error){
        console.error(error);
        modal.querySelector("#mediaPickerGrid").innerHTML =
            `<div class="pickerError">Impossible de charger les images.<br><br>${escapeHtml(error.message)}</div>`;
    }

    modal.querySelector("#mediaPickerSearch").oninput = () => renderPickerImages(modal);
    setTimeout(() => modal.querySelector("#mediaPickerSearch").focus(),50);
}

/* ============================================================
   IMPORT DEPUIS LE PC -> GITHUB
============================================================ */

function sanitizeFileName(name){
    const parts = String(name).split(".");
    const extension = parts.length > 1 ? "." + parts.pop().toLowerCase() : "";
    const base = parts.join(".")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return (base || "image") + extension;
}

function fileToBase64(file){
    return new Promise((resolve,reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const comma = result.indexOf(",");
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
        reader.readAsDataURL(file);
    });
}

function githubContentsUrl(path){
    return `https://api.github.com/repos/${IMAGE_LIBRARY_CONFIG.owner}/${IMAGE_LIBRARY_CONFIG.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function uploadImageToGitHub(file, type){
    const token = localStorage.getItem("gh_token") || "";
    if(!token){
        throw new Error("Aucun token GitHub enregistré. Enregistre ton token dans le générateur avant d'importer une image.");
    }

    if(!file || !file.name) throw new Error("Aucun fichier sélectionné.");
    if(file.size > 10 * 1024 * 1024){
        throw new Error("L'image est trop volumineuse. Maximum : 10 Mo.");
    }

    const lower = file.name.toLowerCase();
    if(!IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))){
        throw new Error("Format non pris en charge. Utilise JPG, PNG, WebP, GIF, SVG ou AVIF.");
    }

    const folder = type === "logo" ? "img/logos" : "img/evenements";
    const filename = sanitizeFileName(file.name);
    const path = `${folder}/${filename}`;
    const content = await fileToBase64(file);

    const url = githubContentsUrl(path);
    const headers = {
        "Accept":"application/vnd.github+json",
        "Authorization":"Bearer " + token,
        "X-GitHub-Api-Version":"2022-11-28",
        "Content-Type":"application/json"
    };

    /* Si le fichier existe déjà, demander confirmation puis réutiliser son SHA. */
    let sha = null;
    const existing = await fetch(url, {headers});
    if(existing.ok){
        const existingData = await existing.json();
        sha = existingData.sha;
        if(!confirm(`Le fichier « ${filename} » existe déjà dans ${folder}.\n\nVoulez-vous le remplacer ?`)){
            return null;
        }
    }else if(existing.status !== 404){
        const text = await existing.text();
        throw new Error(`GitHub (${existing.status}) : ${text}`);
    }

    const body = {
        message: `📷 Ajout image : ${filename}`,
        content
    };
    if(sha) body.sha = sha;

    const response = await fetch(url, {
        method:"PUT",
        headers,
        body:JSON.stringify(body)
    });

    if(!response.ok){
        const text = await response.text();
        throw new Error(`Erreur GitHub (${response.status}) : ${text}`);
    }

    imageLibraryCache = null;

    return {
        path,
        name:filename,
        url:imageGitHubPagesUrl(path)
    };
}

function addUploadButton(input, id, type, label){
    if(document.getElementById(id)) return;

    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = "mediaUploadBtn";
    button.textContent = label;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = type === "logo"
        ? "image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif"
        : "image/png,image/jpeg,image/webp,image/gif,image/avif";
    fileInput.className = "mediaHiddenFileInput";
    fileInput.tabIndex = -1;
    fileInput.setAttribute("aria-hidden","true");

    button.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files && fileInput.files[0];
        fileInput.value = "";
        if(!file) return;

        const oldText = button.textContent;
        button.disabled = true;
        button.textContent = "Envoi…";

        try{
            const image = await uploadImageToGitHub(file, type);
            if(!image){
                button.textContent = oldText;
                return;
            }

            input.value = image.url;
            input.dispatchEvent(new Event("input", {bubbles:true}));
            input.dispatchEvent(new Event("change", {bubbles:true}));
            if(typeof window.generate === "function") window.generate();

            showMediaMessage(`Image ajoutée sur GitHub : ${image.path}`, false);
        }catch(error){
            console.error(error);
            showMediaMessage(error.message, true);
        }finally{
            button.disabled = false;
            button.textContent = oldText;
        }
    });

    input.parentNode.insertBefore(button, input.nextSibling);
    input.parentNode.insertBefore(fileInput, button.nextSibling);
}

function showMediaMessage(text, error){
    let box = document.getElementById("mediaUploadMessage");
    if(!box){
        box = document.createElement("div");
        box.id = "mediaUploadMessage";
        box.className = "mediaUploadMessage";
        document.body.appendChild(box);
    }
    box.textContent = text;
    box.classList.toggle("error", !!error);
    box.classList.add("visible");
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove("visible"), 5000);
}

function insertMediaButtons(){
    const imageInput = document.getElementById("f_image");
    const logoInput = document.getElementById("f_logo");
    if(!imageInput || !logoInput) return;

    function addChooseButton(input, id, title, options){
        if(document.getElementById(id)) return;

        const row = document.createElement("div");
        row.className = "mediaInputRow";
        input.parentNode.insertBefore(row,input);
        row.appendChild(input);

        const button = document.createElement("button");
        button.id = id;
        button.type = "button";
        button.className = "mediaChooseBtn";
        button.textContent = "Choisir";
        button.addEventListener("click", () => openMediaPicker({
            title,
            ...options,
            onSelect:image => {
                input.value = image.url;
                input.dispatchEvent(new Event("input", {bubbles:true}));
                input.dispatchEvent(new Event("change", {bubbles:true}));
                if(typeof window.generate === "function") window.generate();
            }
        }));
        row.appendChild(button);
    }

    addChooseButton(imageInput,"chooseImageBtn","Choisir une image d'événement",{
        subtitle:"Toutes les images disponibles",
        excludeLogos:true
    });

    addChooseButton(logoInput,"chooseLogoBtn","Choisir un logo",{
        subtitle:"Logos disponibles",
        logoOnly:true
    });

    /* Les boutons d'import restent dans la même ligne que le champ. */
    addUploadButton(imageInput,"uploadImageBtn","image","📤 Ajouter depuis le PC");
    addUploadButton(logoInput,"uploadLogoBtn","logo","📤 Ajouter depuis le PC");
}

window.ImageLibrary = {
    openPicker:openMediaPicker,
    closePicker:closeMediaPicker,
    fetchImages:fetchImageFiles,
    uploadImage:uploadImageToGitHub
};

document.addEventListener("DOMContentLoaded", () => {
    insertMediaButtons();
    document.addEventListener("keydown", event => {
        if(event.key === "Escape") closeMediaPicker();
    });
});
