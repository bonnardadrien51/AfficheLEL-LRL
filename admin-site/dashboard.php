<?php
declare(strict_types=1);
require __DIR__ . '/auth/guard.php';
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Administration — L'établi ludique</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;background:#0a1330;color:#fff;font-family:"Baloo 2","Segoe UI",Arial,sans-serif;padding:24px}
.page{max-width:1100px;margin:auto}
header{display:flex;align-items:center;gap:20px;margin-bottom:30px;flex-wrap:wrap}
header img{height:70px;width:auto}
h1{margin:0;font-size:34px}
header p{margin:4px 0;color:#a9b0cc}
.logout{margin-left:auto;color:#fff;background:#3a4066;padding:9px 14px;border-radius:9px;text-decoration:none;font-weight:700}
h2{font-size:22px;margin:30px 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.card{display:block;text-decoration:none;color:#fff;background:#141c40;border:1px solid #30385f;border-radius:16px;padding:20px;transition:.15s}
.card:hover{transform:translateY(-2px);border-color:#e97126}
.icon{font-size:30px;margin-bottom:8px}
.card h3{margin:0 0 5px;font-size:21px}
.card p{margin:0;color:#a9b0cc;line-height:1.35}
.paramCard{background:#141c40;border:1px solid #30385f;border-radius:16px;padding:16px}
.paramTitle{font-weight:800;font-size:18px;margin-bottom:8px}
.paramUrl{display:block;background:#0a1330;color:#dfe5ff;border-radius:8px;padding:9px;font:12px/1.4 Consolas,monospace;overflow:auto;white-space:nowrap;margin-bottom:10px}
.smallBtn,.formatBtn{display:inline-block;border:0;border-radius:8px;padding:8px 11px;background:#3a4066;color:#fff;text-decoration:none;font:700 13px "Baloo 2","Segoe UI",Arial,sans-serif;cursor:pointer}
.smallBtn:hover,.formatBtn:hover{filter:brightness(1.15)}
.dayCard,.eventCard{background:#141c40;border:1px solid #30385f;border-radius:16px;padding:17px}
.dayDate,.eventDate{font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#a9b0cc;font-weight:800}
.dayTitle,.eventTitle{font-size:18px;font-weight:800;line-height:1.25;margin:6px 0 10px}
.eventMeta{font-size:13px;color:#a9b0cc;margin-bottom:12px;line-height:1.4}
.btnRow{display:flex;gap:7px;flex-wrap:wrap}
.formatBtn.primary{background:#e97126}
.loading,.empty,.error{grid-column:1/-1;text-align:center;color:#a9b0cc;padding:14px}
.note{margin-top:25px;padding:14px 16px;background:#111a3b;border-radius:12px;color:#c6cbe0}
@media(max-width:600px){body{padding:14px}header img{height:55px}h1{font-size:28px}.logout{margin-left:0}.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="page">
<header>
<img src="../agenda/img/logo-etabli.svg" alt="L'établi ludique">
<div>
<h1>Administration</h1>
<p>Gestion des événements, communications et outils de L'établi ludique</p>
</div>
<a class="logout" href="auth/logout.php">Déconnexion</a>
</header>

<h2>Événements</h2>
<div class="grid">
<a class="card" href="admin.html"><div class="icon">📅</div><h3>Gestion des événements</h3><p>Statuts, communications associées et événements à venir.</p></a>
<a class="card" href="communication/evenements.php"><div class="icon">🗓️</div><h3>Événements à copier</h3><p>Sélectionner et copier les événements pour les communications.</p></a>
</div>

<h2>🔗 Liens paramétriques à copier-coller</h2>
<div class="grid" id="paramLinks"></div>

<h2>📅 Journées</h2>
<div class="grid" id="daysContainer"><div class="loading">Chargement des journées…</div></div>

<h2>🎫 Prochains événements</h2>
<div class="grid" id="eventsContainer"><div class="loading">Chargement des événements…</div></div>

<h2>Communication</h2>
<div class="grid">
<a class="card" href="communication/mails.php"><div class="icon">✉️</div><h3>Gestion des mails</h3><p>Modèles de mails, variables et historique d'utilisation.</p></a>
<a class="card" href="communication/generiques.php"><div class="icon">📣</div><h3>Communications génériques</h3><p>Posts Facebook et Instagram avec suivi des publications.</p></a>
</div>

<h2>Outils</h2>
<div class="grid">
<a class="card" href="generateur.php"><div class="icon">🖼️</div><h3>Générateur</h3><p>Créer les visuels et affiches à partir des données d'événements.</p></a>
<a class="card" href="verif-visuels.php"><div class="icon">🔎</div><h3>Vérification des visuels</h3><p>Contrôler les visuels et les éléments nécessaires.</p></a>
<a class="card" href="vacances.php"><div class="icon">🏖️</div><h3>Absences</h3><p>Gestion des périodes d’absence et vacances.</p></a>
</div>

<div class="note">Les affiches générées depuis cette page utilisent directement les événements de l’agenda public.</div>
</div>

<script>
const PUBLIC_BASE = "https://letabliludique.fr/agenda/";
const EVENTS_URL = "../agenda/agenda.json";

function escapeHtml(value){
    return String(value ?? "").replace(/[&<>'"]/g, c => ({
        "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"
    }[c]));
}

function dayKey(date){
    return date.toLocaleDateString("en-CA",{timeZone:"Europe/Paris"});
}

function formatDate(date){
    return date.toLocaleDateString("fr-FR",{
        weekday:"long",day:"numeric",month:"long",timeZone:"Europe/Paris"
    });
}

function formatShortDate(date){
    return date.toLocaleDateString("fr-FR",{
        day:"2-digit",month:"short",timeZone:"Europe/Paris"
    }).replace(".","").toUpperCase();
}

function formatHour(date){
    const h = date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Paris"});
    return h.replace(":","h").replace(/^0/,"");
}

async function copyText(text, button){
    try{
        await navigator.clipboard.writeText(text);
        const old = button.textContent;
        button.textContent = "✓ Copié";
        setTimeout(() => button.textContent = old, 1800);
    }catch(e){
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        const old = button.textContent;
        button.textContent = "✓ Copié";
        setTimeout(() => button.textContent = old, 1800);
    }
}

function renderParamLinks(){
    const container = document.getElementById("paramLinks");
    container.innerHTML = "";
    for(let i=1;i<=6;i++){
        const url = PUBLIC_BASE + "affiche.html?event=" + i + "&simple=1";
        const card = document.createElement("div");
        card.className = "paramCard";
        card.innerHTML =
            '<div class="paramTitle">Événement ' + i + ' — mode simple</div>' +
            '<code class="paramUrl">' + escapeHtml(url) + '</code>' +
            '<div class="btnRow">' +
            '<a class="smallBtn" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Visualiser</a>' +
            '<button class="smallBtn" type="button">📋 Copier le lien</button>' +
            '</div>';
        card.querySelector("button").addEventListener("click", () => copyText(url, card.querySelector("button")));
        container.appendChild(card);
    }
}

function eventButtons(event){
    const uid = event.uid ? encodeURIComponent(event.uid) : "";
    const date = dayKey(new Date(event.start));
    return '<a class="formatBtn primary" href="' + PUBLIC_BASE + 'affiche.html?id=' + uid + '" target="_blank" rel="noopener">🖼️ Affiche</a>' +
        '<a class="formatBtn" href="' + PUBLIC_BASE + 'affiche-carre-evenement.html?id=' + uid + '" target="_blank" rel="noopener">◼️ Carré</a>' +
        '<a class="formatBtn" href="' + PUBLIC_BASE + 'affiche-facebook-evenement.html?id=' + uid + '" target="_blank" rel="noopener">📣 Facebook</a>' +
        '<a class="formatBtn" href="' + PUBLIC_BASE + 'jour.html?date=' + date + '" target="_blank" rel="noopener">📅 Journée</a>';
}

async function loadAgenda(){
    const days = document.getElementById("daysContainer");
    const eventsContainer = document.getElementById("eventsContainer");
    try{
        const response = await fetch(EVENTS_URL + "?t=" + Date.now());
        if(!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        const all = (data.events || [])
            .filter(event => event.start)
            .sort((a,b) => new Date(a.start) - new Date(b.start));

        const now = Date.now();
        const events = all.filter(event => new Date(event.start).getTime() >= now);

        if(!events.length){
            days.innerHTML = '<div class="empty">Aucun événement à venir.</div>';
            eventsContainer.innerHTML = '<div class="empty">Aucun événement à venir.</div>';
            return;
        }

        const byDay = {};
        events.forEach(event => {
            const start = new Date(event.start);
            const key = dayKey(start);
            if(!byDay[key]) byDay[key] = {date:start,events:[]};
            byDay[key].events.push(event);
        });

        days.innerHTML = "";
        Object.keys(byDay).sort().forEach(key => {
            const day = byDay[key];
            const card = document.createElement("div");
            card.className = "dayCard";
            const first = day.events[0];
            const extra = day.events.length > 1 ? " · " + day.events.length + " événements" : "";
            const url = PUBLIC_BASE + "jour.html?date=" + key;
            card.innerHTML =
                '<div class="dayDate">' + escapeHtml(formatDate(day.date)) + '</div>' +
                '<div class="dayTitle">' + escapeHtml(first.title || "Événements du jour") + escapeHtml(extra) + '</div>' +
                '<div class="btnRow"><a class="formatBtn primary" href="' + url + '" target="_blank" rel="noopener">Afficher la journée</a></div>';
            days.appendChild(card);
        });

        eventsContainer.innerHTML = "";
        events.slice(0,24).forEach(event => {
            const start = new Date(event.start);
            const card = document.createElement("div");
            card.className = "eventCard";
            const location = event.location ? " · " + event.location : "";
            card.innerHTML =
                '<div class="eventDate">' + escapeHtml(formatShortDate(start)) + ' · ' + escapeHtml(formatHour(start)) + '</div>' +
                '<div class="eventTitle">' + escapeHtml(event.title || "Événement sans titre") + '</div>' +
                '<div class="eventMeta">' + escapeHtml(location.replace(/^ · /,"")) + '</div>' +
                '<div class="btnRow">' + eventButtons(event) + '</div>';
            eventsContainer.appendChild(card);
        });
    }catch(error){
        console.error(error);
        days.innerHTML = '<div class="error">Impossible de charger les journées.</div>';
        eventsContainer.innerHTML = '<div class="error">Impossible de charger les événements.</div>';
    }
}

renderParamLinks();
loadAgenda();
</script>
</body>
</html>
