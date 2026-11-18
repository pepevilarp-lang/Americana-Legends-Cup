/* =====================================================================
   AGENDA INTELIGENTE · pantalla
   1) Tres preguntas (días, franjas, excepciones) → avail/<jugador>
   2) El motor (agenda-core.js) cruza las dos agendas y propone huecos
   3) Cada jugador marca «me va bien»; cuando coinciden, la fecha se fija sola
      (Store.setMatch → aviso automático a los dos) → plans/<partido>
   Si las reglas de Firestore aún no permiten estas colecciones, la app sigue
   funcionando igual y la agenda simplemente no aparece.
   ===================================================================== */
"use strict";
(function(){
const AC=window.AgendaCore; if(!AC) return;
const FR=AC.FRANJAS;
const WEEK=[1,2,3,4,5,6,0];                          // lunes primero
const LETTER={1:"L",2:"M",3:"X",4:"J",5:"V",6:"S",0:"D"};

const Agenda={ avail:{}, plans:{}, blocked:false, ready:false, unsubs:[] };
window.Agenda=Agenda;

/* ---------- Datos ---------- */
function loadLocal(){ try{ Agenda.avail=JSON.parse(localStorage.getItem("am_avail")||"{}"); Agenda.plans=JSON.parse(localStorage.getItem("am_plans")||"{}"); }catch(e){} }
function saveLocal(){ try{ localStorage.setItem("am_avail",JSON.stringify(Agenda.avail)); localStorage.setItem("am_plans",JSON.stringify(Agenda.plans)); }catch(e){} }
function start(){
  if(Agenda.ready) return;
  if(Store.local||!Store.db){ loadLocal(); Agenda.ready=true; Store.bump(); return; }
  if(!Store.listening) return;
  Agenda.ready=true;
  const on=(col,target)=>Store.db.collection(col).onSnapshot(snap=>{
    snap.docChanges().forEach(c=>{ if(c.type==="removed") delete Agenda[target][c.doc.id]; else Agenda[target][c.doc.id]=c.doc.data(); });
    Agenda.blocked=false; afterSync(); Store.bump();
  }, err=>{ console.warn("Agenda:",err&&err.code); Agenda.blocked=true; Store.bump(); });   // sin reglas publicadas: se oculta, no bloquea la app
  Agenda.unsubs=[on("avail","avail"),on("plans","plans")];
}
setInterval(start,700);

async function saveAvail(av){
  const me=myId(); if(!me) return false;
  av={days:av.days,wk:av.wk,we:av.we,marks:av.marks||{},at:Date.now()};
  Agenda.avail[me]=av;
  if(!Store.db){ saveLocal(); Store.bump(); return true; }
  try{ await Store.db.collection("avail").doc(me).set(av); Store.bump(); return true; }
  catch(e){ console.warn(e); toast("No se pudo guardar tu agenda"); return false; }
}
async function savePicks(mid,list){
  const me=myId(); if(!me) return false;
  const p=Agenda.plans[mid]||{picks:{}}; p.picks={...(p.picks||{}),[me]:list}; p.at=Date.now(); Agenda.plans[mid]=p;
  if(!Store.db){ saveLocal(); Store.bump(); return true; }
  try{ await Store.db.collection("plans").doc(mid).set({picks:{[me]:list},at:Date.now()},{merge:true}); return true; }
  catch(e){ console.warn(e); toast("No se pudo guardar"); return false; }
}

/* ---------- Ayudas ---------- */
const myId=()=>{ const id=Store.myPlayer||S.me; return P[id]?id:null; };
const nowHour=()=>{ const d=new Date(); return d.getHours()+d.getMinutes()/60; };
const filled=id=>AC.filled(Agenda.avail[id]);
const allMatches=()=>FIXTURE.map(f=>getMatch(f.id));
function busyMap(exceptId){
  const b={}; allMatches().forEach(m=>{ if(m.id===exceptId||!m.date) return; [m.a,m.b].forEach(p=>{ (b[p]=b[p]||[]).push(m.date); }); }); return b;
}
function windowOf(m){ const f=FX[m.id]; if(!f) return null; const [s,e]=JORNADAS[f.j-1]; return {start:s,end:e,j:f.j}; }
function plannerData(m){
  const w=windowOf(m); if(!w) return null;
  const r=AC.suggest({a:m.a,b:m.b,avA:Agenda.avail[m.a],avB:Agenda.avail[m.b],today:today(),nowHour:nowHour(),
    winStart:w.start,winEnd:w.end,busy:busyMap(m.id),prefTime:AC.prefTimes(allMatches().filter(x=>x.time),m.a,m.b),max:4});
  return {w,r};
}
/* Partidos sin fecha que ya se pueden jugar (jornada en curso o aplazados) */
function toPlan(pid){
  const t=today();
  return FIXTURE.filter(f=>(f.a===pid||f.b===pid)&&JORNADAS[f.j-1][0]<=t).map(f=>getMatch(f.id))
    .filter(m=>!result(m)&&m.status!=="live"&&!m.date).sort((x,y)=>x.j-y.j);
}
const picksOf=(mid,pid)=>((Agenda.plans[mid]&&Agenda.plans[mid].picks&&Agenda.plans[mid].picks[pid])||[]).filter(k=>k.split("|")[0]>=today());

/* ---------- Cierre automático cuando coinciden ---------- */
const closing={};
function afterSync(){
  const me=myId(); if(!me) return;
  toPlan(me).forEach(m=>{ const k=AC.agreed(Agenda.plans[m.id],m.a,m.b,today()); if(k) closeMatch(m.id,k); });
}
async function closeMatch(mid,key){
  if(closing[mid]) return; const m=getMatch(mid); if(m.date||result(m)) return;
  closing[mid]=true;
  const [date,time]=key.split("|"); const base={...(Store.matches[mid]||{})};
  const ok=await Store.setMatch(mid,{...base,date,time});
  if(ok){ toast(`✅ Partido cerrado: ${AC.label(key)}`); celebrate(); }
  setTimeout(()=>{ delete closing[mid]; },4000);
}
function celebrate(){
  const c=document.createElement("div"); c.className="ag-confetti"; c.innerHTML=Array.from({length:28},(_,i)=>`<i style="--x:${Math.random()*100}vw;--d:${(Math.random()*.6).toFixed(2)}s;--r:${Math.round(Math.random()*720-360)}deg;--c:${["#E3FF3B","#3E86E8","#fff","#14A06A","#F3C64E"][i%5]}"></i>`).join("");
  document.body.appendChild(c); setTimeout(()=>c.remove(),2600);
}

/* ---------- Avisos al rival ---------- */
const pushT={};
function notifyRival(mid,me){
  clearTimeout(pushT[mid]);
  pushT[mid]=setTimeout(()=>{
    const m=getMatch(mid), riv=m.a===me?m.b:m.a, list=picksOf(mid,me); if(!list.length||typeof Push==="undefined") return;
    if(AC.agreed(Agenda.plans[mid],m.a,m.b,today())) return;   // ya cerrado: avisa el cambio de fecha
    const first=AC.label(list.slice().sort()[0]);
    Push.notify({title:`📅 ${nm(me)} propone fecha`,body:`Para vuestro partido de la J${m.j}: ${first}${list.length>1?` (y ${list.length-1} más)`:""}. Toca para responder.`,url:`./#agenda-${mid}`,tag:"plan-"+mid},{only:[riv]});
  },5000);
}
function askRival(mid){
  const me=myId(), m=getMatch(mid), riv=m.a===me?m.b:m.a, k="am_agask_"+mid+"_"+today();
  if(localStorage.getItem(k)){ toast(`Ya se lo has pedido hoy a ${nm(riv)}`); return; }
  localStorage.setItem(k,"1");
  if(typeof Push!=="undefined") Push.notify({title:`🗓️ ${nm(me)} quiere cuadrar vuestro partido`,body:"Rellena tu agenda (3 preguntas, 30 segundos) y la app os busca hueco.",url:"./#agenda",tag:"ag-ask-"+mid},{only:[riv]});
  toast(`Aviso enviado a ${nm(riv)}`);
}

/* ---------- Planificador (tarjeta de un partido) ---------- */
function slotBtn(mid,key,{mine,riv,rivName,note,cls=""}){
  const [d,t]=key.split("|");
  return `<button class="ag-slot ${mine?"on":""} ${riv?"riv":""} ${cls}" data-ag-pick="${mid}" data-key="${esc(key)}" aria-pressed="${mine?"true":"false"}">
    <span class="ag-d">${esc(AC.fmtDay(d))}</span><span class="ag-t">${esc(t)}</span>
    <span class="ag-who">${mine?"✓ Tú":""}${mine&&riv?" · ":""}${riv?"✓ "+esc(rivName):""}${!mine&&!riv&&note?esc(note):""}</span></button>`;
}
function planner(m,{compact}={}){
  const me=myId(), isPlayer=me&&(m.a===me||m.b===me), riv=isPlayer?(m.a===me?m.b:m.a):null;
  const pd=plannerData(m); if(!pd) return "";
  const {w,r}=pd, mine=isPlayer?picksOf(m.id,me):[], rivPicks=riv?picksOf(m.id,riv):[];
  const daysLeft=AC.diff(today(),w.end);
  const head=`<div class="ag-head">${av(m.a,"sm")}<b>${esc(nm(m.a))}</b><span>vs</span><b>${esc(nm(m.b))}</b>${av(m.b,"sm")}
    <em class="${r.late?"late":daysLeft<=2?"warn":""}">J${w.j} · ${r.late?"aplazado":daysLeft===0?"último día":`quedan ${daysLeft} días`}</em></div>`;
  let body="";
  if(isPlayer&&!filled(me)){
    body=`<p class="ag-msg">Contesta 3 preguntas y la app te busca hueco con ${esc(nm(riv))}.</p><button class="btn ball ag-cta" data-ag-wizard>🗓️ Montar mi agenda (30 s)</button>`;
  } else {
    const rivName=riv?nm(riv):"";
    const keys=new Set(), chips=[];
    const push=(key,o)=>{ if(keys.has(key)) return; keys.add(key); chips.push(slotBtn(m.id,key,{mine:mine.includes(key),riv:rivPicks.includes(key),rivName,...o})); };
    let msg="";
    if(r.status==="ok"){ msg=isPlayer?`<b>Os va bien a los dos</b>. Marca los que te encajen: en cuanto coincidáis, el partido queda cerrado.`:`Huecos que les van bien a los dos:`; r.slots.forEach(s=>push(s.key,{cls:s.outside?"out":""})); }
    else if(r.status==="needsAvail"){ const who=r.missing.filter(p=>p!==me); msg=`${who.map(p=>esc(nm(p))).join(" y ")} aún no ${who.length>1?"han":"ha"} rellenado su agenda.${r.pending.length&&isPlayer?" Te van bien:":""}`; r.pending.forEach(s=>push(s.key,{note:`falta ${nm(s.waiting)}`})); }
    else { msg=`<b>No coincidís</b> ${r.late?"en las próximas dos semanas":"en lo que queda de jornada"}. Lo más cerca:`; r.near.forEach(s=>push(s.key,{note:`${nm(s.cant)} no suele poder`,cls:"near"})); }
    rivPicks.forEach(k=>push(k,{}));            // lo que ha propuesto el rival, aunque no salga en la lista
    mine.forEach(k=>push(k,{}));
    const outside=r.slots.some(s=>s.outside)?`<p class="ag-note">⚠️ Fuera del plazo de la jornada: contará como aplazado.</p>`:"";
    body=`<p class="ag-msg">${msg}</p><div class="ag-slots">${chips.join("")||`<p class="ag-note">Sin propuestas todavía.</p>`}</div>${outside}`;
    if(isPlayer) body+=`<div class="ag-actions"><button class="btn ghost sm" data-ag-custom="${m.id}">＋ Otra fecha</button>${r.missing.includes(riv)?`<button class="btn ghost sm" data-ag-ask="${m.id}">🔔 Pedírselo a ${esc(rivName)}</button>`:""}<button class="btn ghost sm" data-ag-wizard>Mi agenda</button></div>
      <div class="ag-customf hidden" id="agc-${m.id}"><input type="date" min="${today()}" aria-label="Día"><input type="time" value="${AC.FK[r.slots[0]?r.slots[0].f:"n"].def}" aria-label="Hora"><button class="btn ball sm" data-ag-addc="${m.id}">Proponer</button></div>`;
  }
  return `<div class="ag-card${compact?" compact":""}" id="ag-${m.id}">${compact?"":head}${body}</div>`;
}

/* Tarjeta en «Hoy»: mis partidos por cuadrar */
function hoyCard(){
  const me=myId(); if(!me||!Agenda.ready||Agenda.blocked) return "";
  const list=toPlan(me);
  if(!list.length){
    if(filled(me)) return "";
    return `<section class="ag-wrap"><div class="ag-intro"><div><small>Nuevo</small><b>Agenda inteligente</b><span>3 preguntas y la app cuadra tus partidos con tu rival.</span></div><button class="btn ball" data-ag-wizard>Empezar</button></div></section>`;
  }
  return `<section class="ag-wrap"><h2>🗓️ Partidos por cuadrar</h2>${list.map(m=>planner(m)).join("")}</section>`;
}
const vHoyPrev=VIEWS.hoy;
VIEWS.hoy=function(){ const base=vHoyPrev(); const card=hoyCard(); if(!card) return base; const k=base.indexOf("</section>"); return k>=0?base.slice(0,k+10)+card+base.slice(k+10):card+base; };

/* Dentro de la ficha del partido */
const openMatchPrev=window.openMatch;
window.openMatch=function(id){
  openMatchPrev(id);
  const m=getMatch(id); if(!Agenda.ready||Agenda.blocked||!m||!m.a||!m.b||m.date||result(m)||m.status==="live"||!FX[id]) return;
  const h3=[...document.querySelectorAll("#modal .sheet-body h3")].find(x=>/Gestionar partido/.test(x.textContent));
  const html=`<h3 style="margin-top:16px">🗓️ Agenda inteligente</h3>${planner(m,{compact:true})}`;
  if(h3) h3.insertAdjacentHTML("beforebegin",html); else { const sb=document.querySelector("#modal .sheet-body"); if(sb) sb.insertAdjacentHTML("beforeend",html); }
};
function refreshModal(){ if(S.modal&&document.getElementById("modal").innerHTML) S.modal(); }

/* ---------- Asistente de 3 preguntas ---------- */
let WZ=null;
function openWizard(){
  const me=myId(); if(!me){ toast("Primero elige quién eres"); return; }
  const cur=Agenda.avail[me]||{};
  WZ={step:0,days:new Set(cur.days||[]),wk:new Set(cur.wk||[]),we:new Set(cur.we||[]),marks:{...(cur.marks||{})}};
  const el=document.createElement("div"); el.id="agw"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Tu agenda");
  document.body.appendChild(el); document.body.classList.add("agw-on"); drawWizard();
}
function closeWizard(){ const el=document.getElementById("agw"); if(el) el.remove(); document.body.classList.remove("agw-on"); WZ=null; }
function drawWizard(){
  const el=document.getElementById("agw"); if(!el||!WZ) return;
  const s=WZ.step, steps=3;
  const dots=`<div class="agw-dots">${[0,1,2].map(i=>`<i class="${i<=s?"on":""}"></i>`).join("")}</div>`;
  let h="";
  if(s===0){
    h=`<small class="agw-k">Pregunta 1 de 3</small><h2>¿Qué días sueles poder jugar?</h2><p>Lo normal de una semana cualquiera. Luego podrás marcar excepciones.</p>
      <div class="agw-days">${WEEK.map(d=>`<button class="agw-day ${WZ.days.has(d)?"on":""}" data-agw-day="${d}" aria-pressed="${WZ.days.has(d)}"><b>${LETTER[d]}</b><span>${AC.DIAS[d]}</span></button>`).join("")}</div>
      <div class="agw-quick"><button data-agw-preset="wk">Entre semana</button><button data-agw-preset="we">Fines de semana</button><button data-agw-preset="all">Cualquier día</button></div>`;
  } else if(s===1){
    const hasWk=[...WZ.days].some(d=>d>=1&&d<=5), hasWe=WZ.days.has(0)||WZ.days.has(6);
    const row=(g,title)=>`<div class="agw-row"><b>${title}</b><div class="agw-fr">${FR.map(f=>`<button class="agw-f ${WZ[g].has(f.k)?"on":""}" data-agw-f="${g}:${f.k}" aria-pressed="${WZ[g].has(f.k)}"><span>${f.label}</span><small>${f.hint}</small></button>`).join("")}</div></div>`;
    h=`<small class="agw-k">Pregunta 2 de 3</small><h2>¿A qué horas?</h2><p>Marca todas las franjas que te suelan encajar.</p>${hasWk?row("wk","Entre semana"):""}${hasWe?row("we","Fin de semana"):""}`;
  } else {
    const t=today(), dowT=AC.dow(t), monday=AC.addDays(t,-((dowT+6)%7)), cells=[];
    const myDates=new Set(allMatches().filter(m=>m.date&&(m.a===myId()||m.b===myId())).map(m=>m.date));
    for(let i=0;i<35;i++){ const d=AC.addDays(monday,i), past=d<t, mk=WZ.marks[d], wd=AC.dow(d);
      const usual=WZ.days.has(wd)&&((AC.isWeekend(d)?WZ.we:WZ.wk).size>0);
      cells.push(`<button class="agw-c ${past?"past":""} ${mk==="no"?"no":mk==="si"?"si":usual?"usual":""} ${d===t?"today":""}" ${past?"disabled":""} data-agw-c="${d}" aria-label="${AC.fmtDay(d)}"><span>${+d.slice(8)}</span>${myDates.has(d)?"<i>🎾</i>":""}</button>`); }
    h=`<small class="agw-k">Pregunta 3 de 3</small><h2>¿Algún día especial?</h2><p>Toca un día para marcar <b class="no">✕ no puedo</b> (viajes, cenas…) o, si no es tu día habitual, <b class="si">✓ ese día puedo</b>.</p>
      <div class="agw-cal"><div class="agw-wd">${WEEK.map(d=>`<span>${LETTER[d]}</span>`).join("")}</div><div class="agw-grid">${cells.join("")}</div></div>
      <div class="agw-legend"><span class="usual">Habitual</span><span class="no">No puedo</span><span class="si">Puedo seguro</span></div>`;
  }
  const can = s===0?WZ.days.size>0 : s===1?(WZ.wk.size+WZ.we.size)>0 : true;
  el.innerHTML=`<div class="agw-box"><button class="agw-x" data-agw-close aria-label="Cerrar">×</button>${dots}<div class="agw-body">${h}</div>
    <div class="agw-nav">${s>0?`<button class="btn ghost" data-agw-back>Atrás</button>`:"<span></span>"}<button class="btn ball" data-agw-next ${can?"":"disabled"}>${s<steps-1?"Siguiente":"Guardar mi agenda"}</button></div></div>`;
}
async function finishWizard(){
  const me=myId(); if(!me||!WZ) return;
  const days=[...WZ.days];
  const hasWk=days.some(d=>d>=1&&d<=5), hasWe=days.includes(0)||days.includes(6);
  const marks={}; Object.entries(WZ.marks).forEach(([d,v])=>{ if(d>=today()&&(v==="no"||v==="si")) marks[d]=v; });
  const ok=await saveAvail({days,wk:hasWk?[...WZ.wk]:[],we:hasWe?[...WZ.we]:[],marks});
  if(!ok) return;
  const pend=toPlan(me), found=pend.map(m=>plannerData(m)).filter(Boolean).filter(x=>x.r.status==="ok").length;
  const el=document.getElementById("agw");
  if(el) el.innerHTML=`<div class="agw-box agw-done"><div class="agw-check">✓</div><h2>¡Agenda lista!</h2>
    <p>${pend.length?(found?`Ya hay hueco común en ${found} de tus ${pend.length} partido${pend.length>1?"s":""} por cuadrar.`:"Ahora toca que tus rivales rellenen la suya: les puedes avisar desde tu partido."):"Cuando tengas un partido por cuadrar, la app te propondrá los huecos."}</p>
    <button class="btn ball" data-agw-close>${pend.length?"Ver propuestas":"Hecho"}</button></div>`;
  celebrate();
}

/* ---------- Eventos ---------- */
document.addEventListener("click",async e=>{
  const t=e.target;
  if(t.closest("[data-ag-wizard]")){ e.preventDefault(); openWizard(); return; }
  if(document.getElementById("agw")){
    if(t.closest("[data-agw-close]")||t.id==="agw"){ closeWizard(); Store.bump(); return; }
    const d=t.closest("[data-agw-day]"); if(d){ const v=+d.dataset.agwDay; WZ.days.has(v)?WZ.days.delete(v):WZ.days.add(v); drawWizard(); return; }
    const p=t.closest("[data-agw-preset]"); if(p){ const k=p.dataset.agwPreset; WZ.days=new Set(k==="wk"?[1,2,3,4,5]:k==="we"?[6,0]:[0,1,2,3,4,5,6]); drawWizard(); return; }
    const f=t.closest("[data-agw-f]"); if(f){ const [g,k]=f.dataset.agwF.split(":"); WZ[g].has(k)?WZ[g].delete(k):WZ[g].add(k); drawWizard(); return; }
    const c=t.closest("[data-agw-c]"); if(c&&!c.disabled){ const dd=c.dataset.agwC, cur=WZ.marks[dd]; WZ.marks[dd]=cur==="no"?"si":cur==="si"?undefined:"no"; if(!WZ.marks[dd]) delete WZ.marks[dd]; drawWizard(); return; }
    if(t.closest("[data-agw-back]")){ WZ.step=Math.max(0,WZ.step-1); drawWizard(); return; }
    if(t.closest("[data-agw-next]")){ if(WZ.step<2){ WZ.step++; drawWizard(); } else await finishWizard(); return; }
    return;
  }
  const pk=t.closest("[data-ag-pick]");
  if(pk){
    const me=myId(), mid=pk.dataset.agPick, m=getMatch(mid); if(!me||(m.a!==me&&m.b!==me)){ toast("Solo pueden elegir los dos jugadores del partido"); return; }
    const key=pk.dataset.key, list=picksOf(mid,me); const i=list.indexOf(key); i>=0?list.splice(i,1):list.push(key);
    if(await savePicks(mid,list.slice(0,12))){
      const k=AC.agreed(Agenda.plans[mid],m.a,m.b,today());
      if(k) closeMatch(mid,k); else if(i<0){ toast(`Propuesto. Avisamos a ${nm(m.a===me?m.b:m.a)}`); notifyRival(mid,me); }
      Store.bump(); refreshModal();
    }
    return;
  }
  const cu=t.closest("[data-ag-custom]"); if(cu){ const box=document.getElementById("agc-"+cu.dataset.agCustom); if(box) box.classList.toggle("hidden"); return; }
  const ad=t.closest("[data-ag-addc]");
  if(ad){
    const mid=ad.dataset.agAddc, box=document.getElementById("agc-"+mid), [di,ti]=box.querySelectorAll("input");
    if(!di.value||!ti.value){ toast("Elige día y hora"); return; }
    if(di.value<today()){ toast("Esa fecha ya ha pasado"); return; }
    const me=myId(), list=picksOf(mid,me), key=`${di.value}|${ti.value}`; if(!list.includes(key)) list.push(key);
    if(await savePicks(mid,list.slice(0,12))){ const m=getMatch(mid), k=AC.agreed(Agenda.plans[mid],m.a,m.b,today()); if(k) closeMatch(mid,k); else { toast("Propuesta enviada"); notifyRival(mid,me); } Store.bump(); refreshModal(); }
    return;
  }
  const ask=t.closest("[data-ag-ask]"); if(ask){ askRival(ask.dataset.agAsk); return; }
});

/* ---------- Ventana de bienvenida: «Mira aquí… olvida los aplazamientos» ----------
   Sale a quien aún no ha rellenado su agenda: como mucho una vez al día y 3 veces en total.
   ?agpop=1 en la URL la fuerza para probarla. */
function maybePopup(){
  const me=myId(); if(!me||!Agenda.ready||Agenda.blocked||filled(me)) return false;
  if(document.getElementById("gate")||document.getElementById("recap")||document.getElementById("agw")||document.getElementById("agp")||document.body.classList.contains("mo")) return false;
  let n=0, last=""; try{ n=+localStorage.getItem("am_agpop_n")||0; last=localStorage.getItem("am_agpop_d")||""; }catch(e){}
  const force=(location.search.match(/[?&]agpop=(\d)/)||[])[1];
  if(force){ n=+force-1; } else if(n>=3||last===today()) return true;
  try{ localStorage.setItem("am_agpop_n",n+1); localStorage.setItem("am_agpop_d",today()); }catch(e){}
  /* El gancho: el neuralizador, con destello */
  const V={img:"img/agenda-pop2.webp",pos:"center 38%",kick:"Mira aquí 👆",title:"A partir de ahora, olvida los aplazamientos",stamp:"¡FLASH!",flash:true};
  const el=document.createElement("div"); el.id="agp"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Agenda inteligente");
  el.innerHTML=`${V.flash?'<div class="agp-flash" aria-hidden="true"></div>':""}<div class="agp-box"><button class="agw-x" data-agp-close aria-label="Cerrar">×</button>
    <div class="agp-img"><img src="${V.img}" alt="" style="object-position:${V.pos}"><span class="agp-stamp">${V.stamp}</span></div>
    <div class="agp-body"><small>${V.kick}</small><h2>${V.title}</h2>
    <p>Contesta <b>3 preguntas</b> (30 segundos) y la app cruza tu agenda con la de tu rival, os propone los huecos que os van bien a los dos y, cuando coincidís, <b>el partido se cierra solo</b>.</p>
    <button class="btn ball agp-go" data-agp-go>🗓️ Montar mi agenda</button><button class="agp-later" data-agp-close>Luego</button></div></div>`;
  document.body.appendChild(el); document.body.classList.add("agw-on");
  return true;
}
const popIv=setInterval(()=>{ if(maybePopup()) clearInterval(popIv); },1500);
document.addEventListener("click",e=>{
  const p=document.getElementById("agp"); if(!p) return;
  if(e.target.closest("[data-agp-go]")){ p.remove(); document.body.classList.remove("agw-on"); openWizard(); }
  else if(e.target.closest("[data-agp-close]")||e.target===p){ p.remove(); document.body.classList.remove("agw-on"); }
});

/* Enlaces de los avisos: #agenda (asistente) y #agenda-<partido> (ficha del partido) */
function route(){
  const h=location.hash; if(!h.startsWith("#agenda")) return;
  const go=()=>{ if(!(Store.member&&Agenda.ready&&!document.getElementById("gate"))) return false;
    const mid=h.slice(8); if(mid&&FX[mid]) openMatch(mid); else if(!filled(myId())) openWizard();
    else { const el=document.querySelector(".ag-wrap"); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); }
    history.replaceState(null,"",location.pathname+location.search+"#hoy"); return true; };
  if(!go()){ const iv=setInterval(()=>{ if(go()) clearInterval(iv); },600); setTimeout(()=>clearInterval(iv),20000); }
}
window.addEventListener("hashchange",route); route();
})();
