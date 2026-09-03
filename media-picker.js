/*
 * Bibliothèque d'images pour le générateur.
 * Reprend le principe du sélecteur de AfficheEventAffichageDyn :
 * parcours de img/ et de ses sous-dossiers, recherche et sélection.
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

async function fetchImageFiles(){
    if(imageLibraryCache) return imageLibraryCache;

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

function insertMediaButtons(){
    const imageInput = document.getElementById("f_image");
    const logoInput = document.getElementById("f_logo");
    if(!imageInput || !logoInput) return;

    function addButton(input, id, title, options){
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
                if(typeof window.generate === "function") window.generate();
            }
        }));
        row.appendChild(button);
    }

    addButton(imageInput,"chooseImageBtn","Choisir une image d'événement",{
        subtitle:"Toutes les images disponibles",
        excludeLogos:true
    });

    addButton(logoInput,"chooseLogoBtn","Choisir un logo",{
        subtitle:"Logos disponibles",
        logoOnly:true
    });
}

window.ImageLibrary = {
    openPicker:openMediaPicker,
    closePicker:closeMediaPicker,
    fetchImages:fetchImageFiles
};

document.addEventListener("DOMContentLoaded", () => {
    insertMediaButtons();
    document.addEventListener("keydown", event => {
        if(event.key === "Escape") closeMediaPicker();
    });
});
