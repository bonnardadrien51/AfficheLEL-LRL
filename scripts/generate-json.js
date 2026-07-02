const axios = require("axios");
const ical = require("node-ical");
const fs = require("fs");

const calendars = [

  {
    url: "https://calendar.google.com/calendar/ical/e179f20eeae333cceeb677b269f4846c97586634dcb3f2cc1b44d5c8bd9cfba4%40group.calendar.google.com/public/basic.ics",
    label: "Animation",
    icon: "LELanimation.png",
    color: "#E97126"
  },

  {
    url: "https://calendar.google.com/calendar/ical/8761c42019d8999b290f2830e85dde57dc1ce8d1779229fe9adf9802f8ef9c6e%40group.calendar.google.com/public/basic.ics",
    label: "Partenaire",
    icon: "LELpartenaire.png",
    color: "#7E9EEA"
  },

  {
    url: "https://calendar.google.com/calendar/ical/3ddecb61f28da2da38b0b2ae74c7323778847780c13cff360ebc36a07c24ba24%40group.calendar.google.com/public/basic.ics",
    label: "Marché / Expo",
    icon: "LELmarche.png",
    color: "#E8BED4"
  },

  {
    url: "https://calendar.google.com/calendar/ical/leraffutludique%40gmail.com/public/basic.ics",
    label: "Soirée au chapeau",
    icon: "LRLsoiree.png",
    color: "#EA3397"
  },

  {
    url: "https://calendar.google.com/calendar/ical/795e1f6eb9318e01096825e3a3014ebd135f7c695b947cd87e94192505b9ace7%40group.calendar.google.com/public/basic.ics",
    label: "Soirée adhérents",
    icon: "LRLadherent.png",
    color: "#FACB55"
  }

];

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
      calendar: calendar.type,
      title: e.summary || "",
      location: e.location || "",
      start: e.start,
      end: e.end || e.start
    });

  }

  return events;

}

async function main() {

  let events = [];

  for (const calendar of calendars) {

    try {

      const list = await loadCalendar(calendar);

      events.push(...list);

    } catch (err) {

      console.error(err.message);

    }

  }

  events.sort((a, b) => a.start - b.start);

  events = events.slice(0, 10);

  const json = {

    updated: new Date().toLocaleString("fr-FR"),

    events

  };

  fs.writeFileSync(
    "agenda.json",
    JSON.stringify(json, null, 2),
    "utf8"
  );

  console.log(events.length + " événements enregistrés.");

}

main();
