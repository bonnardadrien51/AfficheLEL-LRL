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

function cleanText(value) {

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}


function normalizeUrl(value) {

  if (!value) {
    return "";
  }

  let url = String(value).trim();

  const markdownMatch =
    url.match(/^\[.*?\]\((https?:\/\/[^)\s]+)\)$/);

  if (markdownMatch) {
    return markdownMatch[1];
  }

  const urlMatch =
    url.match(/(https?:\/\/[^\s)\]]+)/);

  if (urlMatch) {
    return urlMatch[1];
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

  let cleaned = String(rawDescription);

  cleaned = cleaned.replace(
    /<br\s*\/?>/gi,
    "\n"
  );

  cleaned = cleaned.replace(
    /<[^>]+>/g,
    ""
  );

  cleaned = cleaned.replace(
    /\u00A0/g,
    " "
  );

  cleaned = cleaned.replace(
    /[\u200B-\u200D\uFEFF]/g,
    ""
  );

  return cleaned.trim();
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

  let data = null;

  // 1. Cas normal : la description contient uniquement le JSON.
  try {

    data = JSON.parse(cleaned);

  } catch (error) {

    // 2. Secours : Google Calendar peut parfois ajouter du texte
    // ou une mise en forme autour du JSON.
    const firstBrace =
      cleaned.indexOf("{");

    const lastBrace =
      cleaned.lastIndexOf("}");

    if (
      firstBrace !== -1 &&
      lastBrace > firstBrace
    ) {

      try {

        data = JSON.parse(
          cleaned.slice(
            firstBrace,
            lastBrace + 1
          )
        );

      } catch (extractError) {

        console.warn(
          "\n⚠️ JSON campagne invalide"
        );

        console.warn(
          "Description reçue :"
        );

        console.warn(
          cleaned
        );

        console.warn(
          "Erreur :",
          extractError.message
        );

        return null;
      }

    } else {

      console.warn(
        "\n⚠️ Aucun JSON trouvé dans la description"
      );

      console.warn(
        cleaned
      );

      return null;
    }
  }

  if (
    !data ||
    typeof data !== "object"
  ) {
    return null;
  }

  return {

    titre:
      cleanText(data.titre),

    sous_titre:
      cleanText(
        data.sous_titre ||
        data["sous-titre"]
      ),

    image:
      normalizeUrl(data.image),

    logo:
      normalizeUrl(data.logo),

    logo_fond:
      cleanText(data.logo_fond),

    fond:
      normalizeUrl(data.fond),

    tarif:
      cleanText(data.tarif),

    inscription:
      cleanText(data.inscription),

    lien_inscription:
      normalizeUrl(
        data.lien_inscription
      ),

    statut:
      cleanText(data.statut),

    lieu:
      cleanText(data.lieu),

    affichage_lieu:
      data.affichage_lieu !== undefined &&
      data.affichage_lieu !== null
        ? String(data.affichage_lieu)
        : "3"

  };
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

      uid:
        e.uid ||
        `${calendar.label}-${e.start.toISOString()}-${e.summary || ""}`,

      title:
        e.summary || "",

      start:
        e.start,

      end,

      location:
        e.location || "",

      description:
        e.description || "",

      campaign:
        parseCampaign(
          e.description
        ),

      calendar:
        calendar.label,

      icon:
        calendar.icon,

      color:
        calendar.color

    });
  }

  return events;
}


// ============================================================
// SUITE DU SCRIPT
// ============================================================

async function main() {

  try {

    console.log(
      "\n=============================="
    );

    console.log(
      "GÉNÉRATION DE L'AGENDA"
    );

    console.log(
      "==============================\n"
    );

    let allEvents = [];

    for (const calendar of calendars) {

      try {

        const events =
          await loadCalendar(
            calendar
          );

        allEvents.push(
          ...events
        );

        console.log(
          `✓ ${calendar.label} : ${events.length} événements`
        );

      } catch (error) {

        console.error(
          `✗ ${calendar.label} :`,
          error.message
        );

      }
    }

    allEvents.sort(
      (a, b) =>
        a.start - b.start
    );

    const vacationPeriods =
      await loadVacationCalendar();

    let allGames = [];

    try {

      const response =
        await axios.get(
          JEUX_URL,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          }
        );

      allGames =
        Array.isArray(response.data)
          ? response.data
          : [];

    } catch (error) {

      console.error(
        "Impossible de charger les jeux :",
        error.message
      );

    }

    const newestGames =
      await loadNewestGames(
        allGames
      );

    const imageReport =
      await checkAllGames(
        allGames
      );

    const emplacementReport =
      buildEmplacementReport(
        allGames
      );

    const missingInfoReport =
      buildMissingInfoReport(
        allGames
      );

    const agenda = {

      generated_at:
        new Date().toISOString(),

      events:
        allEvents,

      vacances:
        vacationPeriods,

      jeux:
        newestGames,

      jeux_images:
        imageReport,

      jeux_non_ranges:
        emplacementReport,

      jeux_infos_manquantes:
        missingInfoReport

    };

    fs.writeFileSync(
      "agenda.json",
      JSON.stringify(
        agenda,
        null,
        2
      ),
      "utf8"
    );

    console.log(
      `\n✓ agenda.json généré : ${allEvents.length} événements`
    );

  } catch (error) {

    console.error(
      "Erreur générale :",
      error
    );

    process.exit(1);
  }
}


main();
