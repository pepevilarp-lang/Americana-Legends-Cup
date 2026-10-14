"use strict";
/* =====================================================================
   EXTRAS · Americana Legends Cup
   1 compartir cartel · 2 app instalable + bienvenida de dos botones
   5 calendario · 6 avisos de plazo + WhatsApp · 7 registro de cambios
   8 evolución de la clasificación · 9 bestia negra, rival favorito y récords
   ===================================================================== */
(function(){

/* ---------- utilidades ---------- */
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const ago=t=>{ const s=Math.max(1,Math.round((Date.now()-t)/1000)); if(s<60) return "ahora"; const m=Math.round(s/60); if(m<60) return `hace ${m} min`; const h=Math.round(m/60); if(h<24) return `hace ${h} h`; return `hace ${Math.round(h/24)} d`; };
const stampOf=t=>{ const d=new Date(t); return `${fmtDay(ymd(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const jLabel=m=>m.playoff?PO_LABEL[m.id]:`J${m.j}`;
const who=()=>S.me&&P[S.me]?P[S.me].first:"Alguien";
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const waLink=t=>`https://wa.me/?text=${encodeURIComponent(t)}`;
const flag=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){} };

/* =====================================================================
   DATOS: registro de cambios y móviles con avisos (Firestore)
   ===================================================================== */
Store.log={}; Store.pushSubs={};
try{ if(!Store.db) Store.log=JSON.parse(localStorage.getItem("am_log")||"{}"); }catch(e){}

const _listen=Store.listen;
Store.listen=function(){
  const was=this.listening; _listen.call(this); if(was||!this.db) return;
  const on=(col,target)=>this.db.collection(col).onSnapshot(snap=>{
    snap.docChanges().forEach(c=>{ if(c.type==="removed") delete this[target][c.doc.id]; else this[target][c.doc.id]=c.doc.data(); });
    this.bump();
  },()=>{ /* reglas sin actualizar: estas dos colecciones son opcionales, no se bloquea la app */ });
  this.unsubs.push(on("log","log"),on("push","pushSubs"));
};
const _lock=Store.lock;
Store.lock=function(m){ _lock.call(this,m); this.log={}; this.pushSubs={}; };

Store.addLog=async function(e){
  const id="l"+e.t+Math.random().toString(36).slice(2,6);
  this.log[id]=e; this.bump();
  if(!this.db){ try{ localStorage.setItem("am_log",JSON.stringify(this.log)); }catch(_){} return; }
  try{ await this.db.collection("log").doc(id).set(e); }catch(err){ /* sin permiso (reglas antiguas): queda solo en este móvil */ }
};

function diffEvent(prev,next){
  const wasDone=!!(prev&&result(prev)), isDone=!!result(next);
  if(!wasDone&&isDone) return next.status==="wo"?{k:"wo"}:(prev&&prev.status==="live"?{k:"final"}:{k:"result"});
  if(wasDone&&isDone&&scoreText(prev)!==scoreText(next)) return {k:"correct",old:scoreText(prev)};
  if(wasDone&&!isDone) return {k:"reset",old:scoreText(prev)};
  if(next.status==="live"&&(!prev||prev.status!=="live")) return {k:"live"};
  if(!isDone&&next.status!=="live"&&((prev&&prev.date||"")!==(next.date||"")||(prev&&prev.time||"")!==(next.time||"")||(prev&&prev.court||"")!==(next.court||""))) return {k:"date"};
  return null;
}
function logText(ev,m,next){
  const A=nm(m.a),B=nm(m.b),j=jLabel(m);
  switch(ev.k){
    case "result": return `metió el resultado: ${A} ${scoreText(next)} ${B} (${j})`;
    case "final": return `terminó el partido: ${A} ${scoreText(next)} ${B} (${j})`;
    case "wo": { const r=result(next); return `registró un WO: gana ${nm(r.w==="a"?m.a:m.b)} (${A}–${B}, ${j})`; }
    case "correct": return `corrigió ${A}–${B} (${j}): ${ev.old} → ${scoreText(next)}`;
    case "reset": return `borró el resultado de ${A}–${B} (${j}); era ${ev.old}`;
    case "live": return `empezó el marcador en directo de ${A}–${B} (${j})`;
    case "date": return next.date?`fijó ${A}–${B} (${j}) para ${fmtDay(next.date)}${next.time?" a las "+next.time:""}${next.court?" · "+next.court:""}`:`quitó la fecha de ${A}–${B} (${j})`;
  }
  return "";
}
function pushFor(ev,m,next){
  const A=nm(m.a),B=nm(m.b),j=jLabel(m);
  if(ev.k==="live") return {payload:{title:"🔴 EN DIRECTO",body:`${A} vs ${B} · ${j}`,tag:"live-"+m.id,url:"./#hoy"}};
  if(ev.k==="result"||ev.k==="final"){ const r=result(next), W=r.w==="a"?m.a:m.b, L=r.w==="a"?m.b:m.a;
    return {payload:{title:`🏁 Final · ${j}`,body:r.wo?`WO: gana ${nm(W)} a ${nm(L)}`:`${nm(W)} gana a ${nm(L)} ${scoreText(next)}`,tag:"res-"+m.id,url:"./#clasificacion"}}; }
  if(ev.k==="date"&&next.date) return {payload:{title:"📅 Partido fijado",body:`${A} vs ${B} · ${fmtDay(next.date)}${next.time?" "+next.time:""}${next.court?" · "+next.court:""}`,tag:"date-"+m.id,url:"./#calendario"},only:[m.a,m.b]};
  return null;
}
const _setMatch=Store.setMatch;
Store.setMatch=function(id,data){
  const prev=this.matches[id]?JSON.parse(JSON.stringify(this.matches[id])):undefined;
  return _setMatch.call(this,id,data).then(ok=>{ if(ok){ try{ afterSave(id,prev,data); }catch(e){ console.error(e); } } return ok; });
};
function afterSave(id,prev,next){
  const ev=diffEvent(prev,next); if(!ev) return;
  const m=getMatch(id);
  Store.addLog({t:Date.now(),who:S.me||"",k:ev.k,m:id,txt:logText(ev,m,next)});
  const p=pushFor(ev,m,next); if(p) Push.notify(p.payload,{only:p.only});
}

/* =====================================================================
   7 · REGISTRO DE CAMBIOS
   ===================================================================== */
function logEntries(filterFn){ return Object.values(Store.log).filter(e=>e&&e.txt&&(!filterFn||filterFn(e))).sort((a,b)=>b.t-a.t); }
function logRow(e){
  const wh=PLAYERS.find(p=>p.first===e.who||p.id===e.who);
  return `<div class="xt-log"><span class="xt-who">${wh?av(wh.id,"sm"):`<span class="av sm" style="--c:#7F93BA"></span>`}</span>
    <div><div class="xt-lt"><b>${esc(wh?wh.first:(e.who||"Alguien"))}</b> ${esc(e.txt)}</div><div class="mini">${ago(e.t)} · ${stampOf(e.t)}</div></div></div>`;
}
function vLog(){
  const L=logEntries().slice(0,150);
  return `<h2>Registro de cambios</h2><p class="sub">Quién ha metido, corregido o borrado cada resultado, y cuándo. Sirve para aclarar cualquier duda.</p>
  ${L.length?`<div class="panel">${L.map(logRow).join("")}</div>`:`<div class="empty">Todavía no hay cambios registrados. Aparecerán aquí en cuanto alguien meta un resultado o fije un partido.</div>`}`;
}
function matchHistory(id){
  const L=logEntries(e=>e.m===id).slice(0,12);
  return L.length?`<details class="xt-hist"><summary>Historial de este partido (${L.length})</summary>${L.map(logRow).join("")}</details>`:"";
}

/* =====================================================================
   6 · AVISOS DE PLAZO + WHATSAPP
   ===================================================================== */
function daysLeftAt(j,now){ const[y,m,d]=JORNADAS[j-1][1].split("-").map(Number); return Math.max(0,Math.ceil((new Date(y,m-1,d,23,59)-now)/864e5)); }
function alertsData(now=new Date(),me=S.me){
  const t=ymd(now), tm=ymd(addDays(now,1)), J=currentJ(), ph=phase(), out=[];
  const pending=f=>{ const m=getMatch(f.id); return (!result(m)&&m.status!=="live"&&m.a&&m.b)?m:null; };
  FIXTURE.forEach(f=>{
    const m=pending(f); if(!m) return;
    const mine=!!(me&&(m.a===me||m.b===me)), ended=JORNADAS[f.j-1][1]<t;
    if(ended){ out.push({k:"late",m,mine}); return; }
    if(ph.type==="j"&&f.j===J){
      if(m.date===t) out.push({k:"today",m,mine});
      else if(m.date===tm) out.push({k:"tomorrow",m,mine});
      else if(!m.date){ const left=daysLeftAt(J,now); if(left<=3) out.push({k:"nodate",m,mine,left}); }
    }
  });
  const rank={today:0,tomorrow:1,late:2,nodate:3};
  return out.sort((x,y)=>(y.mine-x.mine)||(rank[x.k]-rank[y.k]));
}
function alertMsg(a){
  const m=a.m,A=P[m.a],B=P[m.b],me=S.me&&P[S.me], rival=me&&(m.a===me.id||m.b===me.id)?(m.a===me.id?B:A):null;
  const head=rival?`Hola ${rival.first}`:`${A.first} y ${B.first}`;
  const j=jLabel(m);
  if(a.k==="nodate") return `${head}: nos quedan ${a.left} día${a.left===1?"":"s"} para jugar ${rival?"nuestro":"vuestro"} partido de la ${j} de la Americana Legends Cup. ¿Qué día os/nos viene bien? 🎾`;
  if(a.k==="late") return `${head}: ${rival?"nuestro":"vuestro"} partido de la ${j} de la Americana está aplazado y hay que recuperarlo. ¿Cuándo jugamos? 🎾`;
  const when=a.k==="today"?"hoy":"mañana";
  return `${head}: recordatorio, ${when} ${rival?"jugamos":"jugáis"} el partido de la ${j}${m.time?" a las "+m.time:""}${m.court?" en "+m.court:""}. ¡A por ello! 🎾`;
}
function alertText(a){
  if(a.k==="nodate") return `SIN FECHA · quedan ${a.left} día${a.left===1?"":"s"}`;
  if(a.k==="late") return `APLAZADO · hay que recuperarlo`;
  const m=a.m; return `${a.k==="today"?"HOY":"MAÑANA"}${m.time?" · "+m.time:""}${m.court?" · "+m.court:""}`;
}
window.xAlerts=function(){
  const L=alertsData(); if(!L.length) return recentLog();
  const mine=L.filter(a=>a.mine).length;
  return `<section class="xt-alerts" aria-label="Avisos"><h2>Avisos${mine?` <span class="xt-badge">${mine} tuyo${mine===1?"":"s"}</span>`:""}</h2>
  ${L.slice(0,6).map(a=>`<div class="xt-al k-${a.k} ${a.mine?"mine":""}">
    <div class="xt-al-top"><span class="xt-av">${av(a.m.a,"sm")}${av(a.m.b,"sm")}</span><div><b>${nm(a.m.a)} – ${nm(a.m.b)}</b><div class="xt-kind">${alertText(a)} · ${jLabel(a.m)}${a.mine?" · TU PARTIDO":""}</div></div></div>
    <div class="xt-al-btns"><button class="btn ghost" data-open-match="${a.m.id}">${a.k==="nodate"||a.k==="late"?"Fijar fecha":"Ver partido"}</button><button class="btn wa" data-x="wa" data-id="${a.m.id}" data-k="${a.k}">💬 WhatsApp</button></div></div>`).join("")}
  ${L.length>6?`<p class="mini">y ${L.length-6} más en el calendario.</p>`:""}</section>`+recentLog();
};
function recentLog(){
  const L=logEntries().slice(0,3); if(!L.length) return "";
  return `<section class="xt-recent"><h3>Última hora</h3><div class="panel">${L.map(logRow).join("")}</div><div class="btnrow"><button class="btn ghost" data-tab="registro">Ver todo el registro</button></div></section>`;
}

/* =====================================================================
   5 · CALENDARIO (.ics con avisos + Google Calendar)
   ===================================================================== */
const icsEsc=s=>String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
function icsFold(l){ let o=""; while(l.length>74){ o+=l.slice(0,74)+"\r\n "; l=l.slice(74); } return o+l; }
function eventTimes(m){
  const [y,mo,d]=m.date.split("-").map(Number);
  if(!m.time) { const e=new Date(y,mo-1,d+1); return {allDay:true,start:`${y}${pad(mo)}${pad(d)}`,end:`${e.getFullYear()}${pad(e.getMonth()+1)}${pad(e.getDate())}`}; }
  const [hh,mm]=m.time.split(":").map(Number), s=new Date(y,mo-1,d,hh,mm), e=new Date(s.getTime()+90*60000);
  const f=x=>`${x.getFullYear()}${pad(x.getMonth()+1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  return {allDay:false,start:f(s),end:f(e)};
}
function buildICS(m){
  const A=P[m.a].name,B=P[m.b].name,t=eventTimes(m), j=jLabel(m);
  const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Americana Legends Cup//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",
    `UID:${m.id}@americana-legends-cup`,`DTSTAMP:${stamp}`,
    t.allDay?`DTSTART;VALUE=DATE:${t.start}`:`DTSTART:${t.start}`, t.allDay?`DTEND;VALUE=DATE:${t.end}`:`DTEND:${t.end}`,
    `SUMMARY:${icsEsc(`🎾 ${A} vs ${B} · Legends Cup ${j}`)}`];
  if(m.court) L.push(`LOCATION:${icsEsc(m.court)}`);
  L.push(`DESCRIPTION:${icsEsc(`Americana Legends Cup Vol. 1 · ${j}\nMejor de 3 sets, super tie-break a 10 si hay 1-1.`)}`);
  [["-P1D","Mañana: "],["-PT2H","En 2 horas: "]].forEach(([tr,pre])=>{ if(t.allDay&&tr==="-PT2H") return;
    L.push("BEGIN:VALARM",`TRIGGER:${t.allDay&&tr==="-P1D"?"-PT15H":tr}`,"ACTION:DISPLAY",`DESCRIPTION:${icsEsc(pre+A+" vs "+B)}`,"END:VALARM"); });
  L.push("END:VEVENT","END:VCALENDAR");
  return L.map(icsFold).join("\r\n")+"\r\n";
}
function googleCal(m){
  const t=eventTimes(m), A=P[m.a].name,B=P[m.b].name;
  const dates=t.allDay?`${t.start}/${t.end}`:`${t.start}/${t.end}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`🎾 ${A} vs ${B} · Legends Cup ${jLabel(m)}`)}&dates=${dates}&details=${encodeURIComponent("Americana Legends Cup Vol. 1")}${m.court?`&location=${encodeURIComponent(m.court)}`:""}`;
}
function downloadBlob(blob,name){ const u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); }
function addToCalendar(id){
  const m=getMatch(id); if(!m.date){ toast("Primero fija el día del partido"); return; }
  downloadBlob(new Blob([buildICS(m)],{type:"text/calendar;charset=utf-8"}),`legends-cup-${m.a}-vs-${m.b}.ics`);
  toast("Evento listo: ábrelo para añadirlo con sus avisos");
}

/* =====================================================================
   1 · COMPARTIR CARTEL (sin resultado)
   ===================================================================== */
let lastPoster=null;
async function drawPoster(id){
  const m=getMatch(id), A=P[m.a], B=P[m.b]; if(!A||!B) throw new Error("sin jugadores");
  const W=1080,H=1350, cv=document.createElement("canvas"); cv.width=W; cv.height=H; const g=cv.getContext("2d");
  try{ await Promise.all([document.fonts.load('italic 900 100px "Big Shoulders Display"'),document.fonts.load('700 30px Barlow')]); }catch(e){}
  const load=src=>new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; });
  let [ia,ib,s1,s2]=await Promise.all([load(BODY(m.a)),load(BODY(m.b)),load("img/smoke1.webp"),load("img/smoke2.webp")]);
  if(!ia) ia=await load(IMG(m.a)); if(!ib) ib=await load(IMG(m.b));
  const DISPLAY='"Big Shoulders Display", Impact, "Arial Narrow", sans-serif', BODYF='Barlow, "Segoe UI", Arial, sans-serif';
  const spacing=px=>{ if("letterSpacing" in g) g.letterSpacing=px+"px"; };
  // fondo
  let gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#123C8F"); gr.addColorStop(.45,"#1C56B8"); gr.addColorStop(1,"#0B2A6B"); g.fillStyle=gr; g.fillRect(0,0,W,H);
  gr=g.createRadialGradient(W/2,0,0,W/2,0,W*.95); gr.addColorStop(0,"rgba(150,200,255,.6)"); gr.addColorStop(1,"rgba(150,200,255,0)"); g.fillStyle=gr; g.fillRect(0,0,W,H);
  // humo teñido, uno a cada lado
  const smoke=(img,color,alpha,dx,dy,w,h,dirRight)=>{ if(!img) return;
    const L=document.createElement("canvas"); L.width=W; L.height=H; const c=L.getContext("2d");
    c.drawImage(img,dx,dy,w,h); c.globalCompositeOperation="source-in"; c.fillStyle=color; c.fillRect(0,0,W,H);
    c.globalCompositeOperation="destination-in"; const mg=c.createLinearGradient(dirRight?W:0,0,dirRight?W*.2:W*.8,0); mg.addColorStop(0,"#000"); mg.addColorStop(1,"rgba(0,0,0,0)"); c.fillStyle=mg; c.fillRect(0,0,W,H);
    g.globalAlpha=alpha; g.drawImage(L,0,0); g.globalAlpha=1; };
  smoke(s1,A.color,.62,-500,200,2160,1080,false); smoke(s1,B.color,.62,-900,60,2160,1080,true);
  smoke(s2,A.color,.4,-300,420,1800,900,false); smoke(s2,B.color,.4,-720,300,1800,900,true);
  // nombres grandes en contorno
  const fitFont=(txt,max,w)=>{ g.font=`italic 900 100px ${DISPLAY}`; const k=g.measureText(txt).width/100; return Math.min(max,w/k); };
  g.textAlign="center"; g.textBaseline="alphabetic"; g.lineJoin="round";
  [[A.first.toUpperCase(),330],[B.first.toUpperCase(),620]].forEach(([t,y])=>{ const sz=fitFont(t,400,1000); g.font=`italic 900 ${sz}px ${DISPLAY}`;
    g.fillStyle="rgba(255,255,255,.07)"; g.fillText(t,W/2,y+sz*.1); g.lineWidth=3; g.strokeStyle="rgba(215,232,255,.5)"; g.strokeText(t,W/2,y+sz*.1); });
  // halos y cuerpos
  const body=(img,x,color)=>{ if(!img) return; const dw=800, dh=dw*img.naturalHeight/img.naturalWidth, y=1235-dh;
    const rg=g.createRadialGradient(x+dw/2,y+dh*.38,20,x+dw/2,y+dh*.38,dw*.62); rg.addColorStop(0,color+"CC"); rg.addColorStop(.6,color+"33"); rg.addColorStop(1,color+"00"); g.fillStyle=rg; g.fillRect(x-100,y-100,dw+200,dh+200);
    g.save(); g.shadowColor="rgba(0,10,40,.6)"; g.shadowBlur=40; g.shadowOffsetY=22; g.drawImage(img,x,y,dw,dh); g.restore(); };
  body(ia,-175,A.color); body(ib,W-800+175,B.color);
  // VS
  g.save(); g.font=`italic 900 330px ${DISPLAY}`; const vg=g.createLinearGradient(0,380,0,650); vg.addColorStop(0,"#FFFFFF"); vg.addColorStop(.35,"#F4FF9A"); vg.addColorStop(.65,"#E3FF3B"); vg.addColorStop(1,"#B8D000");
  g.shadowColor="rgba(227,255,59,.85)"; g.shadowBlur=60; g.fillStyle=vg; g.setTransform(1,0,-.17,1,150,0); g.fillText("VS",W/2,640); g.restore();
  // bandas con los nombres
  const ticker=(cy,rot,h,bg,fg,acc,border)=>{ g.save(); g.translate(W/2,cy); g.rotate(rot*Math.PI/180); g.fillStyle=bg; g.fillRect(-W,-h/2,2*W,h);
    if(border){ g.strokeStyle=border; g.lineWidth=4; g.strokeRect(-W,-h/2,2*W,h); }
    g.font=`italic 900 ${h*.62}px ${DISPLAY}`; g.textAlign="left"; g.textBaseline="middle"; let x=-W*.62; const parts=[[A.name.toUpperCase()+" ",fg],["VS ",acc],[B.name.toUpperCase()+" ",fg],["· AMERICANA LEGENDS CUP · VOL. 1 · ",fg]];
    for(let r=0;r<4;r++) for(const[t,c] of parts){ g.fillStyle=c; g.fillText(t,x,0); x+=g.measureText(t).width; }
    g.restore(); };
  ticker(1015,-3.2,92,"#FFFFFF","#0B2A6B","#3E86E8",null); ticker(1090,2.4,92,"#06173F","#FFFFFF","#E3FF3B","#F3C64E");
  // pie
  gr=g.createLinearGradient(0,1010,0,H); gr.addColorStop(0,"rgba(6,23,63,0)"); gr.addColorStop(.28,"rgba(6,23,63,.92)"); gr.addColorStop(1,"#06173F"); g.fillStyle=gr; g.fillRect(0,1010,W,H-1010);
  g.textAlign="center"; g.textBaseline="alphabetic";
  const kick=`● LEGENDS CUP · ${m.playoff?PO_LABEL[m.id].toUpperCase():"JORNADA "+m.j}`; g.font=`700 34px ${BODYF}`; spacing(5); g.fillStyle="#F3C64E"; g.fillText(kick,W/2,1168); spacing(0);
  const nm1=A.name.toUpperCase(), nm2=B.name.toUpperCase(); const full=`${nm1}  VS  ${nm2}`; const sz=fitFont(full,98,980); g.font=`italic 900 ${sz}px ${DISPLAY}`;
  const wA=g.measureText(nm1+"  ").width, wV=g.measureText("VS").width, wB=g.measureText("  "+nm2).width, x0=W/2-(wA+wV+wB)/2; g.textAlign="left";
  g.fillStyle="#fff"; g.fillText(nm1+"  ",x0,1250); g.fillStyle="#E3FF3B"; g.fillText("VS",x0+wA,1250); g.fillStyle="#fff"; g.fillText("  "+nm2,x0+wA+wV,1250);
  g.textAlign="center"; g.font=`600 38px ${BODYF}`; g.fillStyle="#BFD7FF";
  const when=m.date?`${fmtDay(m.date).toUpperCase()}${m.time?" · "+m.time:""}${m.court?" · "+m.court.toUpperCase():""}`:"FECHA POR FIJAR";
  g.fillText(when,W/2,1304);
  g.font=`700 22px ${BODYF}`; spacing(5); g.fillStyle="rgba(243,198,78,.9)"; g.fillText("AMERICANA LEGENDS CUP · VOL. 1 · 2026–27",W/2,1338); spacing(0);
  return cv;
}
async function posterPreview(id){
  toast("Preparando el cartel…");
  let cv; try{ cv=await drawPoster(id); }catch(e){ console.error(e); toast("No se pudo crear el cartel"); return; }
  const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",0.92)); lastPoster={id,blob};
  const m=getMatch(id), url=URL.createObjectURL(blob); S.modal=null;
  showModal(`<div class="sheet-body"><h3>Cartel del partido</h3><p class="mini">Sin resultado: sirve para anunciar el partido en el grupo.</p>
    <img class="xt-poster-img" src="${url}" alt="Cartel de ${esc(P[m.a].name)} contra ${esc(P[m.b].name)}">
    <div class="btnrow"><button class="btn ball" data-x="doshare">📤 Compartir (WhatsApp…)</button><button class="btn ghost" data-x="dodl">⬇ Descargar</button></div></div>`);
}
async function sharePosterNow(){
  if(!lastPoster) return; const m=getMatch(lastPoster.id);
  const file=new File([lastPoster.blob],`cartel-${m.a}-vs-${m.b}.jpg`,{type:"image/jpeg"});
  const text=`🎾 ${P[m.a].name} vs ${P[m.b].name} · ${m.date?fmtDay(m.date)+(m.time?" "+m.time:""):"fecha por fijar"} · Americana Legends Cup`;
  if(navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],text,title:"Americana Legends Cup"}); return; }catch(e){ if(e&&e.name==="AbortError") return; } }
  downloadBlob(lastPoster.blob,file.name); toast("Imagen descargada: adjúntala en el grupo"); }

/* =====================================================================
   8 · EVOLUCIÓN DE LA CLASIFICACIÓN
   ===================================================================== */
S.xhl=null;
function evoData(){
  const played=FIXTURE.filter(f=>result(getMatch(f.id))).map(f=>f.j), maxJ=played.length?Math.max(...played):0;
  const series=PLAYERS.map(p=>({id:p.id,pts:[]}));
  for(let j=1;j<=maxJ;j++){ const st=standings(j); series.forEach(s=>s.pts.push({j,pos:st.byId[s.id].pos,pts:st.byId[s.id].pts})); }
  return {maxJ,series};
}
function evoHtml(){
  const {maxJ,series}=evoData();
  if(!maxJ) return `<h2>Evolución de la clasificación</h2><div class="empty">El gráfico aparece en cuanto haya resultados.</div>`;
  const W=720,H=560,pl=44,pr=96,pt=26,pb=44, X=j=>maxJ===1?(pl+(W-pl-pr)/2):pl+(j-1)*(W-pl-pr)/(maxJ-1), Y=pos=>pt+(pos-1)*(H-pt-pb)/9, hl=S.xhl;
  let g=""; for(let p=1;p<=10;p++) g+=`<line x1="${pl}" x2="${W-pr+10}" y1="${Y(p)}" y2="${Y(p)}" stroke="${p===4?"#3E86E8":"#D3DDEC"}" stroke-width="${p===4?1.5:1}" ${p===4?'stroke-dasharray="5 4"':""}/><text x="${pl-10}" y="${Y(p)+8}" text-anchor="end" font-size="22" fill="#5B6A85" font-weight="700">${p}</text>`;
  for(let j=1;j<=maxJ;j++) g+=`<text x="${X(j)}" y="${H-12}" text-anchor="middle" font-size="22" fill="#5B6A85" font-weight="700">J${j}</text>`;
  g+=`<text x="${W-pr+58}" y="${Y(4)-8}" text-anchor="end" font-size="18" fill="#3E86E8" font-weight="700">playoff</text>`;
  const order=series.slice().sort((a,b)=>(a.id===hl)-(b.id===hl));
  order.forEach(s=>{ const dim=hl&&s.id!==hl, c=col(s.id), pts=s.pts.map(p=>`${X(p.j).toFixed(1)},${Y(p.pos).toFixed(1)}`).join(" "), last=s.pts[s.pts.length-1];
    g+=`<g data-x="hl" data-id="${s.id}" style="cursor:pointer;opacity:${dim?.18:1}">${s.pts.length>1?`<polyline fill="none" stroke="${c}" stroke-width="${hl===s.id?10:6}" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>`:""}
      ${s.pts.map(p=>`<circle cx="${X(p.j)}" cy="${Y(p.pos)}" r="${hl===s.id?8:6.5}" fill="#fff" stroke="${c}" stroke-width="4"/>`).join("")}
      <clipPath id="xc_${s.id}"><circle cx="${X(last.j)+40}" cy="${Y(last.pos)}" r="22"/></clipPath><circle cx="${X(last.j)+40}" cy="${Y(last.pos)}" r="25" fill="${c}"/>
      <image href="${IMG(s.id)}" x="${X(last.j)+18}" y="${Y(last.pos)-24}" width="44" height="52" preserveAspectRatio="xMidYMin slice" clip-path="url(#xc_${s.id})"/></g>`; });
  return `<h2>Evolución de la clasificación</h2><p class="sub">Posición de cada jugador tras cada jornada. Toca a uno para resaltarlo.</p>
  <div class="panel"><div class="xt-evo"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de la clasificación por jornadas">${g}</svg></div>
  <div class="xt-leg">${PLAYERS.map(p=>`<button data-x="hl" data-id="${p.id}" class="${hl===p.id?"on":""}" style="--c:${p.color}">${av(p.id,"sm")}<span>${p.first}</span></button>`).join("")}</div></div>`;
}

/* =====================================================================
   9 · BESTIA NEGRA, RIVAL FAVORITO Y RÉCORDS
   ===================================================================== */
function rivalryHtml(id){
  const st=standings().byId, R=st[id];
  const opp=Object.entries(R.h2h).map(([o,h])=>({o,w:h.w,l:h.l,pts:st[o].pts}));
  const beast=opp.filter(x=>x.l>0).sort((a,b)=>(b.l-b.w)-(a.l-a.w)||b.pts-a.pts)[0];
  const fav=opp.filter(x=>x.w>0).sort((a,b)=>(b.w-b.l)-(a.w-a.l)||a.pts-b.pts)[0];
  const mine=R.res.map(m=>{ const r=result(m), me=m.a===id?"a":"b"; return {m,o:m.a===id?m.b:m.a,won:r.w===me}; });
  const bw=mine.filter(x=>x.won).sort((x,y)=>st[x.o].pos-st[y.o].pos)[0], wl=mine.filter(x=>!x.won).sort((x,y)=>st[y.o].pos-st[x.o].pos)[0];
  const card=(t,o,sub,cls)=>`<div class="xt-riv ${cls}" ${o?`data-open-player="${o}"`:""}><small>${t}</small>${o?`<div class="pl">${av(o)}<b>${esc(P[o].name)}</b></div><span>${sub}</span>`:`<span class="mini">${sub}</span>`}</div>`;
  return `<h3 style="margin-top:16px">Rivalidades</h3><div class="xt-rivs">
    ${card("😈 Bestia negra",beast&&beast.o,beast?`Balance contra él: ${beast.w}V · ${beast.l}D`:"Nadie le ha ganado todavía","bad")}
    ${card("🐑 Rival favorito",fav&&fav.o,fav?`Balance contra él: ${fav.w}V · ${fav.l}D`:"Todavía no ha ganado a nadie","good")}
    ${card("⭐ Mejor victoria",bw&&bw.o,bw?`Ganó a un ${st[bw.o].pos}º de la tabla`:"Sin victorias aún","good")}
    ${card("💥 Peor derrota",wl&&wl.o,wl?`Perdió con un ${st[wl.o].pos}º de la tabla`:"Sin derrotas aún","bad")}</div>`;
}
function recordsHtml(){
  const rows=standings(), played=FIXTURE.map(f=>getMatch(f.id)).filter(m=>{const r=result(m);return r&&!r.wo;});
  const top=(f,min=1)=>{ const mx=Math.max(...rows.map(f)); return mx>=min?{v:mx,ids:rows.filter(r=>f(r)===mx).map(r=>r.id)}:null; };
  const recs=[];
  const add=(icon,t,r,fmt)=>{ if(r) recs.push({icon,t,ids:r.ids,v:fmt(r.v)}); };
  add("🔥","Racha de victorias más larga",top(r=>r.best),v=>`${v} seguidas`);
  add("🧠","Más super tie-breaks ganados",top(r=>r.stW),v=>`${v}`);
  add("🎾","Más tie-breaks ganados",top(r=>r.tbW),v=>`${v}`);
  add("🍩","Más roscos repartidos (6-0)",top(r=>r.bag),v=>`${v}`);
  add("🥶","Más roscos encajados",top(r=>r.bagL),v=>`${v}`);
  add("🔄","Más remontadas",top(r=>r.rem),v=>`${v}`);
  const longest=played.map(m=>({m,g:result(m).ga+result(m).gb})).sort((a,b)=>b.g-a.g)[0];
  const rc=recs.map(r=>`<div class="xt-rec"><span class="xt-ri">${r.icon}</span><div><small>${r.t}</small><b>${r.ids.map(i=>P[i].first).join(", ")}</b></div><span class="num xt-rv">${r.v}</span></div>`);
  if(longest) rc.push(`<div class="xt-rec"><span class="xt-ri">⏱️</span><div><small>Partido con más juegos</small><b>${nm(longest.m.a)} – ${nm(longest.m.b)}</b></div><span class="num xt-rv">${longest.g}</span></div>`);
  return `<h2>Récords de la liga</h2>${rc.length?`<div class="xt-recs">${rc.join("")}</div>`:`<div class="empty">Los récords aparecen con los primeros resultados.</div>`}`;
}

/* =====================================================================
   2 · APP INSTALABLE + AVISOS (WEB PUSH)
   ===================================================================== */
const b64u8=s=>{ const p="=".repeat((4-s.length%4)%4), b=(s+p).replace(/-/g,"+").replace(/_/g,"/"), r=atob(b); return Uint8Array.from([...r].map(c=>c.charCodeAt(0))); };
const sha=async s=>{ const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,40); };
const Push={
  supported(){ return "serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window; },
  getReg(){ return navigator.serviceWorker.ready; },
  async enable(){
    if(!this.supported()) return {ok:false,reason:"unsupported"};
    if(!CFG.PUSH_KEY) return {ok:false,reason:"nokey"};
    if(!Store.db) return {ok:false,reason:"nodb"};
    const perm=await Notification.requestPermission(); if(perm!=="granted") return {ok:false,reason:"denied"};
    try{
      const reg=await this.getReg(); let sub=await reg.pushManager.getSubscription();
      if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u8(CFG.PUSH_KEY)});
      const json=sub.toJSON(), id=await sha(json.endpoint); flag("am_push",id);
      await Store.db.collection("push").doc(id).set({sub:JSON.stringify(json),who:S.me||"",t:Date.now()});
      this.notify({title:"🔔 ¡Avisos activados!",body:"Te avisaremos de partidos en directo, resultados y partidos fijados.",tag:"welcome"},{target:id});
      return {ok:true};
    }catch(e){ console.error(e); return {ok:false,reason:isPerm(e)?"rules":"error",detail:String(e&&e.message||e)}; }
  },
  async syncWho(){ const id=flag("am_push"); if(!id||!Store.db) return; try{ await Store.db.collection("push").doc(id).set({who:S.me||""},{merge:true}); }catch(e){} },
  async notify(payload,opts={}){
    if(!Store.db||!CFG.PUSH_KEY||!firebase.auth().currentUser) return;
    try{ const tok=await firebase.auth().currentUser.getIdToken();
      await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:tok,payload,exclude:opts.target?"":(flag("am_push")||""),only:opts.only||null,target:opts.target||null})}); }catch(e){}
  },
  state(){ return !("Notification" in window)?"unsupported":Notification.permission; }
};
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); deferredInstall=e; });
if(window.__bip) deferredInstall=window.__bip;
window.addEventListener("appinstalled",()=>{ flag("am_installed","1"); const b=document.getElementById("onb-install"); if(b){ b.textContent="✓ App instalada"; b.disabled=true; } });
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")) navigator.serviceWorker.register("sw.js").catch(()=>{});

/* ----- bienvenida de una sola vez: toca tu cara + dos botones ----- */
const Onb={
  html(only){
    const done=isStandalone()||flag("am_installed")==="1", ps=Push.state();
    const who=only?"":`<div class="onb-who"><label>Toca tu cara</label><div class="onb-faces">${PLAYERS.map(p=>`<button data-x="me" data-id="${p.id}" class="${S.me===p.id?"on":""}" style="--c:${p.color}" aria-label="${esc(p.name)}">${av(p.id).replace('loading="lazy"','loading="eager"')}<span>${p.first}</span></button>`).join("")}</div></div>`;
    return `<div class="onb" id="onb" role="dialog" aria-modal="true" aria-label="Bienvenida"><div class="onb-card"><div class="onb-trophy">${trophySvg()}</div>
      <h2>${only?"Activa los avisos":"¡Ya estás dentro!"}</h2><p class="onb-sub">${only?"Un toque y te avisamos de partidos en directo y resultados.":"Dos toques y listo."}</p>${who}
      ${only?"":`<button class="btn ball onb-btn" id="onb-install" data-x="install" ${done?"disabled":""}>${done?"✓ App instalada":"📲 Instalar la app"}</button>`}
      <button class="btn ball onb-btn" id="onb-notif" data-x="notif" ${ps==="granted"?"disabled":""}>${ps==="granted"?"✓ Avisos activados":"🔔 Activar avisos"}</button>
      <div class="onb-help" id="onb-help" aria-live="polite"></div>
      <button class="gate-link" data-x="onbclose">${only?"Ahora no":"Ahora no, gracias"}</button></div></div>`;
  },
  show(only){ this.close(); const d=document.createElement("div"); d.innerHTML=this.html(only); document.body.appendChild(d.firstElementChild); },
  close(){ const o=document.getElementById("onb"); if(o) o.remove(); },
  help(t){ const h=document.getElementById("onb-help"); if(h) h.innerHTML=t; },
  /* espera a que la pantalla de entrada haya desaparecido del todo antes de enseñar la bienvenida */
  queue(){ clearTimeout(this.t); let n=0; const tick=()=>{ if(!Store.member) return; if(document.getElementById("gate")&&n++<40){ this.t=setTimeout(tick,400); return; } this.t=setTimeout(()=>this.maybe(),600); }; this.t=setTimeout(tick,500); },
  maybe(){
    if(!Store.member||document.getElementById("onb")||document.getElementById("gate")) return;
    if(!flag("am_onb")){ flag("am_onb","1"); this.show(false); return; }
    // iPhone: los avisos solo existen con la app instalada; al abrirla desde el icono se vuelve a ofrecer una vez
    if(isStandalone()&&Push.supported()&&Notification.permission==="default"&&!flag("am_notif_asked")){ flag("am_notif_asked","1"); this.show(true); }
  },
  async install(){
    if(deferredInstall){ deferredInstall.prompt(); const c=await deferredInstall.userChoice.catch(()=>({})); deferredInstall=null;
      if(c.outcome==="accepted"){ flag("am_installed","1"); const b=document.getElementById("onb-install"); if(b){ b.textContent="✓ App instalada"; b.disabled=true; } this.check(); } else this.help("Cuando quieras: botón «Mi móvil» arriba."); return; }
    if(isIOS()) this.help(`<b>En iPhone:</b> pulsa el botón <b>Compartir</b> <span class="onb-ico">⬆️</span> de Safari y elige <b>«Añadir a pantalla de inicio»</b>. Luego ábrela desde su icono.`);
    else this.help(`Abre el menú del navegador (⋮) y elige <b>«Instalar app»</b> o <b>«Añadir a pantalla de inicio»</b>.`);
  },
  async notif(){
    if(!Push.supported()){ this.help(isIOS()&&!isStandalone()?`En iPhone los avisos solo funcionan con la app instalada. Pulsa primero <b>«Instalar la app»</b>, ábrela desde su icono y te lo volveré a ofrecer.`:`Este navegador no permite avisos. Prueba desde Chrome o desde la app instalada.`); return; }
    this.help("Un momento…"); const r=await Push.enable();
    if(r.ok){ const b=document.getElementById("onb-notif"); if(b){ b.textContent="✓ Avisos activados"; b.disabled=true; } this.help("¡Hecho! Te avisaremos de los partidos en directo y los resultados."); this.check(); }
    else if(r.reason==="denied") this.help(`Los avisos están bloqueados. Actívalos en los ajustes del navegador o del móvil para este sitio.`);
    else if(r.reason==="nokey"||r.reason==="nodb") this.help(`Los avisos todavía no están configurados en esta web. Díselo al organizador.`);
    else if(r.reason==="rules") this.help(`Falta un paso del organizador: publicar las reglas nuevas de Firebase (archivo firestore.rules). Mientras tanto la app funciona con normalidad.`);
    else this.help(`No se pudieron activar (${esc(r.detail||r.reason)}). Inténtalo de nuevo.`);
  },
  check(){ const i=document.getElementById("onb-install"), n=document.getElementById("onb-notif");
    if((!i||i.disabled)&&n&&n.disabled){ this.help("🎉 ¡Todo listo!"); setTimeout(()=>this.close(),1400); } }
};
function chooseMe(id){ S.me=id; flag("am_me",id); Push.syncWho(); document.querySelectorAll(".onb-faces button").forEach(b=>b.classList.toggle("on",b.dataset.id===id)); schedule(); }

/* =====================================================================
   ENGANCHES CON LA APP
   ===================================================================== */
TABS.push(["registro","Registro"]); VIEWS.registro=vLog;
if(location.hash==="#registro") S.tab="registro";
const _vAna=VIEWS.analytics; VIEWS.analytics=()=>evoHtml()+_vAna()+recordsHtml();

const _openMatch=window.openMatch;
window.openMatch=function(id){
  _openMatch(id);
  const body=document.querySelector("#modal .sheet-body"); if(!body) return;
  const m=getMatch(id); if(!m.a||!m.b) return;
  const anchor=body.querySelector(".vx-open"), done=!!result(m);
  const row=document.createElement("div"); row.className="xt-row";
  row.innerHTML=`<button class="btn ghost" data-x="share" data-id="${id}">📤 Compartir cartel</button>
    ${(!done&&m.date)?`<button class="btn ghost" data-x="ical" data-id="${id}">📅 Añadir al calendario</button><a class="btn ghost" href="${googleCal(m)}" target="_blank" rel="noopener">Google Calendar</a>`:""}
    ${!done?`<button class="btn wa" data-x="wa" data-id="${id}" data-k="${m.date?"today":"nodate"}">💬 Escribir por WhatsApp</button>`:""}`;
  if(anchor) anchor.after(row); else body.prepend(row);
  const h=matchHistory(id); if(h){ const t=document.createElement("div"); t.innerHTML=h; body.append(t.firstElementChild); }
};
const _openVersus=window.openVersus;
window.openVersus=function(id){
  _openVersus(id);
  const br=document.querySelector(".vx-tape .btnrow"); if(br){ const b=document.createElement("button"); b.className="btn ghost"; b.dataset.x="share"; b.dataset.id=id; b.textContent="📤 Compartir cartel"; br.append(b); }
};
const _openPlayer=window.openPlayer;
window.openPlayer=function(id){
  _openPlayer(id);
  const grid=document.querySelector("#modal .statgrid"); if(grid) grid.insertAdjacentHTML("afterend",rivalryHtml(id));
};
const _hide=window.hideGate;
window.hideGate=function(){ _hide(); Onb.queue(); };

/* botón permanente para repetir la bienvenida */
(function(){ const j=document.querySelector(".jinfo"); if(j&&!document.getElementById("mi-movil")){ const b=document.createElement("button"); b.className="exp"; b.id="mi-movil"; b.dataset.x="mymobile"; b.textContent="📲 Mi móvil"; j.appendChild(b); } })();

document.addEventListener("click",async e=>{
  const t=e.target.closest("[data-x]"); if(!t) return;
  const x=t.dataset.x, id=t.dataset.id;
  if(x==="share") posterPreview(id);
  else if(x==="doshare") sharePosterNow();
  else if(x==="dodl"&&lastPoster){ const m=getMatch(lastPoster.id); downloadBlob(lastPoster.blob,`cartel-${m.a}-vs-${m.b}.jpg`); }
  else if(x==="ical") addToCalendar(id);
  else if(x==="wa"){ const m=getMatch(id), a={k:t.dataset.k||"nodate",m,left:daysLeftAt(typeof m.j==="number"?m.j:currentJ(),new Date())}; window.open(waLink(alertMsg(a)),"_blank","noopener"); }
  else if(x==="hl"){ S.xhl=S.xhl===id?null:id; schedule(); }
  else if(x==="me") chooseMe(id);
  else if(x==="install") Onb.install();
  else if(x==="notif") Onb.notif();
  else if(x==="onbclose") Onb.close();
  else if(x==="mymobile") Onb.show(false);
});
document.addEventListener("change",e=>{ if(e.target&&e.target.id==="me") Push.syncWho(); });

window.Features={Push,Onb,alertsData,alertMsg,buildICS,googleCal,drawPoster,evoData,rivalryHtml,recordsHtml,diffEvent,logText,pushFor,daysLeftAt};
schedule();
})();
