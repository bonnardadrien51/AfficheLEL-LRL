
const axios = require("axios");
const ical = require("node-ical");
const fs = require("fs");


// ============================================================
// CALENDRIERS
// ============================================================

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


const JEUX_URL =
  "https://leraffutludique-online.fr:1880/lrl/getdetailjeux";


const JEUX_MAX = 8;


const JEUX_IMG_DIR =
  "img/jeux";


// ============================================================
// OUTILS URL
// ============================================================

function normalizeUrl(value) {

  if (!value) {
    return "";
  }

  let url = String(value).trim();

  // Transforme :
  // [https://exemple.fr](https://exemple.fr)
  //
  // en :
  // https://exemple.fr

  const markdownMatch =
    url.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

  if (markdownMatch) {
    url = markdownMatch[2].trim();
  }

  return url;
}


// ============================================================
// DESCRIPTION GOOGLE CALENDAR
// ============================================================

function cleanDescription(rawDescription) {

  if (!rawDescription) {
    return "";
  }

  return String(rawDescription)

    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )

    .replace(
      /<[^>]+>/g,
      ""
    )

    .trim();
}


// ============================================================
// PARSING DU JSON DANS LA DESCRIPTION
// ============================================================

function parseCampaign(rawDescription) {

  const cleaned =
    cleanDescription(rawDescription);

  if (!cleaned) {
    return null;
  }

  try {

    const data =
      JSON.parse(cleaned);

    return {

      titre:
        data.titre || "",

      image:
        normalizeUrl(data.image),

      logo:
        normalizeUrl(data.logo),

      logo_fond:
        data.logo_fond || "",

      fond:
        normalizeUrl(data.fond),

      tarif:
        data.tarif || "",

      inscription:
        data.inscription || "",

      lien_inscription:
        normalizeUrl(
          data.lien_inscription
        ),

      statut:
        data.statut || "",

      lieu:
        data.lieu || "",

      affichage_lieu:
        data.affichage_lieu !== undefined
          ? String(data.affichage_lieu)
          : "3"

    };

  } catch (err) {

    console.warn(
      "Description JSON ignorée pour un événement :",
      cleaned.slice(0, 150)
    );

    return null;
  }
}


// ============================================================
// URL DES FICHES JEUX
// ============================================================

function toBoxUrl(id) {

  return (
    "https://leraffutludique-online.fr:1880/lrl/box?id_titre_jeu=" +
    id
  );

}


// ============================================================
// TÉLÉCHARGEMENT DES COVERS
// ============================================================

async function downloadCover(
  url,
  filename
) {

  fs.mkdirSync(
    JEUX_IMG_DIR,
    {
      recursive: true
    }
  );

  const localPath =
    JEUX_IMG_DIR +
    "/" +
    filename;

  const response =
    await axios.get(
      url,
      {
        responseType:
          "arraybuffer",

        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      }
    );

  fs.writeFileSync(
    localPath,
    response.data
  );

  return localPath;
}


// ============================================================
// DERNIERS JEUX
// ============================================================

async function loadNewestGames(
  allGames
) {

  const sorted =
    [...allGames].sort(
      (a, b) =>
        new Date(b.date_ajout) -
        new Date(a.date_ajout)
    );

  const newest =
    sorted.slice(
      0,
      JEUX_MAX
    );

  const result = [];

  for (const j of newest) {

    let image =
      j.image;

    let imageOk =
      true;

    try {

      const filename =
        j.image_jeu ||
        (j.id + ".png");

      image =
        await downloadCover(
          j.image,
          filename
        );

      console.log(
        "Cover téléchargée :",
        filename
      );

    } catch (err) {

      imageOk =
        false;

      console.error(
        'Impossible de télécharger la cover de "' +
        j.Titre +
        '":',
        err.message
      );

    }

    result.push({

      id:
        j.id,

      titre:
        j.Titre,

      lieu:
        j.Lieu,

      categorie:
        j.categorie,

      image,

      imageOk,

      joueurs:
        j.joueurs || null,

      age_min:
        j.age_min_detail_jeu || null,

      age_max:
        j.age_max_detail_jeu || null,

      url:
        toBoxUrl(j.id),

      date_ajout:
        j.date_ajout

    });

  }

  return result;
}


// ============================================================
// VÉRIFICATION DES IMAGES
// ============================================================

async function checkImageExists(
  url
) {

  try {

    const response =
      await axios.head(
        url,
        {
          timeout:
            10000,

          validateStatus:
            () => true,

          headers: {
            "User-Agent":
              "Mozilla/5.0"
          }
        }
      );

    return (
      response.status >= 200 &&
      response.status < 300
    );

  } catch (err) {

    return false;

  }
}


const CHECK_BATCH_SIZE = 15;


// ============================================================
// VÉRIFICATION DE TOUS LES JEUX
// ============================================================

async function checkAllGames(
  allGames
) {

  const results = [];

  for (
    let i = 0;
    i < allGames.length;
    i += CHECK_BATCH_SIZE
  ) {

    const batch =
      allGames.slice(
        i,
        i + CHECK_BATCH_SIZE
      );

    const batchResults =
      await Promise.all(

        batch.map(
          async j => {

            const ok =
              await checkImageExists(
                j.image
              );

            return {

              id:
                j.id,

              titre:
                j.Titre,

              lieu:
                j.Lieu,

              categorie:
                j.categorie,

              image:
                j.image,

              url:
                toBoxUrl(j.id),

              isPng:
                /\.png$/i.test(
                  j.image || ""
                ),

              visuelManquant:
                !ok

            };

          }
        )

      );

    results.push(
      ...batchResults
    );

    console.log(
      "Vérification visuels : " +
      Math.min(
        i + CHECK_BATCH_SIZE,
        allGames.length
      ) +
      "/" +
      allGames.length
    );

  }

  return results;
}


// ============================================================
// JEUX NON RANGÉS
// ============================================================

function buildEmplacementReport(
  allGames
) {

  const grouped = {};

  for (const j of allGames) {

    const emplacement =
      j.emplacement;

    const estNonRange =
      emplacement === -1 ||
      emplacement === "-1";

    if (!estNonRange) {
      continue;
    }

    const lieu =
      j.Lieu ||
      "Lieu inconnu";

    if (!grouped[lieu]) {
      grouped[lieu] = [];
    }

    grouped[lieu].push({

      id:
        j.id,

      titre:
        j.Titre,

      categorie:
        j.categorie,

      image:
        j.image,

      url:
        toBoxUrl(j.id)

    });

  }

  return Object.keys(grouped)

    .sort(
      (a, b) =>
        a.localeCompare(b)
    )

    .map(
      lieu => ({

        lieu,

        jeux:
          grouped[lieu].sort(
            (a, b) =>
              a.titre.localeCompare(
                b.titre
              )
          )

      })
    );

}


// ============================================================
// INFORMATIONS JEUX MANQUANTES
// ============================================================

const CHAMPS_REQUIS = [

  {
    champ:
      "joueurs",

    label:
      "Joueurs"
  },

  {
    champ:
      "age_min_detail_jeu",

    label:
      "Âge min"
  },

  {
    champ:
      "temps",

    label:
      "Durée"
  },

  {
    champ:
      "regle_detail_jeu",

    label:
      "Règles (PDF/lien)"
  }

];


function estVide(
  valeur
) {

  return (
    valeur === null ||
    valeur === undefined ||
    valeur === ""
  );

}


function buildMissingInfoReport(
  allGames
) {

  const result = [];

  for (const j of allGames) {

    const manquants =
      CHAMPS_REQUIS

        .filter(
          c =>
            estVide(
              j[c.champ]
            )
        )

        .map(
          c =>
            c.label
        );

    if (
      manquants.length === 0
    ) {
      continue;
    }

    result.push({

      id:
        j.id,

      titre:
        j.Titre,

      lieu:
        j.Lieu,

      categorie:
        j.categorie,

      image:
        j.image,

      url:
        toBoxUrl(j.id),

      manquants

    });

  }

  return result.sort(
    (a, b) =>
      a.titre.localeCompare(
        b.titre
      )
  );

}


// ============================================================
// CALENDRIER VACANCES
// ============================================================

async function loadVacationCalendar() {

  console.log(
    "Lecture :",
    VACANCES_URL
  );

  const response =
    await axios.get(
      VACANCES_URL,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      }
    );

  const parsed =
    ical.sync.parseICS(
      response.data
    );

  const now =
    new Date();

  const periods = [];

  for (const key in parsed) {

    const e =
      parsed[key];

    if (
      e.type !== "VEVENT"
    ) {
      continue;
    }

    if (
      !e.start ||
      !e.end
    ) {
      continue;
    }

    if (
      e.end < now
    ) {
      continue;
    }

    periods.push({

      titre:
        e.summary || "",

      start:
        e.start,

      end:
        e.end

    });

  }

  periods.sort(
    (a, b) =>
      a.start - b.start
  );

  return periods;
}


// ============================================================
// CHARGEMENT D'UN CALENDRIER
// ============================================================

async function loadCalendar(
  calendar
) {

  console.log(
    "Lecture :",
    calendar.url
  );

  const response =
    await axios.get(
      calendar.url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0"
        }
      }
    );

  const parsed =
    ical.sync.parseICS(
      response.data
    );

  const events = [];

  for (const key in parsed) {

    const e =
      parsed[key];

    if (
      e.type !== "VEVENT"
    ) {
      continue;
    }

    if (!e.start) {
      continue;
    }

    const end =
      e.end ||
      e.start;

    const now =
      new Date();

    // On ignore les événements complètement terminés.
    if (
      end < now
    ) {
      continue;
    }

    events.push({

      // ======================================================
      // IDENTIFIANT UNIQUE
      // ======================================================

      uid:
        e.uid || "",


      // ======================================================
      // DONNÉES CALENDRIER
      // ======================================================

      title:
        e.summary || "",

      location:
        e.location || "",

      start:
        e.start,

      end:
        end,

      label:
        calendar.label,

      icon:
        calendar.icon,

      color:
        calendar.color,


      // ======================================================
      // JSON PERSONNALISÉ
      // ======================================================

      campaign:
        parseCampaign(
          e.description
        )

    });

  }

  return events;
}


// ============================================================
// PROGRAMME PRINCIPAL
// ============================================================

async function main() {

  console.log(
    "========================================"
  );

  console.log(
    "   GÉNÉRATION DES ÉVÉNEMENTS"
  );

  console.log(
    "========================================"
  );


  let allEvents = [];


  const eventsByLabel = {};


  // ==========================================================
  // CHARGEMENT DES CALENDRIERS
  // ==========================================================

  for (
    const calendar of calendars
  ) {

    try {

      const list =
        await loadCalendar(
          calendar
        );

      allEvents.push(
        ...list
      );

      eventsByLabel[
        calendar.label
      ] =
        list;

    } catch (err) {

      console.error(
        "Erreur lors de la lecture du calendrier " +
        calendar.label +
        " :",
        err.message
      );

    }

  }


  // ==========================================================
  // TRI
  // ==========================================================

  allEvents.sort(
    (a, b) =>
      a.start - b.start
  );


  // ==========================================================
  // FENÊTRE DE 6 MOIS
  // ==========================================================

  const now =
    new Date();

  const sixMonthsFromNow =
    new Date(now);

  sixMonthsFromNow.setMonth(
    sixMonthsFromNow.getMonth() + 6
  );


  const generalEvents =
    allEvents.filter(
      event =>
        event.start <=
        sixMonthsFromNow
    );


  // ==========================================================
  // CHARGEMENT DES STATUS OVERRIDES
  // ==========================================================

  let overrides = {};

  try {

    if (
      fs.existsSync(
        "status-overrides.json"
      )
    ) {

      overrides =
        JSON.parse(
          fs.readFileSync(
            "status-overrides.json",
            "utf8"
          )
        );

    }

  } catch (err) {

    console.warn(
      "Impossible de lire status-overrides.json :",
      err.message
    );

    overrides = {};

  }


  // ==========================================================
  // APPLICATION DES STATUS
  // ==========================================================

  for (
    const event of generalEvents
  ) {

    const override =
      overrides[
        event.uid
      ];

    if (
      override &&
      override.statut !== undefined
    ) {

      event.campaign =
        event.campaign || {

          titre: "",
          image: "",
          logo: "",
          logo_fond: "",
          fond: "",
          tarif: "",
          inscription: "",
          lien_inscription: "",
          statut: "",
          lieu: "",
          affichage_lieu: "3"

        };


      event.campaign.statut =
        override.statut;

    }

  }


  // ==========================================================
  // AGENDA.JSON
  // ==========================================================

  const generalJson = {

    updated:
      new Date().toLocaleString(
        "fr-FR",
        {
          timeZone:
            "Europe/Paris"
        }
      ),

    events:
      generalEvents

  };


  fs.writeFileSync(

    "agenda.json",

    JSON.stringify(
      generalJson,
      null,
      2
    ),

    "utf8"

  );


  console.log(
    generalEvents.length +
    " événement(s) enregistré(s) dans agenda.json."
  );


  // ==========================================================
  // AGENDA ADHÉRENTS
  // ==========================================================

  const adherentEvents =
    (
      eventsByLabel[
        "Soirée adhérents"
      ] || []
    )
      .sort(
        (a, b) =>
          a.start - b.start
      )
      .slice(
        0,
        15
      );


  const adherentJson = {

    updated:
      new Date().toLocaleString(
        "fr-FR",
        {
          timeZone:
            "Europe/Paris"
        }
      ),

    events:
      adherentEvents

  };


  fs.writeFileSync(

    "agenda-adherents.json",

    JSON.stringify(
      adherentJson,
      null,
      2
    ),

    "utf8"

  );


  console.log(
    adherentEvents.length +
    " événement(s) enregistré(s) dans agenda-adherents.json."
  );


  // ==========================================================
  // VACANCES
  // ==========================================================

  try {

    const periods =
      await loadVacationCalendar();


    const vacancesJson = {

      updated:
        new Date().toLocaleString(
          "fr-FR",
          {
            timeZone:
              "Europe/Paris"
          }
        ),

      periods

    };


    fs.writeFileSync(

      "vacances.json",

      JSON.stringify(
        vacancesJson,
        null,
        2
      ),

      "utf8"

    );


    console.log(
      periods.length +
      " période(s) enregistrée(s) dans vacances.json."
    );


  } catch (err) {

    console.error(
      "Erreur lors de la lecture du calendrier vacances :",
      err.message
    );

  }


  // ==========================================================
  // LUDOTHÈQUE
  // ==========================================================

  try {

    console.log(
      "Lecture :",
      JEUX_URL
    );


    const jeuxResponse =
      await axios.get(
        JEUX_URL,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0"
          }
        }
      );


    const allGames =
      jeuxResponse.data || [];


    const updatedNow =
      new Date().toLocaleString(
        "fr-FR",
        {
          timeZone:
            "Europe/Paris"
        }
      );


    // --------------------------------------------------------
    // DERNIERS JEUX
    // --------------------------------------------------------

    const jeux =
      await loadNewestGames(
        allGames
      );


    fs.writeFileSync(

      "jeux.json",

      JSON.stringify(
        {
          updated:
            updatedNow,

          jeux
        },
        null,
        2
      ),

      "utf8"

    );


    console.log(
      jeux.length +
      " jeu(x) enregistré(s) dans jeux.json."
    );


    // --------------------------------------------------------
    // SUIVI COMPLET
    // --------------------------------------------------------

    const statusList =
      await checkAllGames(
        allGames
      );


    const visuelsManquants =
      statusList.filter(
        j =>
          j.visuelManquant
      );


    const pngRestants =
      statusList.filter(
        j =>
          j.isPng &&
          !j.visuelManquant
      );


    const sansEmplacement =
      buildEmplacementReport(
        allGames
      );


    const infosManquantes =
      buildMissingInfoReport(
        allGames
      );


    fs.writeFileSync(

      "jeux-suivi.json",

      JSON.stringify(
        {

          updated:
            updatedNow,

          total:
            allGames.length,

          visuelsManquants,

          pngRestants,

          sansEmplacement,

          infosManquantes

        },
        null,
        2
      ),

      "utf8"

    );


    const totalSansEmplacement =
      sansEmplacement.reduce(
        (
          sum,
          groupe
        ) =>
          sum +
          groupe.jeux.length,
        0
      );


    console.log(

      visuelsManquants.length +
      " visuel(s) manquant(s), " +

      pngRestants.length +
      " jeu(x) encore en .png, " +

      totalSansEmplacement +
      " jeu(x) sans emplacement, " +

      infosManquantes.length +
      " jeu(x) avec des infos manquantes enregistrés dans jeux-suivi.json."

    );


  } catch (err) {

    console.error(
      "Erreur lors de la lecture de la ludothèque :",
      err.message
    );

  }

}


// ============================================================
// LANCEMENT
// ============================================================

main().catch(
  err => {

    console.error(
      "❌ ERREUR lors de la génération :"
    );

    console.error(
      err.message
    );

    process.exit(1);

  }
);

