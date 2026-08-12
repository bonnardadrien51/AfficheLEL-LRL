const DATA_URL = "vacances.json";
const REFRESH_MS = 30 * 60 * 1000;
const MAX_ABSENCES = 3;

const shortMonths = [
    "JAN","FÉV","MAR","AVR","MAI","JUN",
    "JUL","AOÛ","SEP","OCT","NOV","DÉC"
];

const longMonths = [
    "janvier","février","mars","avril","mai","juin",
    "juillet","août","septembre","octobre","novembre","décembre"
];

function todayYMD(){
    return new Date().toLocaleDateString("en-CA", { timeZone:"Europe/Paris" });
}

function toYMD(isoString){
    const d = new Date(isoString);
    return [
        d.getUTCFullYear(),
        String(d.getUTCMonth()+1).padStart(2,"0"),
        String(d.getUTCDate()).padStart(2,"0")
    ].join("-");
}

// Retourne le nombre de jours d'une période (fin exclusive → on retire 1)
function durationDays(startISO, endISO){
    const s = new Date(startISO);
    const e = new Date(endISO);
    return Math.round((e - s) / 86400000);
}

function formatDay(isoString){
    const d = new Date(isoString);
    return d.getUTCDate();
}

function formatShortMonth(isoString){
    const d = new Date(isoString);
    return shortMonths[d.getUTCMonth()];
}

function buildCard(period){

    const card = document.createElement("div");
    card.className = "absenceCard";

    const startDate = new Date(period.start);
    const endDate = new Date(period.end);

    // Dernier jour réel (fin exclusive)
    const lastDay = new Date(endDate - 86400000);

    const days = durationDays(period.start, period.end);
    const durationText = days === 1 ? "1 jour" : `${days} jours`;

    const sameMonth = startDate.getUTCMonth() === lastDay.getUTCMonth();

    card.innerHTML = `
        <div class="absenceDate">
            <div class="dayFrom">${formatDay(period.start)}</div>
            <div class="monthFrom">${formatShortMonth(period.start)}</div>
            <div class="arrow">↓</div>
            <div class="dayTo">${formatDay(period.end)}</div>
            <div class="monthTo">${sameMonth ? "" : formatShortMonth(period.end)}</div>
        </div>
        <div class="absenceContent">
            <div class="absenceBadge">Absence</div>
            <div class="absenceTitle">${period.titre || "Fermeture"}</div>
            <div class="absenceDuration">⏱ ${durationText}</div>
        </div>
    `;

    return card;

}

async function loadAbsences(){

    let periods = [];
    let updated = "";

    try {
        const res = await fetch(DATA_URL + "?t=" + Date.now());
        const json = await res.json();
        periods = json.periods || [];
        updated = json.updated || "";
    } catch(err){
        console.error("Erreur chargement vacances.json :", err);
    }

    const today = todayYMD();

    // Prochaines absences : périodes qui n'ont pas encore commencé
    // OU en cours (déjà commencées mais pas terminées)
    const upcoming = periods
        .filter(p => toYMD(p.end) > today)
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, MAX_ABSENCES);

    document.getElementById("update").textContent =
        updated ? "Dernière mise à jour : " + updated : "Dernière mise à jour";

    if(upcoming.length){

        document.getElementById("currentMonth").textContent =
            new Date().toLocaleDateString("fr-FR", {
                month:"long", year:"numeric", timeZone:"Europe/Paris"
            });

        document.body.classList.remove("empty");

        const grid = document.getElementById("absenceGrid");
        grid.innerHTML = "";
        upcoming.forEach(p => grid.appendChild(buildCard(p)));

    } else {

        document.body.classList.add("empty");

    }

}

// Export PNG (même logique que les autres affiches du projet)
document.getElementById("refreshBtn").addEventListener("click", loadAbsences);

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
                link.download = "affiche-carre-absences.png";
                link.href = canvas.toDataURL("image/png");
                link.click();
            });
    });

});

loadAbsences();
setInterval(loadAbsences, REFRESH_MS);
