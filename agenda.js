// Chaque page peut définir window.AGENDA_CONFIG *avant* d'inclure agenda.js
// pour personnaliser la source de données, un filtre, le nombre d'événements
// affichés et le nom du fichier exporté, sans dupliquer ce fichier.
const CONFIG = Object.assign({

    dataSource: "agenda.json",

    // Une chaîne, un tableau de chaînes, ou null pour ne rien filtrer.
    // Comparé au champ "label" de chaque événement (ex: "Soirée adhérents").
    filterLabel: null,

    maxEvents: 6,

    downloadName: "couverture-facebook.png"

}, window.AGENDA_CONFIG || {});

const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
];

const shortMonths = [
    "JAN",
    "FÉV",
    "MAR",
    "AVR",
    "MAI",
    "JUN",
    "JUL",
    "AOÛ",
    "SEP",
    "OCT",
    "NOV",
    "DÉC"
];

const shortWeekdays = [
    "Dim",
    "Lun",
    "Mar",
    "Mer",
    "Jeu",
    "Ven",
    "Sam"
];

document.addEventListener("DOMContentLoaded", () => {

    loadAgenda();

    document
        .getElementById("refreshBtn")
        .addEventListener("click", loadAgenda);

    document
        .getElementById("downloadBtn")
        .addEventListener("click", exportPNG);

});


async function loadAgenda(){

    const response = await fetch(CONFIG.dataSource);

    const json = await response.json();

    const now = new Date();

    const allowedLabels = CONFIG.filterLabel === null
        ? null
        : Array.isArray(CONFIG.filterLabel)
            ? CONFIG.filterLabel
            : [CONFIG.filterLabel];

    let events = json.events
        .map(e => {

            e.date = new Date(e.start);

            return e;

        })

        .filter(e => e.date >= now)

        .filter(e => allowedLabels === null || allowedLabels.includes(e.label))

        .sort((a,b)=>a.date-b.date)

        .slice(0, CONFIG.maxEvents);

    buildEvents(events);

    document.getElementById("update").innerHTML =
        "Dernière mise à jour : " + json.updated;

    if(events.length){

        document.getElementById("currentMonth").innerHTML =
            months[
                events[0].date.getMonth()
            ] + " " +
            events[0].date.getFullYear();

    }

}



function buildEvents(events){

    const container = document.getElementById("events");

    container.innerHTML = "";

    events.forEach(event=>{

        const day = event.date.getDate();

        const weekday =
            shortWeekdays[event.date.getDay()];

        const month =
            shortMonths[event.date.getMonth()];

        const startHour =
            new Date(event.start).toLocaleTimeString(
            "fr-FR",
            {
                hour:"2-digit",
                minute:"2-digit"
            }
        );
    
        const endHour =
            new Date(event.end).toLocaleTimeString(
            "fr-FR",
            {
                hour:"2-digit",
                minute:"2-digit"
            }
        );

        const badge = event.label;
        const color = event.color;

        container.innerHTML += `

<div class="event">

<div
    class="date"
    style="background:${color};">

    <div class="weekday">
        ${weekday}
    </div>

    <div class="day">
        ${day}
    </div>

    <div class="month">
        ${month}
    </div>

</div>

    <div class="left">

        <img
            class="categoryIcon"
            src="img/categories/${event.icon}"
            alt="">

    </div>

    <div class="content">

        <div class="badge"
             style="background:${event.color};">

            ${event.label}

        </div>

        <div class="title">

            ${event.title}

        </div>

        <div class="info">

            <span class="location">📍 ${event.location}</span>

            <span class="time">🕒 ${startHour} - ${endHour}</span>

        </div>

    </div>

</div>

`;

    });

}



function exportPNG(){

    const toolbar =
        document.querySelector(".toolbar");

    toolbar.style.display="none";

    const cover =
        document.getElementById("cover");

    // S'assure que toutes les images (logos, icônes svg...)
    // sont bien chargées avant la capture, sinon certaines
    // peuvent manquer sur l'export.
    const images =
        Array.from(cover.querySelectorAll("img"));

    const whenReady = images.map(img=>{

        if(img.complete && img.naturalWidth!==0){
            return Promise.resolve();
        }

        return new Promise(resolve=>{
            img.addEventListener("load", resolve, {once:true});
            img.addEventListener("error", resolve, {once:true});
        });

    });

    Promise.all(whenReady).then(()=>{

        html2canvas(

            cover,

            {

                scale:2,

                backgroundColor:null,

                useCORS:true,

                allowTaint:true,

                imageTimeout:0

            }

        ).then(canvas=>{

            toolbar.style.display="flex";

            const link =
                document.createElement("a");

            link.download =
                CONFIG.downloadName;

            link.href =
                canvas.toDataURL("image/png");

            link.click();

        });

    });

}
