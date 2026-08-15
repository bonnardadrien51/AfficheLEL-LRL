const axios = require("axios");
const ical = require("node-ical");
const fs = require("fs");

const calendars = [

  {
    url: "https://calendar.google.com/calendar/ical/e179f20eeae333cceeb677b269f4846c97586634dcb3f2cc1b44d5c8bd9cfba4%40group.calendar.google.com/public/basic.ics",
    label: "Partenaire",
    icon: "LELpartenaire.svg",
    color: "#9EB6F1"
  },

  {
    url: "https://calendar.google.com/calendar/ical/8761c42019d8999b290f2830e85dde57dc1ce8d1779229fe9adf9802f8ef9c6e%40group.calendar.google.com/public/basic.ics",
    label: "Animation",
    icon: "LELanimation.svg",
    color: "#F29A63"
  },

  {
    url: "https://calendar.google.com/calendar/ical/3ddecb61f28da2da38b0b2ae74c7323778847780c13cff360ebc36a07c24ba24%40group.calendar.google.com/public/basic.ics",
    label: "Marché / Expo",
    icon: "LELmarche.svg",
    color: "#D99DC1"
  },

  {
    url: "https://calendar.google.com/calendar/ical/leraffutludique%40gmail.com/public/basic.ics",
    label: "Soirée au chapeau",
    icon: "LRLsoiree.svg",
    color: "#F062B0"
  },

  {
    url: "https://calendar.google.com/calendar/ical/795e1f6eb9318e01096825e3a3014ebd135f7c695b947cd87e94192505b9ace7%40group.calendar.google.com/public/basic.ics",
    label: "Soirée adhérents",
    icon: "LRLadherent.svg",
    color: "#F6D67A"
  }

];

const VACANCES_URL =
  "https://calendar.google.com/calendar/ical/0a1c5d7a3b7f8feab31b33af5f3c10777e558ac186c7688b1e4d9fb46ea72549%40group.calendar.google.com/public/basic.ics";

const JEUX_URL = "https://leraffutludique-online.fr:1880/lrl/getdetailjeux";

const JEUX_MAX = 8;

const JEUX_IMG_DIR = "img/jeux";

// Les covers sont hébergées sur leraffutludique.fr, qui ne renvoie pas
// d'en-têtes CORS : chargées directement en <img crossorigin>, elles
// sont bloquées par le navigateur. On les télécharge donc une fois ici
// et on les sert en local avec le reste du site.
async function downloadCover(url, filename) {

  fs.mkdirSync(JEUX_IMG_DIR, { recursive: true });

  const localPath = JEUX_IMG_DIR + "/" + filename;

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  fs.writeFileSync(localPath, response.data);

  return localPath;

}

async function loadNewestGames() {

  console.log("Lecture :", JEUX_URL);

  const response = await axios.get(JEUX_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const jeux = response.data || [];

  const sorted = [...jeux].sort(
    (a, b) => new Date(b.date_ajout) - new Date(a.date_ajout)
  );

  const newest = sorted.slice(0, JEUX_MAX);

  const result = [];

  for (const j of newest) {

    let image = j.image;

    try {

      const filename = j.image_jeu || (j.id + ".png");

      image = await downloadCover(j.image, filename);

      console.log("Cover téléchargée :", filename);

    } catch (err) {

      console.error(
        "Impossible de télécharger la cover de \"" + j.Titre + "\" :",
        err.message
      );

    }

    result.push({

      id: j.id,
      titre: j.Titre,
      lieu: j.Lieu,
      categorie: j.categorie,
      image,
      url: j.url,
      date_ajout: j.date_ajout

    });

  }

  return result;

}

async function loadVacationCalendar() {

  console.log("Lecture :", VACANCES_URL);

  const response = await axios.get(VACANCES_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const parsed = ical.sync.parseICS(response.data);

  const now = new Date();

  const periods = [];

  for (const key in parsed) {

    const e = parsed[key];

    if (e.type !== "VEVENT")
      continue;

    if (!e.start || !e.end)
      continue;

    // On garde les périodes en cours (pas encore terminées) ou à venir.
    // Contrairement aux événements ponctuels, on ne filtre pas sur le
    // début : une période de vacances déjà commencée doit rester visible
    // jusqu'à sa date de fin.
    if (e.end < now)
      continue;

    periods.push({

      titre: e.summary || "",

      start: e.start,

      end: e.end

    });

  }

  periods.sort((a, b) => a.start - b.start);

  return periods;

}

async function loadCalendar(calendar) {

  console.log("Lecture :", calendar.url);

  const response = await axios.get(calendar.url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const parsed = ical.sync.parseICS(response.data);

  const events = [];

  for (const key in parsed) {

    const e = parsed[key];

    if (e.type !== "VEVENT")
      continue;

    if (!e.start)
      continue;

    if (e.start < new Date())
      continue;

    events.push({

    title: e.summary || "",

    location: e.location || "",

    start: e.start,

    end: e.end || e.start,

    label: calendar.label,

    icon: calendar.icon,

    color: calendar.color

});

  }

  return events;

}

async function main() {

  let allEvents = [];

  const eventsByLabel = {};

  for (const calendar of calendars) {

    try {

      const list = await loadCalendar(calendar);

      allEvents.push(...list);

      eventsByLabel[calendar.label] = list;

    } catch (err) {

      console.error(err.message);

    }

  }

  allEvents.sort((a, b) => a.start - b.start);

  const generalEvents = allEvents.slice(0, 10);

  const generalJson = {

    updated: new Date().toLocaleString("fr-FR", {
      timeZone: "Europe/Paris"
    }),

    events: generalEvents

  };

  fs.writeFileSync(
    "agenda.json",
    JSON.stringify(generalJson, null, 2),
    "utf8"
  );

  console.log(generalEvents.length + " événements enregistrés dans agenda.json.");

  // Flux dédié : uniquement les soirées réservées aux adhérents,
  // indépendant des autres calendriers pour ne pas être écrasé
  // par le quota partagé de agenda.json.
  const adherentEvents = (eventsByLabel["Soirée adhérents"] || [])
    .sort((a, b) => a.start - b.start)
    .slice(0, 15);

  const adherentJson = {

    updated: new Date().toLocaleString("fr-FR", {
      timeZone: "Europe/Paris"
    }),

    events: adherentEvents

  };

  fs.writeFileSync(
    "agenda-adherents.json",
    JSON.stringify(adherentJson, null, 2),
    "utf8"
  );

  console.log(adherentEvents.length + " événements enregistrés dans agenda-adherents.json.");

  // Périodes de vacances, indépendantes des autres calendriers.
  try {

    const periods = await loadVacationCalendar();

    const vacancesJson = {

      updated: new Date().toLocaleString("fr-FR", {
        timeZone: "Europe/Paris"
      }),

      periods

    };

    fs.writeFileSync(
      "vacances.json",
      JSON.stringify(vacancesJson, null, 2),
      "utf8"
    );

    console.log(periods.length + " période(s) enregistrée(s) dans vacances.json.");

  } catch (err) {

    console.error("Erreur lors de la lecture du calendrier vacances :", err.message);

  }

  // Derniers jeux ajoutés à la ludothèque, indépendants des autres
  // calendriers pour ne pas être écrasés par le quota partagé.
  try {

    const jeux = await loadNewestGames();

    const jeuxJson = {

      updated: new Date().toLocaleString("fr-FR", {
        timeZone: "Europe/Paris"
      }),

      jeux

    };

    fs.writeFileSync(
      "jeux.json",
      JSON.stringify(jeuxJson, null, 2),
      "utf8"
    );

    console.log(jeux.length + " jeu(x) enregistré(s) dans jeux.json.");

  } catch (err) {

    console.error("Erreur lors de la lecture de la ludothèque :", err.message);

  }

}

main();
