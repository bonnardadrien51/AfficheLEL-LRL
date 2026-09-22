const DATA_URL = "vacances.json";
const REFRESH_MS = 30 * 60 * 1000; // 30 min, pas besoin de plus fréquent

// Renvoie la date du jour telle que comprise en France (Europe/Paris),
// au format YYYY-MM-DD, indépendamment du fuseau du navigateur/serveur.
function todayParisYMD(){
    return new Date().toLocaleDateString("en-CA", { timeZone:"Europe/Paris" });
}

// Les dates de vacances (journée entière) sont stockées en UTC minuit ;
// on récupère juste l'année/mois/jour d'origine, sans conversion de fuseau.
function toYMD(isoString){
    const d = new Date(isoString);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatFrenchDate(isoString){
    const d = new Date(isoString);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toLocaleDateString("fr-FR", { day:"numeric", month:"long", timeZone:"UTC" });
}

// Nombre de jours entiers entre deux dates YYYY-MM-DD (calcul en UTC pour
// éviter tout souci d'heure d'été/hiver).
function daysBetweenYMD(fromYMD, toYMDStr){
    const [ay, am, ad] = fromYMD.split("-").map(Number);
    const [by, bm, bd] = toYMDStr.split("-").map(Number);
    const a = Date.UTC(ay, am - 1, ad);
    const b = Date.UTC(by, bm - 1, bd);
    return Math.round((b - a) / 86400000);
}

// Décale une date ISO d'un nombre de jours (peut être négatif).
function addDaysISO(isoString, delta){
    const d = new Date(isoString);
    return new Date(Date.UTC(
        d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + delta
    )).toISOString();
}

// À combien de jours avant le début d'une période on commence à annoncer
// "bientôt les vacances".
const UPCOMING_DAYS_THRESHOLD = 30;

async function checkVacances(){

    let periods = [];

    try {
        const res = await fetch(DATA_URL + "?t=" + Date.now());
        const json = await res.json();
        periods = json.periods || [];
    } catch(err){
        console.error("Erreur de chargement de vacances.json :", err);
        document.body.classList.remove("active");
        return;
    }

    const today = todayParisYMD();

    // 1. Période de vacances en cours (fin exclusive, norme iCal).
    const current = periods.find(p =>
        toYMD(p.start) <= today && today < toYMD(p.end)
    );

    if(current){

        const lastDay = addDaysISO(current.end, -1);

        document.getElementById("bannerText").textContent =
            `🌴 En vacances jusqu'au ${formatFrenchDate(lastDay)}`;

        document.body.classList.add("active");

        return;

    }

    // 2. Sinon, la prochaine période à venir : si elle commence dans moins
    // de UPCOMING_DAYS_THRESHOLD jours, on l'annonce à l'avance. Comme on
    // reprend simplement la plus proche dans vacances.json à chaque
    // vérification, ça s'enchaîne tout seul d'une période à l'autre sans
    // rien à reconfigurer.
    const upcoming = periods
        .filter(p => toYMD(p.start) > today)
        .sort((a, b) => new Date(a.start) - new Date(b.start))[0];

    if(upcoming){

        const daysUntil = daysBetweenYMD(today, toYMD(upcoming.start));

        if(daysUntil <= UPCOMING_DAYS_THRESHOLD){

            const lastDay = addDaysISO(upcoming.end, -1);

            document.getElementById("bannerText").textContent =
                `📅 Bientôt les vacances ! ${upcoming.titre} dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""} ` +
                `(du ${formatFrenchDate(upcoming.start)} au ${formatFrenchDate(lastDay)})`;

            document.body.classList.add("active");

            return;

        }

    }

    document.body.classList.remove("active");

}

checkVacances();
setInterval(checkVacances, REFRESH_MS);
