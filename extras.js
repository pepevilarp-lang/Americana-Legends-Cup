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
  if(prev&&prev.status==="live"&&next.status==="live"&&setsCount(next)>setsCount(prev)) return {k:"set"};
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
/* AVISOS · qué se avisa, a quién y con cuánto ruido.
   Cada partido tiene su «hilo» (tag): un aviso nuevo sustituye al anterior en vez de amontonarse.
   «quiet» = llega sin sonido (para quien no juega ese partido, y de noche lo decide el servidor). */
function setsCount(m){ const w=setsWon((m&&m.sets)||[]); return w.a+w.b; }
function posMap(){ try{ const by=standings().byId; return Object.fromEntries(PLAYERS.map(p=>[p.id,by[p.id].pos])); }catch(_){ return null; } }
function moveText(id,before,after){ const b=before&&before[id], a=after&&after[id]; if(!b||!a) return ""; if(a===1) return b===1?`${nm(id)} sigue líder 👑`:`${nm(id)} se pone líder 👑`; if(a===b) return ""; return `${nm(id)} ${a<b?"sube":"baja"} al ${a}.º`; }
function pushPlan(ev,m,prev,next,before){
  const A=nm(m.a),B=nm(m.b),j=jLabel(m), both=[m.a,m.b], others=PLAYERS.map(p=>p.id).filter(x=>!both.includes(x));
  const by=S.me?nm(S.me):"Alguien";
  const when=d=>`${fmtDay(d.date)}${d.time?" · "+d.time:""}${d.court?" · "+d.court:""}`;
  switch(ev.k){
    case "live":
      return [{payload:{title:`🔴 En directo · ${j}`,body:`${A} vs ${B}. Sigue el marcador punto a punto.`,tag:"live-"+m.id,url:"./#hoy"}}];
    case "set": {
      const w=setsWon(next.sets||[]), last=(next.sets||[]).filter(setDone).slice(-1)[0], ws=last&&last.a>last.b?m.a:m.b;
      return [{payload:{title:`🔴 ${A} ${w.a}–${w.b} ${B}`,body:`Set para ${nm(ws)}${last?` (${last.a}-${last.b})`:""}. Sigue en directo.`,tag:"live-"+m.id,url:"./#hoy",quiet:true}}];
    }
    case "result": case "final": case "wo": {
      const r=result(next), W=r.w==="a"?m.a:m.b, L=r.w==="a"?m.b:m.a;
      let mv=""; if(before&&FX[m.id]){ const after=posMap(); mv=[moveText(W,before,after),moveText(L,before,after)].filter(Boolean).join(" · "); }
      return [{payload:{title:`🏁 Final · ${j}`,body:(r.wo?`WO: gana ${nm(W)} a ${nm(L)}`:`${nm(W)} gana a ${nm(L)} ${scoreText(next)}`)+(mv?`. ${mv}`:""),tag:"res-"+m.id,url:"./#clasificacion"}}];
    }
    case "correct":
      return [{payload:{title:"✏️ Resultado corregido",body:`${A}–${B} (${j}): ${ev.old} → ${scoreText(next)}. Lo cambió ${by}.`,tag:"res-"+m.id,url:"./#registro"},only:both}];
    case "reset":
      return [{payload:{title:"🗑️ Resultado borrado",body:`${A}–${B} (${j}): se ha borrado ${ev.old}. Lo hizo ${by}.`,tag:"res-"+m.id,url:"./#registro"},only:both}];
    case "date": {
      if(!next.date) return [{payload:{title:"📅 Fecha anulada",body:`${A} vs ${B} (${j}) vuelve a estar sin fecha.`,tag:"date-"+m.id,url:"./#calendario"},only:both}];
      const t=(prev&&prev.date)?"🔁 Partido cambiado":"📅 Partido fijado", body=`${A} vs ${B} · ${when(next)}`;
      return [{payload:{title:t,body,tag:"date-"+m.id,url:"./#calendario"},only:both},
              {payload:{title:t,body,tag:"date-"+m.id,url:"./#calendario",quiet:true},only:others}];
    }
  }
  return [];
}
/* Al fijar fecha se suelen tocar día, hora y pista seguidos: se espera unos segundos y solo sale el último */
const PUSH_WAIT={};
function sendPush(p,key){
  if(!key){ Push.notify(p.payload,{only:p.only}); return; }
  const k=key+(p.payload.quiet?"-q":""); clearTimeout(PUSH_WAIT[k]);
  PUSH_WAIT[k]=setTimeout(()=>{ delete PUSH_WAIT[k]; Push.notify(p.payload,{only:p.only}); },6000);
}
const _setMatch=Store.setMatch;
Store.setMatch=function(id,data){
  const prev=this.matches[id]?JSON.parse(JSON.stringify(this.matches[id])):undefined, before=FX[id]?posMap():null;
  return _setMatch.call(this,id,data).then(ok=>{ if(ok){ try{ afterSave(id,prev,data,before); }catch(e){ console.error(e); } } return ok; });
};
function afterSave(id,prev,next,before){
  const ev=diffEvent(prev,next); if(!ev) return;
  const m=getMatch(id), txt=logText(ev,m,next);
  if(txt) Store.addLog({t:Date.now(),who:S.me||"",k:ev.k,m:id,txt});
  pushPlan(ev,m,prev,next,before).forEach(p=>sendPush(p,ev.k==="date"?"date-"+id:null));
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
      try{ await reg.showNotification("🔔 ¡Avisos activados!",{body:"Te avisaremos cuando se fije un partido, empiece un directo o haya resultado.",tag:"welcome",icon:"icon-192.png",badge:"icon-192.png"}); }catch(_){}
      return {ok:true};
    }catch(e){ console.error(e); return {ok:false,reason:isPerm(e)?"rules":"error",detail:String(e&&e.message||e)}; }
  },
  async syncWho(){ const id=flag("am_push"); if(!id||!Store.db) return; try{ await Store.db.collection("push").doc(id).set({who:S.me||""},{merge:true}); }catch(e){} },
  async notify(payload,opts={}){
    if(!Store.db||!CFG.PUSH_KEY||!firebase.auth().currentUser) return {ok:false,error:"no-session"};
    try{ const tok=await firebase.auth().currentUser.getIdToken();
      const r=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:tok,payload,exclude:opts.target?"":(flag("am_push")||""),only:opts.only||null,target:opts.target||null})});
      let j={}; try{ j=await r.json(); }catch(_){}
      if(!r.ok) console.warn("Avisos:",r.status,j);
      return {ok:r.ok,status:r.status,...j};
    }catch(e){ console.warn("Avisos:",e); return {ok:false,error:String(e&&e.message||e)}; }
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
    const who=(only||S.me)?"":`<div class="onb-who"><label>Toca tu cara</label><div class="onb-faces">${PLAYERS.map(p=>`<button data-x="me" data-id="${p.id}" class="${S.me===p.id?"on":""}" style="--c:${p.color}" aria-label="${esc(p.name)}">${av(p.id).replace('loading="lazy"','loading="eager"')}<span>${p.first}</span></button>`).join("")}</div></div>`;
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

/* =====================================================================
   PERFIL DE JUGADOR · radar, ranking en la liga, forma, posición por jornada y comparador
   ===================================================================== */
S.pcmp=null; S.pid=null;
const PF_AXES=[["Victorias","vic"],["Sets","set"],["Juegos","jue"],["Remontadas","rem"],["Tie-breaks","tb"],["Racha","rach"]];
function pfMetrics(){
  const by=standings().byId, all=PLAYERS.map(p=>by[p.id]);
  const mx=f=>Math.max(1,...all.map(f));
  const pct=(a,b)=>(a+b)?a/(a+b)*100:0;
  const M=r=>({ vic:r.pj?r.pg/r.pj*100:0, set:pct(r.sf,r.sc), jue:pct(r.jf,r.jc), rem:r.rem/mx(x=>x.rem)*100, tb:pct(r.tbW,r.tbL), rach:r.best/mx(x=>x.best)*100 });
  return {by,all,M};
}
/* posición de un jugador en la liga para una métrica (empates = mismo puesto) */
function pfRank(all,f,id){ const mine=f(all.find(r=>r.id===id)); return 1+all.filter(r=>f(r)>mine).length; }
function pfRadar(M,Cm,p,cmpId){
  const cx=180,cy=160,RR=105,n=6;
  const pt=(i,v,rad=RR)=>{ const a=-Math.PI/2+i*2*Math.PI/n, r=rad*Math.max(0,Math.min(100,v))/100; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };
  const poly=m=>PF_AXES.map(([,k],i)=>pt(i,m[k]).map(x=>x.toFixed(1)).join(",")).join(" ");
  const rings=[25,50,75,100].map(g=>`<polygon points="${PF_AXES.map((_,i)=>pt(i,g).map(x=>x.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="#D3DDEC"/>`).join("");
  const spokes=PF_AXES.map((_,i)=>{const [x,y]=pt(i,100);return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#D3DDEC"/>`;}).join("");
  const labels=PF_AXES.map(([t],i)=>{const [x,y]=pt(i,100,RR+26);return `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="#5B6A85">${t}</text>`;}).join("");
  const dots=PF_AXES.map(([,k],i)=>{const [x,y]=pt(i,M[k]);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${p.color}" stroke="#fff" stroke-width="1.5"/>`;}).join("");
  const cmp=Cm?`<polygon points="${poly(Cm)}" fill="${col(cmpId)}" fill-opacity=".16" stroke="${col(cmpId)}" stroke-width="2.5" stroke-dasharray="7 5"/>`:"";
  return `<svg class="pf-radar" viewBox="0 0 360 320" role="img" aria-label="Radar de ${esc(p.first)}">${rings}${spokes}${cmp}<polygon points="${poly(M)}" fill="${p.color}" fill-opacity=".38" stroke="${p.color}" stroke-width="3"/>${dots}${labels}</svg>`;
}
function playerProfileHtml(id){
  const {by,all,M}=pfMetrics(), R=by[id], p=P[id], N=all.length, E=elo();
  const Mi=M(R), cmpId=S.pcmp&&S.pcmp!==id&&P[S.pcmp]?S.pcmp:null, Mc=cmpId?M(by[cmpId]):null;
  const pj=R.pj, winPct=pj?Math.round(R.pg/pj*100):0;
  const rk=f=>{ if(!pj) return ""; const r=pfRank(all,f,id); return `<em class="pf-rk ${r<=3?"top":""}">${r}º de ${N}</em>`; };
  const stat=(v,k,rank="")=>`<div class="pf-stat"><b class="num">${v}</b><span>${k}</span>${rank}</div>`;
  const stats=[
    stat(R.pos+"º","Posición",rk(r=>r.pts)),
    stat(R.pts,"Puntos",rk(r=>r.pts)),
    stat(winPct+"%","Victorias",rk(r=>r.pj?r.pg/r.pj:0)),
    stat(`${R.sf}-${R.sc}`,"Sets",rk(r=>r.sf-r.sc)),
    stat(`${R.jf}-${R.jc}`,"Juegos",rk(r=>r.jf-r.jc)),
    stat(pj?(R.jf/pj).toFixed(1):"–","Juegos a favor por partido",rk(r=>r.pj?r.jf/r.pj:0)),
    stat(`${R.tbW}-${R.tbL}`,"Tie-breaks",rk(r=>r.tbW)),
    stat(`${R.stW}-${R.stL}`,"Super tie-breaks",rk(r=>r.stW)),
    stat(R.rem,"Remontadas",rk(r=>r.rem)),
    stat(R.bag,"Roscos (6-0)",rk(r=>r.bag)),
    stat(R.streak>0?"+"+R.streak:R.streak<0?"−"+(-R.streak):"0","Racha (+ victorias / − derrotas)"),
    stat(R.best,"Mejor racha",rk(r=>r.best)),
    stat(E.R[id].toFixed(0),"Índice MVP",rk(r=>E.R[r.id]))
  ].join("");
  const myScore=m=>{ if(m.status==="wo") return "WO"; const me=m.a===id?"a":"b"; return (m.sets||[]).map(s=>me==="a"?`${s.a}-${s.b}`:`${s.b}-${s.a}`).join(" · "); };
  const lastM=R.res.slice(-10);
  const form=lastM.length?`<div class="pf-form">${lastM.map(m=>{ const r=result(m), me=m.a===id?"a":"b", won=r.w===me, o=m.a===id?m.b:m.a;
    return `<button class="pf-chip ${won?"W":"L"}" data-open-match="${m.id}" title="${esc(nm(o))} · ${esc(myScore(m))}"><b>${won?"V":"D"}</b><span>${esc(nm(o))}</span><small>${esc(myScore(m))}</small></button>`; }).join("")}</div>`
    : `<div class="empty">Todavía sin partidos.</div>`;
  const {maxJ,series}=evoData(), ser=series.find(s=>s.id===id), serC=cmpId?series.find(s=>s.id===cmpId):null;
  let evo=`<div class="empty">La gráfica aparece con los primeros resultados.</div>`;
  if(maxJ){
    const W=600,H=260,pl=40,pr=20,pt=18,pb=34, X=j=>maxJ===1?W/2:pl+(j-1)*(W-pl-pr)/(maxJ-1), Y=q=>pt+(q-1)*(H-pt-pb)/9;
    let g="";
    for(let q=1;q<=10;q++) g+=`<line x1="${pl}" x2="${W-pr}" y1="${Y(q)}" y2="${Y(q)}" stroke="${q===4?"#3E86E8":"#E3EAF4"}" ${q===4?'stroke-dasharray="5 4"':""}/><text x="${pl-10}" y="${Y(q)+5}" text-anchor="end" font-size="13" font-weight="700" fill="#5B6A85">${q}</text>`;
    for(let j=1;j<=maxJ;j++) g+=`<text x="${X(j)}" y="${H-10}" text-anchor="middle" font-size="13" font-weight="700" fill="#5B6A85">J${j}</text>`;
    const line=(s,c,w,dash)=>`<polyline fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash?'stroke-dasharray="7 5"':""} points="${s.pts.map(x=>`${X(x.j).toFixed(1)},${Y(x.pos).toFixed(1)}`).join(" ")}"/>`;
    if(serC) g+=line(serC,col(cmpId),3,true);
    g+=line(ser,p.color,5,false);
    g+=ser.pts.map(x=>`<circle cx="${X(x.j).toFixed(1)}" cy="${Y(x.pos).toFixed(1)}" r="12" fill="#fff" stroke="${p.color}" stroke-width="3.5"/><text x="${X(x.j).toFixed(1)}" y="${(Y(x.pos)+4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="${p.color}">${x.pos}</text>`).join("");
    evo=`<svg class="pf-evo" viewBox="0 0 ${W} ${H}" role="img" aria-label="Posición de ${esc(p.first)} por jornadas">${g}</svg>`;
  }
  const riv=PLAYERS.filter(x=>x.id!==id).map(x=>({x,h:R.h2h[x.id]||{w:0,l:0}})).filter(o=>o.h.w+o.h.l>0).sort((a,b)=>(b.h.w+b.h.l)-(a.h.w+a.h.l));
  const rivalTbl=riv.length?`<div class="pf-riv">${riv.map(o=>{ const t=o.h.w+o.h.l, pw=o.h.w/t*100;
    return `<div class="pf-rrow" data-open-player="${o.x.id}"><div class="pl">${av(o.x.id,"sm")}<span>${esc(o.x.first)}</span></div><div class="pf-rbar"><i style="width:${pw.toFixed(0)}%;background:${p.color}"></i></div><b class="num">${o.h.w}–${o.h.l}</b></div>`; }).join("")}</div>`
    : `<div class="empty">Aún no ha jugado contra nadie.</div>`;
  const sel=`<div class="pf-cmp"><label for="pcmp">Comparar con</label><select id="pcmp"><option value="">— nadie —</option>${PLAYERS.filter(x=>x.id!==id).map(x=>`<option value="${x.id}" ${cmpId===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></div>`;
  const cmpTbl=cmpId?`<table class="cmp pf-cmpt"><tr><td style="color:${p.color}">${esc(p.first)}</td><td class="k">Radar</td><td style="color:${col(cmpId)}">${esc(P[cmpId].first)}</td></tr>${PF_AXES.map(([t,k])=>`<tr><td class="${Mi[k]>=Mc[k]?"better":""}">${Math.round(Mi[k])}</td><td class="k">${t}</td><td class="${Mc[k]>Mi[k]?"better":""}">${Math.round(Mc[k])}</td></tr>`).join("")}</table>`:"";
  const bio=(p.nick||p.bio)?`<div class="bio" style="--c:${p.color}">${p.nick?`<b>“${esc(p.nick)}”</b>`:""}${p.style?`<span>${esc(p.style)}</span>`:""}${p.bio?`<p>${esc(p.bio)}</p>`:""}</div>`:"";
  const scoutBtn=`<button class="btn ball pf-scout" data-x="scout" data-id="${id}">🔎 ${S.me===id?"Ver mi informe de scouting":"Analizar rival"}</button>`;
  return bio+scoutBtn
    +`<h3 class="pf-h">Números <small>(puesto en la liga entre paréntesis)</small></h3><div class="pf-stats">${stats}</div>`
    +`<div class="pf-two"><div><h3 class="pf-h">Perfil</h3><div class="panel pf-radarbox">${pfRadar(Mi,Mc,p,cmpId)}<div class="pf-legend"><i style="background:${p.color}"></i>${esc(p.first)}${cmpId?` <i class="dash" style="border-color:${col(cmpId)}"></i>${esc(P[cmpId].first)}`:""}</div></div></div>`
    +`<div>${sel}${cmpTbl}<h3 class="pf-h">Últimos 10</h3>${form}</div></div>`
    +`<h3 class="pf-h">Posición en cada jornada</h3><div class="panel">${evo}</div>`
    +`<h3 class="pf-h">Contra cada rival</h3>${rivalTbl}`
    +rivalryHtml(id)
    +`<h3 class="pf-h">Resultados</h3>${R.res.length?`<div class="mlist">${R.res.slice().reverse().map(matchRow).join("")}</div>`:`<div class="empty">Todavía sin partidos jugados.</div>`}`;
}
window.openPlayer=function(id){
  S.pid=id; S.modal=()=>window.openPlayer(id);
  const sc=document.querySelector("#modal .modal"), top=sc?sc.scrollTop:0;
  showModal(playerPoster(id)+`<div class="sheet-body">${playerProfileHtml(id)}</div>`);
  const n=document.querySelector("#modal .modal"); if(n) n.scrollTop=top;
};
document.addEventListener("change",e=>{ if(e.target&&e.target.id==="pcmp"){ S.pcmp=e.target.value||null; window.openPlayer(S.pid); } });

/* =====================================================================
   AVISOS OBLIGATORIOS · la app no sigue sin avisos activados
   ===================================================================== */
window.pushOk=async function(){
  if(!Push.supported()||!CFG.PUSH_KEY) return false;
  if(Notification.permission!=="granted") return false;
  if(flag("am_push")) return true;
  const r=await Push.enable(); return !!r.ok;
};
window.pushEnableGate=async function(btn){
  btn.disabled=true; btn.textContent="Activando…";
  const r=await Push.enable();
  if(r.ok){ await Store.afterLogin(); return; }
  btn.disabled=false; btn.textContent="🔔 Activar avisos";
  const h=document.getElementById("gate-push-help"); if(!h) return;
  h.textContent = r.reason==="denied" ? "Has bloqueado los avisos. Actívalos en los ajustes del navegador o del móvil para esta web y vuelve a pulsar."
    : r.reason==="rules" ? "Falta publicar las reglas de Firebase (firestore.rules)."
    : r.reason==="nokey" ? "Los avisos todavía no están configurados en la web. Díselo al organizador."
    : r.reason==="unsupported" ? "Este navegador no permite avisos. Usa Chrome o instala la app."
    : "No se pudieron activar ("+(r.detail||r.reason)+"). Inténtalo de nuevo.";
};

/* =====================================================================
   ENCUESTA POSTPARTIDO · una por jugador y partido, privada, obligatoria al abrir la app
   ===================================================================== */
const SV={
  scale5perf:["Muy malo","Malo","Normal","Bueno","Muy bueno"],
  golpes:[["saque","Saque"],["derecha","Derecha"],["reves","Revés"],["volea","Volea"],["dejada","Dejada"],["globo","Globo"],["remate","Remate"],["resto","Resto"]],
  pista:["Muy lenta","Lenta","En condiciones normales","Rápida","Muy rápida","Con mucha tierra suelta","Con poca tierra / pista dura","Irregular o con baches"],
  clima:["Perfectas","Calor intenso","Frío","Viento ligero","Mucho viento","Humedad alta","Llovizna","Partido después de lluvia / pista pesada","Mala visibilidad"],
  fisico:["Muy mal","Mal","Normal","Bien","Muy bien"],
  deport:["Nada","Poco","Normal","Bastante","Total"],
  refl:["Nada","Poco","Más o menos","Bastante","Totalmente"],
  factor:["Saque","Consistencia","Físico","Mentalidad","Errores no forzados","Otro"]
};
const SV_STEPS=[
  {key:"q1",title:"¿Cómo valorarías tu rendimiento?",opts:SV.scale5perf},
  {key:"q2",title:"¿Cómo valorarías el rendimiento de tu rival?",opts:SV.scale5perf},
  {key:"q3",title:"Golpes del partido",golpes:true},
  {key:"q4",title:"¿Cómo estaba la pista?",opts:SV.pista},
  {key:"q5",title:"¿Cómo fueron las condiciones meteorológicas?",opts:SV.clima},
  {key:"q6",title:"¿Cómo te encontraste físicamente?",opts:SV.fisico},
  {key:"q7",title:"¿Hubo deportividad durante el partido?",opts:SV.deport},
  {key:"q8",title:"¿El resultado refleja lo ocurrido en pista?",opts:SV.refl},
  {key:"q9",title:"¿Cuál fue el factor decisivo?",opts:SV.factor},
  {key:"q10",title:"Comentario opcional",comment:true}
];

let SV_RUN=null;
function runSurvey(list){
  if(SV_RUN) return;
  const ov=document.createElement("div"); ov.id="survey"; ov.className="sv"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Encuesta del partido");
  document.body.appendChild(ov); document.body.classList.add("locked");
  SV_RUN={list,idx:0,ans:{},step:0,ov};
  svRender();
}
function svCurrent(){ return SV_RUN.list[SV_RUN.idx]; }
function svMatch(){ const d=svCurrent(); return getMatch(d.matchId); }
function svSide(){ const d=svCurrent(); const m=svMatch(); const rival=d.playerId===m.a?m.b:m.a; return {m,rival}; }
function svValid(step){
  const s=SV_STEPS[step]; const a=SV_RUN.ans;
  if(s.golpes) return !!(a.q3a&&a.q3b);
  if(s.comment) return true;
  return !!a[s.key];
}
function svRender(){
  const {ov}=SV_RUN, s=SV_STEPS[SV_RUN.step], n=SV_STEPS.length, pct=(SV_RUN.step+1)/n*100;
  const {m,rival}=svSide(), total=SV_RUN.list.length, left=SV_RUN.idx+1;
  let body="";
  if(s.golpes){
    body=`<div class="sv-group"><h4>¿Con qué golpe jugaste con más confianza?</h4><div class="sv-opts">${SV.golpes.map(([k,t])=>`<button class="sv-o ${SV_RUN.ans.q3a===t?"on":""}" data-sv="q3a" data-v="${t}">${t}</button>`).join("")}</div></div>
      <div class="sv-group"><h4>¿Con cuál jugaste con menos confianza?</h4><div class="sv-opts">${SV.golpes.map(([k,t])=>`<button class="sv-o ${SV_RUN.ans.q3b===t?"on":""}" data-sv="q3b" data-v="${t}">${t}</button>`).join("")}</div></div>`;
  } else if(s.comment){
    body=`<textarea id="sv-com" maxlength="300" placeholder="Opcional. Lo que quieras decir del partido (máx. 300 caracteres)">${esc(SV_RUN.ans.q10||"")}</textarea><div class="sv-count"><span id="sv-cc">${(SV_RUN.ans.q10||"").length}</span>/300</div>`;
  } else {
    body=`<div class="sv-opts sv-col">${s.opts.map(t=>`<button class="sv-o ${SV_RUN.ans[s.key]===t?"on":""}" data-sv="${s.key}" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div>`;
  }
  const last=SV_RUN.step===n-1, ok=svValid(SV_RUN.step);
  ov.innerHTML=`<div class="sv-box">
    <div class="sv-top"><span class="sv-tag">📝 Encuesta · ${esc(jLabel(m))} · ${esc(nm(m.a))} – ${esc(nm(m.b))}</span>${total>1?`<span class="sv-tag">${left}/${total}</span>`:""}</div>
    <div class="sv-bar"><i style="width:${pct}%"></i></div>
    <div class="sv-step">Paso ${SV_RUN.step+1} de ${n}</div>
    <h3 class="sv-q">${esc(s.title)}</h3>
    ${s.golpes||s.comment?"":`<p class="sv-sub">${s.key==="q2"?`Tu rival: ${esc(nm(rival))}`:""}</p>`}
    <div class="sv-body">${body}</div>
    <div class="sv-nav">
      ${SV_RUN.step>0?`<button class="btn ghost" data-sv-nav="back">← Atrás</button>`:"<span></span>"}
      ${last?`<button class="btn ball" data-sv-nav="send" ${ok?"":"disabled"}>Enviar encuesta</button>`
        :`<button class="btn ball" data-sv-nav="next" ${ok?"":"disabled"}>Siguiente →</button>`}
    </div>
    <p class="sv-note">Tus respuestas alimentan el «Análisis de rival» solo en cifras agregadas (a partir de 2 encuestas). Nunca se muestran respuestas sueltas ni tu comentario.</p>
  </div>`;
}
document.addEventListener("click",async e=>{
  if(!SV_RUN) return;
  const o=e.target.closest("[data-sv]"), nav=e.target.closest("[data-sv-nav]");
  if(o){
    const k=o.dataset.sv, v=o.dataset.v;
    SV_RUN.ans[k]=v; svRender(); return;
  }
  if(!nav) return;
  if(nav.dataset.svNav==="back"){ SV_RUN.step--; svRender(); return; }
  if(nav.dataset.svNav==="next"){ SV_RUN.step++; svRender(); return; }
  if(nav.dataset.svNav==="send"){ nav.disabled=true; nav.textContent="Enviando…"; await svSubmit(); }
});
document.addEventListener("input",e=>{
  if(SV_RUN&&e.target&&e.target.id==="sv-com"){ SV_RUN.ans.q10=e.target.value.slice(0,300); const c=document.getElementById("sv-cc"); if(c) c.textContent=SV_RUN.ans.q10.length; }
});
async function svSubmit(){
  const d=svCurrent(), a=SV_RUN.ans, answers={
    q1:a.q1,q2:a.q2,q3_confianza:a.q3a,q3_menos_confianza:a.q3b,q4:a.q4,q5:a.q5,q6:a.q6,q7:a.q7,q8:a.q8,q9:a.q9,comentario:(a.q10||"").slice(0,300)
  };
  try{
    const sref=Store.db.collection("surveys").doc(d.id), stref=Store.db.collection("survey_stats").doc(d.playerId);
    try{
      await Store.db.runTransaction(async t=>{
        const st=await t.get(stref);
        t.update(sref,{status:"completed",answers,sentAt:Date.now()});
        t.set(stref,statsAdd(st.exists?st.data():null,d.playerId,answers,getMatch(d.matchId),d.id));
      });
      delete SC_CACHE[d.playerId];
    }catch(e2){
      if(!isPerm(e2)) throw e2;
      await sref.update({status:"completed",answers,sentAt:Date.now()});   // el organizador puede recalcular las cifras luego
    }
  }catch(err){
    console.error(err); toast("No se pudo enviar. Revisa la conexión y pulsa otra vez.");
    const b=document.querySelector("[data-sv-nav='send']"); if(b){ b.disabled=false; b.textContent="Enviar encuesta"; }
    return;
  }
  SV_RUN.idx++; SV_RUN.step=0; SV_RUN.ans={};
  if(SV_RUN.idx<SV_RUN.list.length){ svRender(); toast("¡Enviada! Queda otra encuesta"); return; }
  SV_RUN.ov.remove(); SV_RUN=null; document.body.classList.remove("locked"); render(); toast("¡Gracias! Encuestas completadas");
}
/* Al abrir la app: solo las pendientes (no interrumpe mientras se juega) */
async function surveyCheck(){
  if(!Store.db||!S.me||!Store.member||SV_RUN) return;
  try{
    const snap=await Store.db.collection("surveys").where("playerId","==",S.me).where("status","==","pending").get();
    const list=snap.docs.map(x=>({id:x.id,...x.data()})).sort((x,y)=>(x.t||0)-(y.t||0));
    if(list.length) runSurvey(list);
  }catch(e){ console.error(e); }
}
/* Al guardar un resultado: se crean las dos encuestas (create falla si ya existían) */
async function surveyCreate(id){
  if(!Store.db) return;
  const m=getMatch(id); if(!(m.a&&m.b)||!result(m)||result(m).wo) return;
  for(const p of [m.a,m.b]){
    const sid=`${id}__${p}`;
    try{
      /* set() sobre un documento que no existe = regla create; si ya existe = regla update, que solo puede usar su dueño */
      await Store.db.collection("surveys").doc(sid).set({matchId:id,playerId:p,status:"pending",t:Date.now()});
      Push.notify({title:"📝 Encuesta del partido",body:`Cuéntanos cómo fue ${nm(m.a)} – ${nm(m.b)} (${jLabel(m)})`,tag:"survey-"+sid,url:"./#hoy"},{only:[p]});
    }catch(e){ /* ya existía */ }
  }
}
const _afterSave=afterSave;
afterSave=function(id,prev,next,before){ _afterSave(id,prev,next,before); surveyCreate(id); };

/* Al entrar: se mira si hay encuestas pendientes */
const _listen2=Store.listen;
Store.listen=function(){ const was=this.listening; _listen2.call(this); if(!was) setTimeout(surveyCheck,900); };

/* =====================================================================
   VISTA DEL ORGANIZADOR · solo cifras agregadas (las reglas impiden leer las respuestas individuales a los demás)
   ===================================================================== */
window.onAdmin=function(){
  if(TABS.some(t=>t[0]==="encuestas")) return;
  TABS.push(["encuestas","Organizador"]); VIEWS.encuestas=()=>vCuentas()+vEncuestas(); schedule();
};
/* Cuentas: qué cuenta de Google tiene cada cara, y botón para liberarla (cuenta borrada, cuenta equivocada…) */
let ACC_CACHE=null;
async function loadAccounts(){ const s=await Store.db.collection("claims").get(); ACC_CACHE=s.docs.map(d=>({pid:d.id,...d.data()})); schedule(); }
function vCuentas(){
  if(!Store.isAdmin) return "";
  if(ACC_CACHE===null){ loadAccounts().catch(e=>{ ACC_CACHE=[]; console.error(e); }); return `<h2>Cuentas</h2><div class="empty">Cargando…</div>`; }
  const by=Object.fromEntries(ACC_CACHE.map(c=>[c.pid,c]));
  return `<h2>Cuentas</h2><p class="sub">Qué cuenta de Google tiene cada cara. Si alguien entró con la cuenta equivocada o borraste su cuenta, libera su cara y podrá elegirla de nuevo.</p>
  <div class="panel">${PLAYERS.map(p=>{ const c=by[p.id];
    return `<div class="tline acc-row"><div class="pl">${av(p.id,"sm")}<span>${esc(p.first)}</span></div>
      <span class="mini acc-mail">${c?esc(c.email||"cuenta sin correo")+(c.uid?" · "+esc(String(c.uid).slice(0,6))+"…":""):"<i>libre</i>"}</span>
      ${c?`<button class="btn danger acc-free" data-x="freeclaim" data-id="${p.id}" data-uid="${esc(c.uid||"")}">Liberar</button>`:""}</div>`; }).join("")}</div>`;
}
document.addEventListener("click",async ev=>{
  const t=ev.target.closest('[data-x="freeclaim"]'); if(!t||!Store.isAdmin) return;
  const pid=t.dataset.id, uid=t.dataset.uid;
  if(!confirm(`¿Liberar la cara de ${nm(pid)}? Esa cuenta tendrá que volver a elegir cara.`)) return;
  t.disabled=true;
  try{
    await Store.db.collection("claims").doc(pid).delete();
    if(uid) await Store.db.collection("players").doc(uid).delete().catch(()=>{});
    toast(`Cara de ${nm(pid)} liberada`); ACC_CACHE=null; schedule();
  }catch(e){ console.error(e); t.disabled=false; toast(isPerm(e)?"Sin permiso: publica las reglas nuevas":"No se pudo liberar"); }
});
let ENC_CACHE=null;
async function loadSurveyStats(){
  const snap=await Store.db.collection("surveys").get();
  ENC_CACHE=snap.docs.map(x=>({id:x.id,...x.data()}));
  schedule();
}
function vEncuestas(){
  if(!Store.isAdmin) return `<div class="empty">Solo para el organizador.</div>`;
  if(ENC_CACHE===null){ loadSurveyStats().catch(e=>{ ENC_CACHE=[]; console.error(e); }); return `<h2>Encuestas</h2><div class="empty">Cargando…</div>`; }
  const all=ENC_CACHE, done=all.filter(x=>x.status==="completed"), pend=all.filter(x=>x.status==="pending");
  const bars=(title,opts,key)=>{ const c={}; done.forEach(x=>{ const v=x.answers&&x.answers[key]; if(v) c[v]=(c[v]||0)+1; }); const mx=Math.max(1,...Object.values(c));
    return `<div class="panel xt-agg"><h3>${title}</h3>${opts.map(o=>{const n=c[o]||0; return `<div class="vbar"><span>${esc(o)}</span><div class="vtrack"><span style="width:${n/mx*100}%;background:var(--sky)"></span></div><b class="num">${n}</b></div>`;}).join("")}</div>`; };
  const avg=key=>{ const map={"Muy malo":1,"Malo":2,"Normal":3,"Bueno":4,"Muy bueno":5}; const v=done.map(x=>map[x.answers&&x.answers[key]]).filter(Boolean); return v.length?(v.reduce((s,n)=>s+n,0)/v.length).toFixed(1):"–"; };
  const byMatch=Object.values(all.reduce((acc,x)=>{ (acc[x.matchId]=acc[x.matchId]||{id:x.matchId,c:0,n:0}); acc[x.matchId].n++; if(x.status==="completed") acc[x.matchId].c++; return acc; },{}));
  return `<h2>Encuestas</h2><p class="sub">Solo cifras agregadas. Las respuestas individuales no se muestran a nadie.</p>
    <div class="panel sc-admin"><b>Análisis de rival</b><p class="mini">Recalcula las cifras de cada jugador con todas las encuestas respondidas, también las anteriores a esta función. Avisa al grupo antes.</p><button class="btn ball" data-x="scoutrebuild">🔄 Recalcular análisis de rival</button></div>
    <div class="kpis"><div class="kpi"><small>Completadas</small><b>${done.length}</b></div><div class="kpi"><small>Pendientes</small><b>${pend.length}</b></div>
    <div class="kpi good"><small>Rendimiento propio (media)</small><b>${avg("q1")}/5</b></div><div class="kpi sky"><small>Rendimiento del rival (media)</small><b>${avg("q2")}/5</b></div></div>
    <div class="grid2" style="margin-top:14px">${bars("Pista",SV.pista,"q4")}${bars("Clima",SV.clima,"q5")}${bars("Físico",SV.fisico,"q6")}${bars("Deportividad",SV.deport,"q7")}${bars("¿Refleja el resultado lo ocurrido?",SV.refl,"q8")}${bars("Factor decisivo",SV.factor,"q9")}
    ${bars("Golpe con más confianza",SV.golpes.map(g=>g[1]),"q3_confianza")}${bars("Golpe con menos confianza",SV.golpes.map(g=>g[1]),"q3_menos_confianza")}</div>
    <h3 class="pf-h">Por partido</h3><div class="panel">${byMatch.length?byMatch.map(r=>{const m=getMatch(r.id); return `<div class="tline"><span>${esc(nm(m.a))} – ${esc(nm(m.b))} · ${esc(jLabel(m))}</span><b class="num">${r.c}/${r.n}</b></div>`;}).join(""):`<div class="empty">Aún no hay encuestas.</div>`}</div>`;
}

/* =====================================================================
   DIAGNÓSTICO DE AVISOS · botón «Probar avisos» en «Mi móvil»: dice exactamente dónde falla
   ===================================================================== */
function pushErrText(r){
  if(!r) return "sin respuesta del servidor";
  if(r.error==="no-session") return "no hay sesión iniciada";
  if(r.status===404) return "la función de avisos no está desplegada: falta api/push.js o package.json en GitHub";
  if(r.error==="vapid keys missing") return "faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en Vercel (o falta hacer Redeploy)";
  if(r.error==="vapid subject") return "VAPID_SUBJECT no es válido en Vercel: debe ser mailto:tucorreo@gmail.com";
  if(r.status===403) return "tu cuenta todavía no ha metido el PIN";
  if(r.ok&&!r.sent&&r.failed) return `el envío falló (${r.reason||"error"}). Si pone 403 o «UnauthorizedRegistration», la clave PUSH_KEY de config.js no coincide con VAPID_PUBLIC_KEY de Vercel`;
  if(r.ok&&!r.sent) return "este dispositivo no está en la lista de avisos: desactiva y vuelve a activar los avisos";
  return `error ${r.status||""} ${r.error||""}`.trim();
}
async function pushTest(out){
  if(!out) return;
  const L=[], line=(ok,t)=>{ L.push(`${ok?"✅":"❌"} ${t}`); out.innerHTML=L.map(esc).join("<br>"); };
  out.innerHTML="Comprobando…";
  const sup=Push.supported(); line(sup, sup?"Este navegador admite avisos":(isIOS()&&!isStandalone()?"En iPhone los avisos solo funcionan abriendo la app instalada desde su icono":"Este navegador no admite avisos"));
  if(!sup) return;
  const perm=Notification.permission; line(perm==="granted",`Permiso de avisos: ${perm==="granted"?"concedido":perm==="denied"?"bloqueado en los ajustes":"sin conceder"}`);
  const id=flag("am_push"); line(!!id,id?"Este dispositivo está registrado":"Este dispositivo no está registrado");
  if(perm!=="granted"||!id){ L.push("→ Activa los avisos y vuelve a probar."); out.innerHTML=L.map(esc).join("<br>"); return; }
  try{ const reg=await Push.getReg(); await reg.showNotification("🔔 Prueba local",{body:"Si ves esto, el móvil sí muestra los avisos de la app.",tag:"test-local",icon:"icon-192.png"}); line(true,"Aviso local enviado: debería aparecer ya"); }
  catch(err){ line(false,"El móvil no deja mostrar avisos: "+(err&&err.message||err)); }
  const r=await Push.notify({title:"🔔 Prueba desde el servidor",body:"Si ves esto, los avisos de la liga funcionan.",tag:"test-server"},{target:id});
  if(r&&r.ok&&r.sent>0) line(true,"Servidor: aviso enviado. Si no aparece en unos segundos, mira el modo No molestar / Concentración.");
  else line(false,"Servidor: "+pushErrText(r));
}
(function(){
  const _show=Onb.show.bind(Onb);
  Onb.show=function(only){
    _show(only); if(only) return;
    const card=document.querySelector("#onb .onb-card"); if(!card) return;
    const d=document.createElement("div"); d.className="ptest";
    d.innerHTML=`<button class="btn ghost" data-x="pushtest">🔔 Probar avisos</button><div class="ptest-out" id="ptest-out" role="status"></div>`;
    card.appendChild(d);
  };
  document.addEventListener("click",ev=>{ if(ev.target.closest('[data-x="pushtest"]')) pushTest(document.getElementById("ptest-out")); });
})();

/* =====================================================================
   ANÁLISIS DE RIVAL · informe de scouting a partir de sus encuestas
   Privacidad: solo cifras agregadas (colección survey_stats), nunca respuestas sueltas ni comentarios,
   y solo a partir de SC_MIN encuestas. Las reglas impiden leer las encuestas individuales.
   ===================================================================== */
const SC_MIN=2;
function statsAdd(cur,pid,ans,m,sid){
  const s=cur?JSON.parse(JSON.stringify(cur)):{n:0,w:0,l:0};
  s.n=(s.n||0)+1; s.w=s.w||0; s.l=s.l||0; s.last=sid||s.last||""; s.t=Date.now(); s.pid=pid;
  const inc=(k,v)=>{ if(!v) return; s[k]=s[k]||{}; s[k][v]=(s[k][v]||0)+1; };
  inc("q1",ans.q1); inc("q3a",ans.q3_confianza); inc("q3b",ans.q3_menos_confianza);
  inc("q4",ans.q4); inc("q5",ans.q5); inc("q6",ans.q6); inc("q8",ans.q8); inc("q9",ans.q9);
  const r=m&&result(m);
  if(r&&m.a&&m.b){
    const won=r.w===(m.a===pid?"a":"b"); won?s.w++:s.l++;
    const c=(k,v)=>{ if(!v) return; s[k]=s[k]||{}; s[k][v]=s[k][v]||{w:0,l:0}; s[k][v][won?"w":"l"]++; };
    c("c4",ans.q4); c("c5",ans.q5);
  }
  return s;
}
const SC_CACHE={};
async function scoutLoad(id){
  const d=await Store.db.collection("survey_stats").doc(id).get();
  SC_CACHE[id]={at:Date.now(),s:d.exists?d.data():null}; return SC_CACHE[id].s;
}
const SC_POS={ Saque:[96,10], Resto:[204,10], Derecha:[98,92], "Revés":[202,92], Globo:[150,58], Dejada:[150,180], Volea:[104,232], Remate:[196,224] };
const SC_TIP={
  Saque:"Mete presión al resto: su saque no le da confianza. Adelántate un paso.",
  Derecha:"Carga el juego a su derecha: es el golpe donde menos confía.",
  "Revés":"Juega cruzado y profundo a su revés: es su lado flojo.",
  Volea:"Hazle subir a la red con una dejada y pásale: no se siente cómodo voleando.",
  Dejada:"Quédate atrás sin miedo: casi no se fía de su dejada.",
  Globo:"Sube a la red cuando puedas: su globo no le da seguridad.",
  Remate:"Usa el globo alto: no se siente seguro rematando.",
  Resto:"Saca fuerte y juega el primer golpe: el resto es su punto flaco."
};
const SC_AVOID={
  Saque:"Su saque es su arma: resta con margen y alarga el punto.",
  Derecha:"Evita su derecha: es donde más confía.",
  "Revés":"Ojo con su revés: es su golpe de confianza.",
  Volea:"No le dejes subir a la red: ahí se siente fuerte.",
  Dejada:"Atento a la dejada: la usa con confianza. Juega más cerca de la línea.",
  Globo:"Si subes a la red, cuidado con su globo.",
  Remate:"No le regales globos cortos: remata con confianza.",
  Resto:"Varía el saque: resta con confianza."
};
function scAvg(map,scale){ let t=0,n=0; Object.entries(map||{}).forEach(([k,v])=>{ const i=scale.indexOf(k); if(i>=0){ t+=(i+1)*v; n+=v; } }); return n?t/n:null; }
function scTop(map){ const e=Object.entries(map||{}).sort((a,b)=>b[1]-a[1]); return e.length?e[0]:null; }
function scCourt(s,id,hand){
  const n=s.n, names=SV.golpes.map(g=>g[1]);
  const data=names.map(nmS=>{ const plus=(s.q3a||{})[nmS]||0, minus=(s.q3b||{})[nmS]||0; return {nmS,plus,minus,use:plus+minus,score:(plus-minus)/n}; });
  const maxUse=Math.max(1,...data.map(d=>d.use));
  const weak=data.filter(d=>d.minus>0).sort((a,b)=>b.minus-a.minus||a.score-b.score)[0];
  const X=x=>hand==="zurdo"?300-x:x;
  const fill=sc=>sc>=0.25?"var(--sc-good)":sc<=-0.25?"var(--sc-bad)":"var(--sc-mid)";
  const spots=data.map(d=>{ const [x0,y]=SC_POS[d.nmS]||[150,150], x=X(x0), r=d.use?12+15*Math.sqrt(d.use/maxUse):9;
    const isWeak=weak&&weak.nmS===d.nmS;
    return `<g class="sc-spot${d.use?"":" off"}">
      ${isWeak?`<circle cx="${x}" cy="${y}" r="${(r+9).toFixed(1)}" class="sc-target"/><circle cx="${x}" cy="${y}" r="${(r+9).toFixed(1)}" class="sc-target t2"/>`:""}
      <circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${d.use?fill(d.score):"rgba(255,255,255,.18)"}" class="sc-dot"/>
      <text x="${x}" y="${y+4}" class="sc-lbl">${esc(d.nmS)}</text>
      ${d.use?`<text x="${x}" y="${(y+r+12).toFixed(1)}" class="sc-cnt">+${d.plus} / −${d.minus}</text>`:""}
    </g>`; }).join("");
  const target=weak?(()=>{ const [x0,y]=SC_POS[weak.nmS]; const x=X(x0); return `<g class="sc-aim"><line x1="150" y1="430" x2="${x}" y2="${y+6}" /><text x="150" y="452" class="sc-aimtxt">🎯 Ataca aquí: ${esc(weak.nmS)}</text></g>`; })():"";
  return `<svg class="sc-court" viewBox="0 -26 300 526" role="img" aria-label="Mapa de confianza por golpe">
    <defs><linearGradient id="scClay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2693C"/><stop offset="1" stop-color="#B4532C"/></linearGradient>
      <pattern id="scGrain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="rgba(255,255,255,.06)"/><circle cx="4" cy="4" r=".5" fill="rgba(0,0,0,.08)"/></pattern></defs>
    <rect x="6" y="-20" width="288" height="514" rx="10" fill="url(#scClay)"/><rect x="6" y="-20" width="288" height="514" rx="10" fill="url(#scGrain)"/>
    <rect x="6" y="250" width="288" height="244" fill="rgba(4,14,40,.38)"/>
    <g class="sc-lines"><rect x="40" y="40" width="220" height="420"/><line x1="62" y1="40" x2="62" y2="460"/><line x1="238" y1="40" x2="238" y2="460"/>
      <line x1="62" y1="142" x2="238" y2="142"/><line x1="62" y1="358" x2="238" y2="358"/><line x1="150" y1="142" x2="150" y2="358"/>
      <line x1="150" y1="40" x2="150" y2="46"/><line x1="150" y1="454" x2="150" y2="460"/></g>
    <line x1="28" y1="250" x2="272" y2="250" class="sc-net"/><text x="150" y="268" class="sc-side">RED</text>
    <text x="150" y="400" class="sc-side big">TU CAMPO</text>
    ${target}${spots}
  </svg>`;
}
function scoutHtml(id,s){
  const p=P[id], hand=localStorage.getItem("am_hand_"+id)||"diestro";
  const head=`<div class="sc-head" style="--c:${p.color}"><img src="${IMG(id)}" alt="" class="sc-av"><div><div class="sc-kick">Informe de scouting</div><h2 class="sc-name">${esc(p.name)}</h2><div class="sc-nick">“${esc(p.nick||"")}”</div></div></div>`;
  if(!s||(s.n||0)<SC_MIN) return head+`<div class="sc-locked"><div class="sc-lock">🔒</div><b>Todavía no hay datos suficientes</b><p>El informe se abre con ${SC_MIN} encuestas respondidas. ${esc(p.first)} lleva ${(s&&s.n)||0}. Así nadie puede deducir qué contestó en un partido concreto.</p></div>`;
  const n=s.n, sa=scTop(s.q3a), sb=scTop(s.q3b);
  const fis=scAvg(s.q6,SV.fisico), self=scAvg(s.q1,SV.scale5perf);
  const fac=scTop(s.q9), real=["Bastante","Totalmente"].reduce((t,k)=>t+((s.q8||{})[k]||0),0)/n;
  const cond=["c4","c5"].flatMap(k=>Object.entries(s[k]||{}).map(([v,r])=>({v,k,w:r.w,l:r.l,g:r.w+r.l,pct:r.w/Math.max(1,r.w+r.l)}))).filter(c=>c.g>=1);
  const best=cond.filter(c=>c.w>0).sort((a,b)=>b.pct-a.pct||b.g-a.g)[0], worst=cond.filter(c=>c.l>0).sort((a,b)=>a.pct-b.pct||b.g-a.g)[0];
  const pct=x=>Math.round(x/n*100)+"%";
  const gauge=(v,lbl)=>{ const w=v?((v-1)/4*100):0; return `<div class="sc-gauge"><div class="sc-gtrack"><i style="--x:${w.toFixed(0)}%"></i></div><div class="sc-gv"><b>${v?v.toFixed(1):"–"}</b>/5 · ${esc(lbl)}</div></div>`; };
  const fisL=v=>!v?"":v>=4.3?"Llega muy fino":v>=3.5?"Llega bien":v>=2.7?"Normal":"Suele llegar justo";
  const selfL=v=>!v?"":v>=4?"Se ve fuerte":v>=3?"Equilibrado":"Muy autocrítico";
  const plan=[sb?SC_TIP[sb[0]]:"", sa?SC_AVOID[sa[0]]:"", worst?`Le cuesta con ${worst.v.toLowerCase()} (${worst.w}-${worst.l}).`:"", fis&&fis<3?"Alarga los puntos: físicamente suele llegar justo.":""].filter(Boolean);
  const bars=SV.golpes.map(g=>g[1]).map(k=>{ const pl=(s.q3a||{})[k]||0, mi=(s.q3b||{})[k]||0;
    return `<div class="sc-brow"><span class="sc-bl">${mi?`<i style="width:${(mi/n*100).toFixed(0)}%"></i>`:""}<em>${mi||""}</em></span><b>${esc(k)}</b><span class="sc-br">${pl?`<i style="width:${(pl/n*100).toFixed(0)}%"></i>`:""}<em>${pl||""}</em></span></div>`; }).join("");
  const facBars=Object.entries(s.q9||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="vbar"><span>${esc(k)}</span><div class="vtrack"><span style="width:${(v/n*100).toFixed(0)}%;background:var(--sc-accent)"></span></div><b class="num">${pct(v)}</b></div>`).join("");
  return head
   +`<div class="sc-meta"><span>📋 ${n} encuestas</span><span>🏆 ${s.w||0}V · ${s.l||0}D</span>
      <button class="sc-hand" data-x="scouthand" data-id="${id}">✋ ${hand==="zurdo"?"Zurdo":"Diestro"} <small>(cambiar)</small></button></div>`
   +`<div class="sc-grid">
      <div class="sc-card sc-courtbox">${scCourt(s,id,hand)}
        <div class="sc-legend"><span><i style="background:var(--sc-good)"></i>Confía</span><span><i style="background:var(--sc-mid)"></i>Depende</span><span><i style="background:var(--sc-bad)"></i>Le cuesta</span><span class="mini">Tamaño = cuántas veces lo nombra</span></div>
      </div>
      <div class="sc-side-cards">
        <div class="sc-card good"><div class="sc-k">Arma principal</div><div class="sc-v">${sa?esc(sa[0]):"–"}</div><div class="sc-s">${sa?`La elige como golpe de confianza en el ${pct(sa[1])} de sus partidos`:""}</div></div>
        <div class="sc-card bad"><div class="sc-k">Punto débil</div><div class="sc-v">${sb?esc(sb[0]):"–"}</div><div class="sc-s">${sb?`Lo señala como su peor golpe en el ${pct(sb[1])} de sus partidos`:""}</div></div>
        <div class="sc-card plan"><div class="sc-k">🧠 Plan de partido</div><ul>${plan.map(t=>`<li>${esc(t)}</li>`).join("")||"<li>Sin pistas claras todavía.</li>"}</ul></div>
      </div>
    </div>`
   +`<div class="sc-grid3">
      <div class="sc-card"><div class="sc-k">💪 Físico</div>${gauge(fis,fisL(fis))}</div>
      <div class="sc-card"><div class="sc-k">🪞 Cómo se ve</div>${gauge(self,selfL(self))}</div>
      <div class="sc-card"><div class="sc-k">⚖️ ¿Acepta el resultado?</div><div class="sc-v sm">${Math.round(real*100)}%</div><div class="sc-s">de las veces cree que el marcador refleja lo jugado${real<0.5?" · tiende a buscar excusas 😉":""}</div></div>
    </div>`
   +`<div class="sc-grid2">
      <div class="sc-card"><div class="sc-k">Golpes · <span class="bad-t">le cuesta</span> vs <span class="good-t">confía</span></div><div class="sc-bars">${bars}</div></div>
      <div class="sc-card"><div class="sc-k">🔑 Qué decide sus partidos</div>${facBars||"<div class='mini'>Sin datos</div>"}
        <div class="sc-k" style="margin-top:14px">🌦️ Condiciones</div>
        <div class="sc-cond">${best?`<div class="good"><b>Rinde mejor</b><span>${esc(best.v)}</span><em>${best.w}-${best.l}</em></div>`:""}${worst?`<div class="bad"><b>Sufre con</b><span>${esc(worst.v)}</span><em>${worst.w}-${worst.l}</em></div>`:""}${!best&&!worst?"<div class='mini'>Aún sin partidos con resultado</div>":""}</div>
      </div>
    </div>`
   +`<p class="sc-foot">Basado en lo que ${esc(p.first)} responde en sus propias encuestas. Solo cifras agregadas: nunca se muestran respuestas sueltas ni comentarios. El mapa sitúa cada golpe en su zona habitual de la pista; no registra posiciones reales.</p>`;
}
async function openScout(id){
  S.modal=()=>openScout(id);
  const cached=SC_CACHE[id];
  showModal(`<div class="sheet-body sc" id="sc-body">${cached?scoutHtml(id,cached.s):`<div class="empty">Preparando el informe…</div>`}</div>`);
  if(!cached||Date.now()-cached.at>60000){
    try{ const s=await scoutLoad(id); const b=document.getElementById("sc-body"); if(b) b.innerHTML=scoutHtml(id,s); }
    catch(e){ console.error(e); const b=document.getElementById("sc-body"); if(b) b.innerHTML=`<div class="empty">No se pudo cargar el informe${isPerm(e)?": falta publicar las reglas nuevas de Firebase":""}.</div>`; }
  }
}
document.addEventListener("click",ev=>{
  const a=ev.target.closest('[data-x="scout"]'); if(a){ openScout(a.dataset.id); return; }
  const h=ev.target.closest('[data-x="scouthand"]'); if(h){ const id=h.dataset.id, k="am_hand_"+id; localStorage.setItem(k,(localStorage.getItem(k)||"diestro")==="zurdo"?"diestro":"zurdo"); const b=document.getElementById("sc-body"); if(b&&SC_CACHE[id]) b.innerHTML=scoutHtml(id,SC_CACHE[id].s); }
});
/* Organizador: recalcular las cifras de todos a partir de TODAS las encuestas respondidas (incluye las antiguas) */
async function scoutRebuild(btn){
  if(!Store.isAdmin) return;
  if(!confirm("¿Recalcular el análisis de rival con todas las encuestas respondidas, también las antiguas? Avisa antes al grupo.")) return;
  btn.disabled=true; btn.textContent="Recalculando…";
  try{
    const snap=await Store.db.collection("surveys").get();
    const by={}; snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==="completed"&&x.answers)
      .sort((a,b)=>(a.sentAt||0)-(b.sentAt||0)).forEach(x=>{ by[x.playerId]=statsAdd(by[x.playerId]||null,x.playerId,x.answers,getMatch(x.matchId),x.id); });
    for(const p of PLAYERS){ await Store.db.collection("survey_stats").doc(p.id).set(by[p.id]||{n:0,w:0,l:0,pid:p.id,t:Date.now(),last:""}); delete SC_CACHE[p.id]; }
    toast("Análisis de rival recalculado"); btn.textContent="✓ Recalculado";
  }catch(e){ console.error(e); btn.disabled=false; btn.textContent="🔄 Recalcular análisis de rival"; toast(isPerm(e)?"Sin permiso: publica las reglas nuevas":"No se pudo recalcular"); }
}
document.addEventListener("click",ev=>{ const b=ev.target.closest('[data-x="scoutrebuild"]'); if(b) scoutRebuild(b); });

window.Features={statsAdd,scoutHtml,openScout,Push,Onb,alertsData,alertMsg,buildICS,googleCal,drawPoster,evoData,rivalryHtml,recordsHtml,diffEvent,logText,pushPlan,pushTest,daysLeftAt};
schedule();
})();
