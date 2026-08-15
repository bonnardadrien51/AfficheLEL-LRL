const DATA_URL = "jeux.json";
const REFRESH_MS = 30 * 60 * 1000;
const MIN_JEUX = 4;
const MAX_JEUX = 8;

function buildCard(jeu){

    const card = document.createElement("div");
    card.className = "jeuCard";

    card.innerHTML = `
        <div class="jeuCover">
            <img src="${jeu.image}" alt="${jeu.titre}" loading="eager">
        </div>
        <div class="jeuBadge">Nouveau</div>
        <div class="jeuInfo">
            <div class="jeuTitle">${jeu.titre}</div>
        </div>
    `;

    return card;

}

async function loadJeux(){

    let jeux = [];
    let updated = "";

    try {
        const res = await fetch(DATA_URL + "?t=" + Date.now());
        const json = await res.json();
        jeux = json.jeux || [];
        updated = json.updated || "";
    } catch(err){
        console.error("Erreur chargement jeux.json :", err);
    }

    // jeux.json est déjà trié et limité côté génération (voir
    // scripts/generate-json.js), on sécurise quand même ici.
    const newest = jeux
        .slice()
        .sort((a, b) => new Date(b.date_ajout) - new Date(a.date_ajout))
        .slice(0, MAX_JEUX);

    document.getElementById("update").textContent =
        updated ? "Dernière mise à jour : " + updated : "Dernière mise à jour";

    if(newest.length >= MIN_JEUX){

        document.getElementById("currentMonth").textContent =
            new Date().toLocaleDateString("fr-FR", {
                month:"long", year:"numeric", timeZone:"Europe/Paris"
            });

        document.body.classList.remove("empty");

        const grid = document.getElementById("jeuxGrid");
        grid.innerHTML = "";
        grid.classList.toggle("singleRow", newest.length <= 4);
        newest.forEach(j => grid.appendChild(buildCard(j)));

    } else {

        document.body.classList.add("empty");

    }

}

// Export PNG (même logique que les autres affiches du projet)
document.getElementById("refreshBtn").addEventListener("click", loadJeux);

document.getElementById("downloadBtn").addEventListener("click", () => {

    const toolbar = document.querySelector(".toolbar");
    toolbar.style.display = "none";

    const cover = document.getElementById("cover");
    const images = Array.from(cover.querySelectorAll("img"));
    const whenReady = images.map(img => img.complete && img.naturalWidth !== 0
        ? Promise.resolve()
        : new Promise(r => { img.addEventListener("load", r, {once:true}); img.addEventListener("error", r, {once:true}); })
    );

    Promise.all(whenReady).then(() => {
        html2canvas(cover, { scale:2, backgroundColor:null, useCORS:true, allowTaint:true, imageTimeout:0 })
            .then(canvas => {
                toolbar.style.display = "flex";
                const link = document.createElement("a");
                link.download = "affiche-carre-jeux.png";
                link.href = canvas.toDataURL("image/png");
                link.click();
            });
    });

});

loadJeux();
setInterval(loadJeux, REFRESH_MS);
