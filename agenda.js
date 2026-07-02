const EVENTS_URL = "agenda.json";

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

    const response = await fetch(EVENTS_URL);

    const json = await response.json();

    const now = new Date();

    let events = json.events
        .map(e => {

            e.date = new Date(e.start);

            return e;

        })

        .filter(e => e.date >= now)

        .sort((a,b)=>a.date-b.date)

        .slice(0,10);

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

        const month =
            shortMonths[event.date.getMonth()];

        const hour =
            event.date.toLocaleTimeString(
                "fr-FR",
                {
                    hour:"2-digit",
                    minute:"2-digit"
                }
            );

        const badge =
            event.calendar === "raffut"
            ? "Le Raffut Ludique"
            : "L'Établi Ludique";

        const color =
            event.calendar;

        container.innerHTML += `

<div class="event">

    <div class="date ${color}">

        <div class="day">

            ${day}

        </div>

        <div class="month">

            ${month}

        </div>

    </div>

    <div class="content">

        <div class="badge ${color}">

            ${badge}

        </div>

        <div class="title">

            ${event.title}

        </div>

        <div class="info">

            <span>

                📍 ${event.location || ""}

            </span>

            <span>

                🕒 ${hour}

            </span>

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

    html2canvas(

        document.getElementById("cover"),

        {

            scale:2,

            backgroundColor:null

        }

    ).then(canvas=>{

        toolbar.style.display="flex";

        const link =
            document.createElement("a");

        link.download =
            "couverture-facebook.png";

        link.href =
            canvas.toDataURL("image/png");

        link.click();

    });

}
