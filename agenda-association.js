(function(){
    const body = document.body;
    const association = body.dataset.association || 'lel';
    const format = body.dataset.format || 'affiche';
    const CONFIG = {
        lel:{name:"L'Établi Ludique",logo:"img/logo-etabli.svg",calendars:["Partenaire","Animation","Marché / Expo"],accent:"#7e9eea"},
        lrl:{name:"Le Raffut Ludique",logo:"img/logo-raffut.svg",calendars:["Soirée au chapeau","Soirée adhérents"],accent:"#ea3397"}
    };
    const LIMITS={affiche:6,carre:4,facebook:6};
    const config=CONFIG[association]||CONFIG.lel;
    const limit=LIMITS[format]||6;

    document.title=`${config.name} — événements`;
    const logo=document.getElementById('associationLogo');
    const calendarNames=document.getElementById('calendarNames');
    const formatTitle=document.getElementById('formatTitle');
    const count=document.getElementById('count');
    const eventsContainer=document.getElementById('events');

    if(logo){
        logo.src=config.logo;
        logo.alt=config.name;
    }
    if(calendarNames) calendarNames.textContent=config.calendars.join(' · ');
    document.documentElement.style.setProperty('--accent',config.accent);
    if(formatTitle){
        formatTitle.textContent={
            affiche:`Affiche événements — ${config.name}`,
            carre:`Agenda carré — ${config.name}`,
            facebook:`Agenda Facebook — ${config.name}`
        }[format]||`Événements — ${config.name}`;
    }

    function formatShortDate(d){
        return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',timeZone:'Europe/Paris'});
    }
    function formatHour(d){
        const h=d.getHours(),m=d.getMinutes();
        return m===0?`${h}h`:`${h}h${String(m).padStart(2,'0')}`;
    }
    function clean(v){return String(v||'').trim().replace(/\s+/g,' ')}
    function norm(v){
        return clean(v).toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g,'')
            .replace(/[^a-z0-9]+/g,' ').trim();
    }
    function place(e){
        const c=e.campaign||{}, calendarLocation=clean(e.location), customLocation=clean(c.lieu);
        const mode=parseInt(c.affichage_lieu??3,10);
        if(mode===0)return '';
        if(mode===1)return customLocation;
        if(mode===2)return calendarLocation;
        if(mode===4)return customLocation||calendarLocation;
        if(calendarLocation&&customLocation){
            const a=norm(calendarLocation),b=norm(customLocation);
            if(a===b||a.includes(b)||b.includes(a)) return calendarLocation.length>=customLocation.length?calendarLocation:customLocation;
            return `${customLocation} – ${calendarLocation}`;
        }
        return customLocation||calendarLocation;
    }
    function esc(v){
        return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    async function load(){
        if(!eventsContainer)return;
        try{
            const r=await fetch('agenda.json?t='+Date.now());
            if(!r.ok)throw new Error('agenda.json');
            const data=await r.json();
            const wanted=new Set(config.calendars);
            const now=Date.now();
            const events=(Array.isArray(data.events)?data.events:[])
                .filter(e=>wanted.has(e.calendar))
                .filter(e=>e.start&&new Date(e.end||e.start).getTime()>=now)
                .sort((a,b)=>new Date(a.start)-new Date(b.start))
                .slice(0,limit);

            if(count)count.textContent=`${events.length} événement${events.length>1?'s':''}`;
            if(!events.length){
                eventsContainer.innerHTML='<div class="empty">Aucun événement à venir.</div>';
                return;
            }

            eventsContainer.innerHTML=events.map(e=>{
                const s=new Date(e.start);
                const en=e.end?new Date(e.end):null;
                const c=e.campaign||{};
                const title=String(c.titre||e.title||'Événement').trim();
                const sub=String(c.sous_titre||'').trim();
                const p=place(e);
                const img=String(c.image||'').trim();
                const logoCampaign=String(c.logo||'').trim();
                const tarif=String(c.tarif||'').trim();
                const ins=String(c.inscription||'').trim();
                const stat=String(c.statut||'').trim();
                const time=en?`${formatHour(s)} – ${formatHour(en)}`:formatHour(s);
                return `<article class="eventCard">
                    <div class="eventImage">${img?`<img src="${esc(img)}" alt="" loading="eager">`:'<span>🎲</span>'}</div>
                    <div class="eventDate">${esc(formatShortDate(s))}</div>
                    <div class="eventContent">
                        ${logoCampaign?`<div class="eventLogo"><img src="${esc(logoCampaign)}" alt="" loading="eager"></div>`:''}
                        <h2>${esc(title)}</h2>
                        ${sub?`<div class="subtitle">${esc(sub)}</div>`:''}
                        <div class="meta"><span>🕐 ${esc(time)}</span>${p?`<span>📍 ${esc(p)}</span>`:''}</div>
                        ${tarif?`<div class="detail">💶 ${esc(tarif)}</div>`:''}
                        ${ins?`<div class="detail">💬 ${esc(ins)}</div>`:''}
                        ${stat?`<div class="status">${esc(stat)}</div>`:''}
                    </div>
                </article>`;
            }).join('');

            await Promise.all(Array.from(eventsContainer.querySelectorAll('img')).map(img=>
                img.complete?Promise.resolve():new Promise(resolve=>{img.onload=img.onerror=resolve;})
            ));
        }catch(err){
            console.error('Agenda association:',err);
            eventsContainer.innerHTML='<div class="empty">Impossible de charger les événements.</div>';
        }
    }

    const download=document.getElementById('download');
    if(download){
        download.addEventListener('click',async()=>{
            if(typeof html2canvas==='undefined')return;
            const target=document.getElementById('poster');
            const toolbar=document.getElementById('toolbar');
            if(!target)return;
            if(toolbar)toolbar.style.display='none';
            try{
                if(document.fonts?.ready)await document.fonts.ready;
                const canvas=await html2canvas(target,{
                    width:target.offsetWidth,
                    height:target.offsetHeight,
                    windowWidth:target.offsetWidth,
                    windowHeight:target.offsetHeight,
                    scale:1,
                    useCORS:true,
                    allowTaint:false,
                    backgroundColor:'#0a1330'
                });
                const a=document.createElement('a');
                a.href=canvas.toDataURL('image/png');
                a.download=`agenda-${association}-${format}.png`;
                a.click();
            }finally{
                if(toolbar)toolbar.style.display='flex';
            }
        });
    }
    load();
})();