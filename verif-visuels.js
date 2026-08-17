const DATA_URL = "jeux-suivi.json";

function renderTable(container, list){

    if(!list || list.length === 0){
        container.innerHTML = `<div class="empty">Rien à signaler 🎉</div>`;
        return;
    }

    const rows = list.map(j => `
        <tr>
            <td class="thumb">
                <img src="${j.image}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
            </td>
            <td>${j.titre}</td>
            <td>${j.lieu || ""}</td>
            <td><a href="${j.image}" target="_blank" rel="noopener">image</a></td>
            <td><a href="${j.url}" target="_blank" rel="noopener">fiche</a></td>
        </tr>
    `).join("");

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th></th>
                    <th>Titre</th>
                    <th>Lieu</th>
                    <th>Visuel</th>
                    <th>Fiche</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;

}

function setupFilter(inputId, containerId, list){

    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    input.addEventListener("input", () => {

        const q = input.value.trim().toLowerCase();

        const filtered = q
            ? list.filter(j => j.titre.toLowerCase().includes(q))
            : list;

        renderTable(container, filtered);

    });

}

async function loadSuivi(){

    let data = null;

    try {
        const res = await fetch(DATA_URL + "?t=" + Date.now());
        data = await res.json();
    } catch(err){
        console.error("Erreur chargement jeux-suivi.json :", err);
    }

    const updatedEl = document.getElementById("updated");

    if(!data){
        updatedEl.textContent = "Aucune donnée disponible pour le moment (première génération à venir).";
        renderTable(document.getElementById("tableManquants"), []);
        renderTable(document.getElementById("tablePng"), []);
        return;
    }

    updatedEl.textContent =
        `Dernière vérification : ${data.updated || "?"} — ${data.total || 0} jeu(x) au catalogue`;

    const manquants = data.visuelsManquants || [];
    const png = data.pngRestants || [];

    document.getElementById("countManquants").textContent = manquants.length;
    document.getElementById("countPng").textContent = png.length;

    renderTable(document.getElementById("tableManquants"), manquants);
    renderTable(document.getElementById("tablePng"), png);

    setupFilter("searchManquants", "tableManquants", manquants);
    setupFilter("searchPng", "tablePng", png);

}

loadSuivi();
