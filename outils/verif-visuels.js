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

function renderInfosTable(container, list){

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
            <td>${(j.manquants || []).map(m => `<span class="champBadge">${m}</span>`).join("")}</td>
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
                    <th>Champs manquants</th>
                    <th>Fiche</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;

}

function renderEmplacementGroups(container, groupes){

    if(!groupes || groupes.length === 0){
        container.innerHTML = `<div class="empty">Tous les jeux ont un emplacement 🎉</div>`;
        return;
    }

    container.innerHTML = groupes.map(groupe => `
        <div class="lieuGroup">
            <div class="lieuTitle">${groupe.lieu} (${groupe.jeux.length})</div>
            ${renderTableMarkup(groupe.jeux)}
        </div>
    `).join("");

}

function renderTableMarkup(list){

    if(!list || list.length === 0){
        return `<div class="empty">Rien à signaler 🎉</div>`;
    }

    const rows = list.map(j => `
        <tr>
            <td class="thumb">
                <img src="${j.image}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
            </td>
            <td>${j.titre}</td>
            <td><a href="${j.image}" target="_blank" rel="noopener">image</a></td>
            <td><a href="${j.url}" target="_blank" rel="noopener">fiche</a></td>
        </tr>
    `).join("");

    return `
        <table>
            <thead>
                <tr>
                    <th></th>
                    <th>Titre</th>
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

function setupEmplacementFilter(inputId, containerId, groupes){

    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    input.addEventListener("input", () => {

        const q = input.value.trim().toLowerCase();

        const filtered = !q
            ? groupes
            : groupes
                .map(groupe => ({
                    lieu: groupe.lieu,
                    jeux: groupe.jeux.filter(j => j.titre.toLowerCase().includes(q))
                }))
                .filter(groupe => groupe.jeux.length > 0);

        renderEmplacementGroups(container, filtered);

    });

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

function setupInfosFilter(inputId, containerId, list){

    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    input.addEventListener("input", () => {

        const q = input.value.trim().toLowerCase();

        const filtered = q
            ? list.filter(j => j.titre.toLowerCase().includes(q))
            : list;

        renderInfosTable(container, filtered);

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
        renderEmplacementGroups(document.getElementById("emplacementGroups"), []);
        renderInfosTable(document.getElementById("tableInfos"), []);
        return;
    }

    updatedEl.textContent =
        `Dernière vérification : ${data.updated || "?"} — ${data.total || 0} jeu(x) au catalogue`;

    const manquants = data.visuelsManquants || [];
    const png = data.pngRestants || [];
    const sansEmplacement = data.sansEmplacement || [];
    const infosManquantes = data.infosManquantes || [];

    document.getElementById("countManquants").textContent = manquants.length;
    document.getElementById("countPng").textContent = png.length;
    document.getElementById("countInfos").textContent = infosManquantes.length;

    const totalSansEmplacement = sansEmplacement.reduce(
        (sum, groupe) => sum + groupe.jeux.length, 0
    );
    document.getElementById("countEmplacement").textContent = totalSansEmplacement;

    renderTable(document.getElementById("tableManquants"), manquants);
    renderTable(document.getElementById("tablePng"), png);
    renderEmplacementGroups(document.getElementById("emplacementGroups"), sansEmplacement);
    renderInfosTable(document.getElementById("tableInfos"), infosManquantes);

    setupFilter("searchManquants", "tableManquants", manquants);
    setupFilter("searchPng", "tablePng", png);
    setupEmplacementFilter("searchEmplacement", "emplacementGroups", sansEmplacement);
    setupInfosFilter("searchInfos", "tableInfos", infosManquantes);

}

loadSuivi();
