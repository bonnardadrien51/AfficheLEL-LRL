const ical = require("node-ical");
const fs = require("fs");

const calendars = [

    {
        url:"https://calendar.google.com/calendar/ical/e179f20eeae333cceeb677b269f4846c97586634dcb3f2cc1b44d5c8bd9cfba4%40group.calendar.google.com/public/basic.ics",
        calendar:"etabli"
    },

    {
        url:"https://calendar.google.com/calendar/ical/8761c42019d8999b290f2830e85dde57dc1ce8d1779229fe9adf9802f8ef9c6e%40group.calendar.google.com/public/basic.ics",
        calendar:"etabli"
    },

    {
        url:"https://calendar.google.com/calendar/ical/3ddecb61f28da2da38b0b2ae74c7323778847780c13cff360ebc36a07c24ba24%40group.calendar.google.com/public/basic.ics",
        calendar:"raffut"
    },

    {
        url:"https://calendar.google.com/calendar/ical/leraffutludique%40gmail.com/public/basic.ics",
        calendar:"raffut"
    }

];

async function buildAgenda(){

    let events=[];

    const now=new Date();

    for(const calendar of calendars){

        const data=await ical.async.fromURL(calendar.url);

        Object.values(data).forEach(event=>{

            if(event.type!=="VEVENT") return;

            if(event.start<now) return;

            events.push({

                calendar:calendar.calendar,

                title:event.summary || "",

                location:event.location || "",

                start:event.start,

                end:event.end

            });

        });

    }

    events.sort((a,b)=>a.start-b.start);

    events=events.slice(0,10);

    const json={

        updated:new Date().toLocaleString("fr-FR"),

        events:events

    };

    fs.writeFileSync(

        "agenda.json",

        JSON.stringify(json,null,2),

        "utf8"

    );

    console.log("agenda.json généré.");

}

buildAgenda();
