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
    document.getElementById('associationLogo').src=config.logo;
    document.getElementById('associationLogo').alt=config.name;
    document.getElementById('associationName').textContent=config.name;
    document.getElementById('calendarNames').textContent=config.calendars.join(' · ');
    document.documentElement.style.setProperty('--accent',config.accent);
    document.getElementById('formatTitle').textContent={affiche:`Affiche événements — ${config.name}`,carre:`Agenda carré — ${config.name}`,facebook:`Agenda Facebook — ${config.name}`}[format]||`Événements — ${config.name}`;
    function formatShortDate(d){return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',timeZone:'Europe/Paris'})}
    function formatHour(d){const h=d.getHours(),m=d.getMinutes();return m===0?`${h}h`:`${h}h${String(m).padStart(2,'0')}`}
    function clean(v){return String(v||'').trim().replace(/\s+/g,' ')}
    function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
    function place(e){const c=e.campaign||{},a=clean(e.location),b=clean(c.lieu),m=parseInt(c.affichage_lieu??3,10);if(m===0)return '';if(m===1)return a;if(m===2)return b;if(m===4)return b||a;if(a&&b&&norm(a)===norm(b))return a;return a||b}
    function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
    async function load(){const list=document.getElementById('events');try{const r=await fetch('agenda.json?t='+Date.now());if(!r.ok)throw new Error('agenda.json');const data=await r.json(),wanted=new Set(config.calendars),now=Date.now();const events=(Array.isArray(data.events)?data.events:[]).filter(e=>wanted.has(e.calendar)).filter(e=>e.start&&new Date(e.end||e.start).getTime()>=now).sort((a,b)=>new Date(a.start)-new Date(b.start)).slice(0,limit);document.getElementById('count').textContent=`${events.length} événement${events.length>1?'s':''}`;if(!events.length){list.innerHTML='<div class="empty">Aucun événement à venir.</div>';return}list.innerHTML=events.map(e=>{const s=new Date(e.start),en=e.end?new Date(e.end):null,c=e.campaign||{},title=String(c.titre||e.title||'Événement').trim(),sub=String(c.sous_titre||'').trim(),p=place(e),img=String(c.image||'').trim(),tarif=String(c.tarif||'').trim(),ins=String(c.inscription||'').trim(),stat=String(c.statut||'').trim(),time=en?`${formatHour(s)} – ${formatHour(en)}`:formatHour(s);return `<article class="eventCard"><div class="eventImage">${img?`<img src="${esc(img)}" alt="">`:'<span>🎲</span>'}</div><div class="eventDate">${esc(formatShortDate(s))}</div><div class="eventContent"><h2>${esc(title)}</h2>${sub?`<div class="subtitle">${esc(sub)}</div>`:''}<div class="meta"><span>🕐 ${esc(time)}</span>${p?`<span>📍 ${esc(p)}</span>`:''}</div>${tarif?`<div class="detail">💶 ${esc(tarif)}</div>`:''}${ins?`<div class="detail">💬 ${esc(ins)}</div>`:''}${stat?`<div class="status">${esc(stat)}</div>`:''}</div></article>`}).join('');await Promise.all(Array.from(list.querySelectorAll('img')).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=img.onerror=resolve;})))}catch(err){console.error(err);list.innerHTML='<div class="empty">Impossible de charger les événements.</div>'}}
    document.getElementById('download').addEventListener('click',async()=>{if(typeof html2canvas==='undefined')return;const target=document.getElementById('poster'),toolbar=document.getElementById('toolbar');toolbar.style.display='none';try{if(document.fonts?.ready)await document.fonts.ready;const canvas=await html2canvas(target,{width:target.offsetWidth,height:target.offsetHeight,windowWidth:target.offsetWidth,windowHeight:target.offsetHeight,scale:1,useCORS:true,backgroundColor:'#0a1330'});const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=`agenda-${association}-${format}.png`;a.click()}finally{toolbar.style.display='flex'}});
    load();
})();