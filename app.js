"use strict";
const CFG = window.LIGA_CONFIG || {};

/* =====================================================================
   Jugadores y calendario
   ===================================================================== */
const PLAYERS = [
  {id:"alvaro",  name:"Álvaro García",  first:"Álvaro",  last:"García",    color:"#FF6B35", skin:"#D69378", nick:"El Panchito", style:"Ataque directo", bio:"El panchito del grupo. Derecha demoledora, pero a veces se atrapa con el saque. Sin duda, uno de los rivales a batir."},
  {id:"eduardo", name:"Eduardo Pobes",  first:"Eduardo", last:"Pobes",     color:"#FFB627", skin:"#D29A7C", nick:"Pan de 3 Días", style:"Racha e intensidad", bio:"Uno de los jugadores más en racha de la liga. Sin duda, es un rival a batir. Si se pone duro, es más duro que el pan de 3 días."},
  {id:"joan",    name:"Joan Villaseca", first:"Joan",    last:"Villaseca", color:"#2EC4B6", skin:"#B07A60", nick:"", style:"", bio:""},
  {id:"pepe",    name:"Pepe Vilar",     first:"Pepe",    last:"Vilar",     color:"#9B5DE5", skin:"#CA8B6A", nick:"Pura Magia", style:"Estrategia y veteranía", bio:"Pura magia, revés de Andy Murray y veteranía en estado puro. Si consigue pillar su racha, será uno de los rivales a batir."},
  {id:"marc",    name:"Marc Huet",      first:"Marc",    last:"Huet",      color:"#F15BB5", skin:"#C99079", nick:"Leyenda Viva", style:"Casco obligatorio", bio:"Nada que añadir, su nombre lo dice todo. Es una leyenda viva. El día que juegues contra él, más vale que lleves casco. Uno de los jugadores más míticos de esta liga."},
  {id:"julian",  name:"Julian Valon",   first:"Julian",  last:"Valon",     color:"#00BB77", skin:"#DB966A", nick:"El Pollo", style:"Inconstante", bio:"Gran jugador y mejor hermano. Es el pollo por excelencia y el mayor representante del comité junior. Si tiene un día bueno te puede complicar las cosas, pero en un día malo, en 30 minutos estás con tu victoria en el bolsillo."},
  {id:"carlos",  name:"Carlos Rovira",  first:"Carlos",  last:"Rovira",    color:"#EF476F", skin:"#BF8968", nick:"El Imprevisible", style:"Servicio letal", bio:"Rival imprevisible. Tiene uno de los saques más letales del club y es un jugador que tanto si se mete en tu cabeza como si tú te metes en su cabeza, el partido se acaba en menos de 5 minutos."},
  {id:"marcos",  name:"Marcos Pich",    first:"Marcos",  last:"Pich",      color:"#4CC9F0", skin:"#CB8E78", nick:"El Caudillo", style:"Revés a una mano", bio:"Jugador con un talento incomparable, el mejor revés a una mano del club y caudillo."},
  {id:"pablo",   name:"Pablo Bernabéu", first:"Pablo",   last:"Bernabéu",  color:"#FFD60A", skin:"#C47058", nick:"El Pesadilla", style:"Globos y cortadas", bio:"Sin duda, es uno de los candidatos al último puesto. Sus globos y sus cortadas puede que sean tu peor pesadilla en un día de resaca."},
  {id:"tomas",   name:"Tomas Arqued",   first:"Tomas",   last:"Arqued",    color:"#80ED99", skin:"#BB7156", nick:"Comité Junior", style:"Búsqueda de estilo", bio:"Mucho pelo pero pocas nueces y también mucho ruido pero pocas nueces. Aún está intentando encontrar su tenis. Sin duda, uno de los mayores representantes del comité junior."},
];
const P = Object.fromEntries(PLAYERS.map(p=>[p.id,p]));
const IMG = id => (window.PHOTO_URLS && window.PHOTO_URLS[id]) || `img/${id}.webp`;

const JORNADAS = [
  ["2026-09-28","2026-10-07"],["2026-10-08","2026-10-17"],["2026-10-18","2026-10-27"],
  ["2026-10-28","2026-11-06"],["2026-11-07","2026-11-16"],["2026-11-17","2026-11-26"],
  ["2026-11-27","2026-12-06"],["2026-12-07","2026-12-16"],["2026-12-17","2026-12-26"],
  ["2027-02-01","2027-02-10"],["2027-02-11","2027-02-20"],["2027-02-21","2027-03-02"],
  ["2027-03-03","2027-03-12"],["2027-03-13","2027-03-22"],["2027-03-23","2027-04-01"],
  ["2027-04-02","2027-04-11"],["2027-04-12","2027-04-21"],["2027-04-22","2027-05-01"],
];
const PLAYOFF_START = "2027-05-02";

function roundRobin(ids){
  const n=ids.length, arr=ids.slice(), rounds=[];
  for(let r=0;r<n-1;r++){
    const pairs=[];
    for(let i=0;i<n/2;i++){
      let a=arr[i], b=arr[n-1-i];
      if((i===0 && r%2===1) || (i>0 && i%2===1)) [a,b]=[b,a];
      pairs.push([a,b]);
    }
    rounds.push(pairs);
    arr.splice(1,0,arr.pop());
  }
  return rounds;
}
const IDA = CFG.CRUCES_IDA || roundRobin(PLAYERS.map(p=>p.id));
const FIXTURE = [];
IDA.forEach((round,i)=>round.forEach(([a,b])=>FIXTURE.push({id:`J${i+1}-${a}-${b}`, j:i+1, a, b})));
IDA.forEach((round,i)=>round.forEach(([a,b])=>FIXTURE.push({id:`J${i+10}-${b}-${a}`, j:i+10, a:b, b:a})));
const FX = Object.fromEntries(FIXTURE.map(f=>[f.id,f]));
const PLAYOFF_IDS = ["SF1","SF2","F"];
const PO_LABEL = {SF1:"Semifinal 1", SF2:"Semifinal 2", F:"Gran final"};

/* Resultados ya disputados (copiados de la web original) */
const SEED = {
  "J1-joan-marcos": {status:"done", sets:[{a:3,b:6},{a:6,b:1},{a:10,b:3,st:true}]},
  "J1-pepe-carlos": {status:"done", sets:[{a:6,b:1},{a:6,b:3}]},
  "J2-alvaro-pablo": {status:"done", sets:[{a:6,b:1},{a:6,b:0}]},
};

/* =====================================================================
   Datos: Supabase en tiempo real (o modo prueba local)
   ===================================================================== */
let VERSION = 0;
const Store = {
  matches:{}, preds:{}, votes:{}, db:null, online:false,
  bump(){ VERSION++; schedule(); },
  async init(){
    if(CFG.FIREBASE && window.firebase){
      try{
        firebase.initializeApp(CFG.FIREBASE);
        await firebase.auth().signInAnonymously();
        this.db = firebase.firestore();
        const listen=(col,target)=>this.db.collection(col).onSnapshot(snap=>{
          snap.docChanges().forEach(c=>{ if(c.type==="removed") delete this[target][c.doc.id]; else this[target][c.doc.id]=c.doc.data(); });
          if(col==="matches"){ this.online=true; setSync(true,"En directo para todos"); }
          this.bump();
        }, err=>{ console.error(err); setSync(false,"Sin permiso para leer: revisa las reglas de Firestore"); });
        listen("matches","matches"); listen("preds","preds"); listen("votes","votes");
        return;
      }catch(e){
        console.error(e);
        setSync(false, /auth|operation-not-allowed/i.test(String(e.code||e.message)) ? "Activa el acceso Anónimo en Firebase Authentication" : "No se pudo conectar con Firebase");
        this.db=null;
      }
    } else setSync(false,"Modo prueba: solo en este navegador");
    this.loadLocal(); this.bump();
    window.addEventListener("storage",()=>{ this.loadLocal(); this.bump(); });
  },
  loadLocal(){
    try{ this.matches=JSON.parse(localStorage.getItem("am_matches")||"{}"); this.preds=JSON.parse(localStorage.getItem("am_preds")||"{}"); this.votes=JSON.parse(localStorage.getItem("am_votes")||"{}"); }
    catch(e){ this.matches={}; this.preds={}; this.votes={}; }
  },
  saveLocal(){ try{ localStorage.setItem("am_matches",JSON.stringify(this.matches)); localStorage.setItem("am_preds",JSON.stringify(this.preds)); localStorage.setItem("am_votes",JSON.stringify(this.votes)); }catch(e){} },
  /* Guardado optimista: la pantalla cambia al instante y la base de datos va detrás */
  async write(col,target,id,data,errMsg){
    const prev=this[target][id];
    this[target][id]=data; this.bump();
    if(!this.db){ this.saveLocal(); return true; }
    try{ await this.db.collection(col).doc(id).set(data); return true; }
    catch(e){
      if(prev) this[target][id]=prev; else delete this[target][id];
      this.bump();
      if(col==="matches" && /permission/i.test(String(e.code||e.message))){ localStorage.removeItem("am_pin"); toast("Sin permiso: vuelve a meter el PIN"); }
      else toast(errMsg);
      return false;
    }
  },
  setMatch(id,data){ data.updated=Date.now(); return this.write("matches","matches",id,data,"No se pudo guardar. Revisa la conexión."); },
  setPred(id,data){ return this.write("preds","preds",id,data,"No se pudo guardar el pronóstico"); },
  setVote(id,data){ return this.write("votes","votes",id,data,"No se pudo guardar el voto"); },
  async checkPin(pin){
    if(!this.db) return pin===(CFG.LOCAL_PIN||"");
    const uid=firebase.auth().currentUser&&firebase.auth().currentUser.uid; if(!uid) return false;
    try{ await this.db.collection("editors").doc(uid).set({pin}); return true; }
    catch(e){ return false; }
  },
};
const getPin = ()=>localStorage.getItem("am_pin")||"";
function setSync(on,txt){const el=document.getElementById("sync");el.classList.toggle("on",on);el.querySelector("span").textContent=txt;}

/* =====================================================================
   Reglas de tenis
   ===================================================================== */
function setDone(s){
  const hi=Math.max(s.a,s.b), lo=Math.min(s.a,s.b);
  if(s.st) return hi>=10 && hi-lo>=2;
  return (hi===6 && hi-lo>=2) || (hi===7 && (lo===5||lo===6));
}
function setsWon(sets){let a=0,b=0;sets.forEach(s=>{if(setDone(s)){s.a>s.b?a++:b++;}});return {a,b};}
function result(m){
  if(!m) return null;
  if(m.status==="wo") return {w:m.woWinner, sa:m.woWinner==="a"?2:0, sb:m.woWinner==="b"?2:0, ga:0, gb:0, wo:true, sets:[]};
  if(m.status!=="done" || !m.sets || !m.sets.length) return null;
  let sa=0,sb=0,ga=0,gb=0;
  m.sets.forEach(s=>{ if(s.a>s.b) sa++; else sb++; if(!s.st){ga+=s.a;gb+=s.b;} });
  return {w:sa>sb?"a":"b", sa, sb, ga, gb, wo:false, sets:m.sets};
}
function ptsFor(r,side){ if(!r) return 0; const won=r.w===side, tight=(r.sa+r.sb)===3; return won?(tight?2:3):(tight?1:0); }
function scoreText(m){ if(m.status==="wo") return "WO"; return (m.sets||[]).map(s=>`${s.a}-${s.b}`).join(" · "); }
function sortKey(m){ return (m.date||JORNADAS[(m.j||18)-1]?.[1]||PLAYOFF_START) + String(m.updated||0).padStart(15,"0"); }

/* Marcador en directo: suma un juego o un punto según el momento del partido */
function liveAdd(m,side){
  const sets=(m.sets||[]).map(s=>{const c={...s}; if(s.tb) c.tb={...s.tb}; return c;});
  const w=setsWon(sets); if(w.a===2||w.b===2) return null;
  let cur=sets[sets.length-1];
  if(!cur || setDone(cur)){ cur=(w.a===1&&w.b===1)?{a:0,b:0,st:true}:{a:0,b:0}; sets.push(cur); }
  if(cur.st) cur[side]++;
  else if(cur.a===6&&cur.b===6){
    cur.tb=cur.tb||{a:0,b:0}; cur.tb[side]++;
    const hi=Math.max(cur.tb.a,cur.tb.b), lo=Math.min(cur.tb.a,cur.tb.b);
    if(hi>=7&&hi-lo>=2) cur[side]=7;
  } else cur[side]++;
  const w2=setsWon(sets);
  return {sets, done:w2.a===2||w2.b===2};
}
function liveMode(m){
  const sets=m.sets||[], cur=sets[sets.length-1], w=setsWon(sets);
  if(!cur||setDone(cur)) return (w.a===1&&w.b===1)?"Super tie-break a 10: toca quién gana cada punto":"Toca quién gana cada juego";
  if(cur.st) return "Super tie-break a 10: toca quién gana cada punto";
  if(cur.a===6&&cur.b===6) return "Tie-break a 7: toca quién gana cada punto";
  return "Toca quién gana cada juego";
}

/* =====================================================================
   Cálculos (memorizados por versión de datos para ir fluido)
   ===================================================================== */
const memo={};
function cached(key,fn){ const c=memo[key]; if(c&&c.v===VERSION) return c.val; const val=fn(); memo[key]={v:VERSION,val}; return val; }

function getMatch(id){
  const doc=Store.matches[id]||SEED[id]||{};
  const fx=FX[id];
  if(fx) return {...doc, id, j:fx.j, a:fx.a, b:fx.b};
  let a=doc.a, b=doc.b;
  if(!a||!b){
    const seeds=seedsNow();
    if(id==="SF1"){a=seeds[0];b=seeds[3];}
    if(id==="SF2"){a=seeds[1];b=seeds[2];}
    if(id==="F"){a=winnerOf("SF1");b=winnerOf("SF2");}
  }
  return {...doc, id, j:"PO", a, b, playoff:true};
}
function winnerOf(id){ const d=Store.matches[id]; const r=result(d); if(!r||!d.a) return null; return r.w==="a"?d.a:d.b; }

function standings(onlyIda=false){
  return cached("st"+onlyIda,()=>{
    const rows=Object.fromEntries(PLAYERS.map(p=>[p.id,{id:p.id,pj:0,pg:0,pp:0,sf:0,sc:0,jf:0,jc:0,pts:0,tbW:0,tbL:0,stW:0,stL:0,rem:0,bag:0,form:[],h2h:{},res:[]}]));
    const played=FIXTURE.filter(f=>!onlyIda||f.j<=9).map(f=>getMatch(f.id)).filter(m=>result(m)).sort((x,y)=>sortKey(x)<sortKey(y)?-1:1);
    played.forEach(m=>{
      const r=result(m);
      [["a","b"],["b","a"]].forEach(([me,op])=>{
        const R=rows[m[me]], won=r.w===me;
        R.pj++; won?R.pg++:R.pp++;
        R.sf+=me==="a"?r.sa:r.sb; R.sc+=me==="a"?r.sb:r.sa;
        R.jf+=me==="a"?r.ga:r.gb; R.jc+=me==="a"?r.gb:r.ga;
        R.pts+=ptsFor(r,me); R.form.push(won?"W":"L");
        const h=R.h2h[m[op]]||(R.h2h[m[op]]={w:0,l:0,pts:0}); won?h.w++:h.l++; h.pts+=ptsFor(r,me);
        r.sets.forEach(s=>{
          const mine=me==="a"?s.a:s.b, th=me==="a"?s.b:s.a;
          if(s.st){ mine>th?R.stW++:R.stL++; }
          else { if(Math.max(s.a,s.b)===7&&Math.min(s.a,s.b)===6){ mine>th?R.tbW++:R.tbL++; } if(mine===6&&th===0) R.bag++; }
        });
        if(!r.wo&&r.sets[0]){ const f=r.sets[0]; if((me==="a"?f.a<f.b:f.b<f.a)&&won) R.rem++; }
        R.res.push(m);
      });
    });
    const list=Object.values(rows);
    list.forEach(R=>{
      R.ds=R.sf-R.sc; R.dj=R.jf-R.jc;
      let run=0,best=0; R.form.forEach(x=>{ if(x==="W"){run++;best=Math.max(best,run);} else run=0; }); R.best=best;
      let n=0; const last=R.form[R.form.length-1]; for(let i=R.form.length-1;i>=0&&R.form[i]===last;i--) n++;
      R.streak= last?(last==="W"?n:-n):0;
    });
    const groups={}; list.forEach(R=>(groups[R.pts]=groups[R.pts]||[]).push(R));
    Object.values(groups).forEach(g=>{ const ids=g.map(x=>x.id); g.forEach(R=>R.hh=ids.reduce((s,o)=>s+(o!==R.id&&R.h2h[o]?R.h2h[o].pts:0),0)); });
    list.sort((x,y)=>y.pts-x.pts||y.hh-x.hh||y.ds-x.ds||y.dj-x.dj||y.pg-x.pg||P[x.id].name.localeCompare(P[y.id].name));
    list.forEach((R,i)=>R.pos=i+1);
    list.byId=Object.fromEntries(list.map(R=>[R.id,R]));
    return list;
  });
}
function seedsNow(){ return standings().slice(0,4).map(r=>r.id); }

/* Índice de rendimiento tipo Elo: pronóstico automático y MVP */
function elo(){
  return cached("elo",()=>{
    const R=Object.fromEntries(PLAYERS.map(p=>[p.id,1500]));
    const hist=Object.fromEntries(PLAYERS.map(p=>[p.id,[1500]]));
    const deltas=[];
    const all=[...FIXTURE.map(f=>getMatch(f.id)),...PLAYOFF_IDS.map(id=>{const d=Store.matches[id];return d&&d.a?{...d,id,j:"PO"}:null;}).filter(Boolean)]
      .filter(m=>{const r=result(m);return r&&!r.wo;}).sort((x,y)=>sortKey(x)<sortKey(y)?-1:1);
    all.forEach(m=>{
      const r=result(m), ea=1/(1+Math.pow(10,(R[m.b]-R[m.a])/400));
      const sA=r.w==="a"?(r.sb===0?1:.8):(r.sa===0?0:.2), d=36*(sA-ea);
      R[m.a]+=d; R[m.b]-=d; hist[m.a].push(R[m.a]); hist[m.b].push(R[m.b]);
      deltas.push({m,id:m.a,d,ea},{m,id:m.b,d:-d,ea:1-ea});
    });
    return {R,hist,deltas};
  });
}
const probA=(a,b)=>{const E=elo().R;return 1/(1+Math.pow(10,(E[b]-E[a])/400));};

function mvp(){
  return cached("mvp",()=>{
    const E=elo(), st=standings().byId;
    const season=PLAYERS.filter(p=>st[p.id].pj>=3).map(p=>({id:p.id,r:E.R[p.id]})).sort((a,b)=>b.r-a.r)[0]||null;
    const js=[...new Set(E.deltas.map(d=>d.m.j).filter(j=>typeof j==="number"))].sort((a,b)=>b-a);
    let jornada=null;
    if(js.length){ const J=js[0], sum={}; E.deltas.filter(d=>d.m.j===J).forEach(d=>sum[d.id]=(sum[d.id]||0)+d.d);
      const best=Object.entries(sum).sort((a,b)=>b[1]-a[1])[0]; jornada={j:J,id:best[0],d:best[1]}; }
    const upset=E.deltas.filter(d=>d.d>0).sort((a,b)=>a.ea-b.ea)[0]||null;
    return {season,jornada,upset};
  });
}
function predRanking(){
  return cached("pr",()=>{
    const t={};
    Object.values(Store.preds).forEach(p=>{
      const r=result(getMatch(p.m)); const T=t[p.v]=t[p.v]||{v:p.v,pts:0,hits:0,exact:0,n:0};
      if(!r||r.wo) return; T.n++;
      if(p.w===r.w){ T.pts++; T.hits++; if(p.r===((r.sa+r.sb)===3?"21":"20")){T.pts+=2;T.exact++;} }
    });
    return Object.values(t).filter(x=>P[x.v]).sort((a,b)=>b.pts-a.pts||b.exact-a.exact||b.hits-a.hits);
  });
}

/* =====================================================================
   Utilidades
   ===================================================================== */
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const MES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"], DIAS=["dom","lun","mar","mié","jue","vie","sáb"];
const fmtD=s=>{if(!s)return"";const[,m,d]=s.split("-").map(Number);return `${d} ${MES[m-1]}`;};
const fmtDay=s=>{const[y,m,d]=s.split("-").map(Number);return `${DIAS[new Date(y,m-1,d).getDay()]} ${d} ${MES[m-1]}`;};
function phase(){ const t=today(); for(let i=0;i<18;i++){ if(t<=JORNADAS[i][1]) return (t<JORNADAS[i][0]&&i===9)?{type:"break"}:{type:"j",j:i+1}; } return {type:"po"}; }
function currentJ(){const p=phase();return p.type==="j"?p.j:p.type==="break"?9:18;}
function daysLeft(j){const[y,m,d]=JORNADAS[j-1][1].split("-").map(Number);return Math.max(0,Math.ceil((new Date(y,m-1,d,23,59)-new Date())/864e5));}
function toast(t){const el=document.getElementById("toast");el.textContent=t;el.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add("hidden"),2600);}
const nm=id=>P[id]?P[id].first:"Por decidir";
const col=id=>P[id]?P[id].color:"#3E86E8";
const av=(id,cls="")=>P[id]?`<span class="av ${cls}" style="--c:${col(id)}"><img src="${IMG(id)}" alt="" loading="lazy" decoding="async"></span>`:`<span class="av ${cls}"></span>`;
const formHtml=f=>`<span class="form">${f.slice(-5).map(x=>`<i class="${x}">${x==="W"?"V":"D"}</i>`).join("")}</span>`;
const sign=n=>(n>0?"+":"")+n;


/* =====================================================================
   El cartel del partido
   ===================================================================== */
const SEEN=new Set();
function poster(m,{wide=false,still=false}={}){
  const intro=!SEEN.has(m.id+wide+still); SEEN.add(m.id+wide+still);
  const st=standings().byId, r=result(m), live=m.status==="live";
  const A=P[m.a], B=P[m.b];
  const kick = "Legends Cup · "+(m.playoff?PO_LABEL[m.id]:`Jornada ${m.j}`);
  const tag = live?`<span class="p-tag live"><span class="livedot"></span>En directo</span>`:r?`<span class="p-tag">Final</span>`:"";
  const fullA=A?A.name:"Por decidir", fullB=B?B.name:"Por decidir";
  const unit=`${esc(fullA)} <em>vs</em> ${esc(fullB)} · Americana Legends Cup · <em>Vol. 1</em> · `;
  const track=unit.repeat(4);
  let meta;
  if(live||r) meta=`<div class="p-score num">${r&&r.wo?"WO":esc(scoreText(m))||"0-0"}</div>`;
  else meta=`<div class="p-meta">${m.date?esc(fmtDay(m.date)):"Fecha por fijar"}${m.time?" · "+esc(m.time):""}${m.court?" · "+esc(m.court):""}</div>`;
  const len=Math.max((A?A.first:"?").length,(B?B.first:"?").length);
  const fs=Math.min(27,155/len), fsw=Math.min(15,92/len);
  const pa=(A&&B)?probA(m.a,m.b):.5;
  return `<article class="poster ${wide?"wide":""} ${intro?"intro":""}" ${still?"":`data-versus="${m.id}" role="button" tabindex="0"`} aria-label="${esc(fullA)} contra ${esc(fullB)}" style="--fs:${fs}cqw;--fsw:${fsw}cqw">
    <div class="p-beams" aria-hidden="true"></div><div class="p-flare" aria-hidden="true"></div><div class="p-bg" aria-hidden="true"><span>${esc(A?A.first:"?")}</span><span>${esc(B?B.first:"?")}</span></div>
    ${A?`<div class="p-glow l" style="background:${A.color}"></div>`:""}${B?`<div class="p-glow r" style="background:${B.color}"></div>`:""}
    ${A?`<div class="hero l" style="--c:${A.color}"><img src="${IMG(m.a)}" alt="" decoding="async"></div>`:""}
    ${B?`<div class="hero r" style="--c:${B.color}"><img src="${IMG(m.b)}" alt="" decoding="async"></div>`:""}
    <div class="p-vs" aria-hidden="true">VS</div>
    ${tag}
    ${st[m.a]?`<div class="p-pos l">${st[m.a].pos}º<small>${st[m.a].pts} pts</small></div>`:""}
    ${st[m.b]?`<div class="p-pos r">${st[m.b].pos}º<small>${st[m.b].pts} pts</small></div>`:""}
    <div class="bands" aria-hidden="true">
      <div class="band b1"><span class="track">${track}</span></div>
      <div class="band b2"><span class="track">${track}</span></div>
    </div>
    <div class="p-title">
      <div class="p-kicker"><span class="bl"></span>${esc(kick)}</div>
      <div class="p-names">${esc(fullA)}<span class="v">vs</span>${esc(fullB)}</div>
      ${meta}
    </div>
    ${(!r&&!live&&A&&B)?`<div class="p-prob" title="Probabilidad según el algoritmo"><span style="width:${(pa*100).toFixed(0)}%;background:${A.color}"></span><span style="flex:1;background:${B.color}"></span></div>`:""}
  </article>`;
}
function playerPoster(id){
  const p=P[id], R=standings().byId[id];
  const fs=Math.min(30,160/p.last.length);
  return `<article class="poster" aria-label="${esc(p.name)}" style="--fs:${fs}cqw">
    <div class="p-bg" aria-hidden="true"><span>${esc(p.first)}</span><span>${esc(p.last)}</span></div>
    <div class="p-beams" aria-hidden="true"></div><div class="p-glow" style="left:22%;background:${p.color}"></div>
    <div class="hero solo" style="--c:${p.color}"><img src="${IMG(id)}" alt=""></div>
    <div class="p-pos l" style="top:4cqw">${R.pos}º<small>${R.pts} pts</small></div>
    <div class="bands" aria-hidden="true"><div class="band b1"><span class="track">${(esc(p.name)+" · <em>"+R.pg+"V "+R.pp+"D</em> · ").repeat(8)}</span></div></div>
    <div class="p-title"><div class="p-kicker"><span class="bl"></span>Americana Legends Cup · Vol. 1</div><div class="p-names">${esc(p.name)}</div><div class="p-meta">${p.nick?"“"+esc(p.nick)+"” · ":""}${formHtml(R.form)}</div></div>
  </article>`;
}

function scoreboard(m){
  const sets=m.sets&&m.sets.length?m.sets:[{a:0,b:0}], live=m.status==="live", r=result(m);
  const ci=live?sets.length-1:-1;
  const row=side=>{
    const cells=sets.map((s,i)=>{
      const mine=s[side], th=s[side==="a"?"b":"a"];
      let tb=""; if(s.tb && ((Math.max(s.a,s.b)===7&&Math.min(s.a,s.b)===6&&mine===6)||(i===ci&&s.a===6&&s.b===6))) tb=`<sup>${s.tb[side]}</sup>`;
      return `<div class="sb-cell ${i===ci?"cur":(setDone(s)&&mine<th?"lose":"")}">${mine}${tb}</div>`;
    }).join("");
    return `<div class="sb-row ${r&&r.w===side?"winner":""}"><div class="sb-name">${av(m[side],"sm")}<span>${nm(m[side])}</span></div>${cells}</div>`;
  };
  return `<div class="sb" style="--cols:${sets.length}"><div class="sb-head"><span></span>${sets.map((s,i)=>`<span>${s.st?"Super TB":"Set "+(i+1)}</span>`).join("")}</div>${row("a")}${row("b")}</div>`;
}

function matchRow(m){
  const fx=FX[m.id], num=fx?FIXTURE.filter(f=>f.j===fx.j).indexOf(fx)+1:0;
  const r=result(m), live=m.status==="live", wa=r&&r.w==="a", wb=r&&r.w==="b";
  let mid;
  if(live) mid=`<div class="res live num"><span class="livedot"></span>${esc(scoreText(m))||"0-0"}</div>en directo`;
  else if(r) mid=`<div class="res num">${r.wo?"WO":esc(scoreText(m))}</div>${ptsFor(r,"a")}–${ptsFor(r,"b")} pts`;
  else mid=m.date?`${esc(fmtDay(m.date))}${m.time?"<br>"+esc(m.time):""}`:"Por fijar";
  return `<button class="mrow ${live?"live":""}" data-open-match="${m.id}" style="--ca:${col(m.a)};--cb:${col(m.b)}">
    <div class="pl ${r?(wa?"w":"l"):""}">${av(m.a)}<span>${nm(m.a)}</span></div>
    <div class="mid">${num?`<div class="pn">Partido ${num}</div>`:""}${mid}</div>
    <div class="pl r ${r?(wb?"w":"l"):""}"><span>${nm(m.b)}</span>${av(m.b)}</div>
  </button>`;
}
function award(id,label,txt,cls=""){ return `<button class="award ${cls}" data-open-player="${id}">${av(id)}<div><small>${label}</small><b>${esc(P[id].name)}</b><p>${txt}</p></div></button>`; }

/* =====================================================================
   Vistas
   ===================================================================== */
const TABS=[["hoy","Hoy"],["clasificacion","Clasificación"],["calendario","Calendario / Resultados"],["jugadores","Jugadores"],["h2h","Comparador H2H"],["analytics","Analytics"],["mvp","Votación MVP"],["pronosticos","Pronósticos"],["playoffs","Playoffs y premios"]];
const S={tab:(location.hash||"#hoy").slice(1), inv:false, me:localStorage.getItem("am_me")||"", modal:null, h2a:"alvaro", h2b:"pepe", mvpJ:null};
if(!TABS.some(t=>t[0]===S.tab)) S.tab="hoy";

let queued=false;
function schedule(){ if(queued) return; queued=true; requestAnimationFrame(()=>{queued=false; render();}); }
let lastView="";
function render(){
  const ph=phase(), J=currentJ();
  document.getElementById("jchip").innerHTML = ph.type==="j"?`<b>Jornada ${J}</b>${fmtD(JORNADAS[J-1][0])} – ${fmtD(JORNADAS[J-1][1])} · quedan ${daysLeft(J)} días`
    : ph.type==="break"?`<b>Descanso de invierno</b>Vuelve el 1 de febrero`:`<b>Playoffs</b>Mayo 2027`;
  const tabs=TABS.map(([k,l])=>`<button data-tab="${k}" ${S.tab===k?'aria-current="page"':""}>${l}</button>`).join("");
  const tEl=document.getElementById("tabs"); if(tEl.innerHTML!==tabs) tEl.innerHTML=tabs;
  const html={hoy:vHoy,calendario:vCal,clasificacion:vClas,jugadores:vJug,h2h:vH2H,analytics:vAna,mvp:vMVP,pronosticos:vPron,playoffs:vPO}[S.tab]();
  if(html!==lastView){ document.getElementById("view").innerHTML=html; lastView=html; }   // no se repinta si nada cambió
  const typing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest("#modal input,#modal select");
  if(S.modal&&!typing){ const sc=document.querySelector("#modal .modal"), top=sc?sc.scrollTop:0; S.modal(); const n=document.querySelector("#modal .modal"); if(n) n.scrollTop=top; }
}


let LU_SEEN=false;
function lineup(){
  const first=!LU_SEEN; LU_SEEN=true;
  const st=standings(), J=currentJ(), ph=phase();
  const order=[8,6,4,2,0,1,3,5,7,9].map(i=>st[i]).filter(Boolean);
  const mid=(order.length-1)/2;
  const faces=order.map((r,i)=>{const d=Math.abs(i-mid); return `<button class="lu-face" data-open-player="${r.id}" style="--c:${P[r.id].color};--d:${d};--i:${i};z-index:${20-Math.round(d*2)}" aria-label="${esc(P[r.id].name)}, ${r.pos}º"><img src="${IMG(r.id)}" alt="" decoding="async"><span>${r.pos}</span></button>`;}).join("");
  const done=FIXTURE.filter(f=>result(getMatch(f.id))).length;
  const when= ph.type==="j"?`Jornada ${J} · quedan ${daysLeft(J)} días`: ph.type==="break"?"Descanso de invierno":"Playoffs";
  return `<section class="lineup ${first?"first":""}" aria-label="Americana Legends Cup">
    <div class="lu-beams" aria-hidden="true"></div>
    <div class="lu-bg" aria-hidden="true">Legends</div>
    <div class="lu-title"><span class="lu-kick">Americana</span><b>Legends Cup</b><span class="vol">Vol. 1</span></div>
    <div class="lu-faces">${faces}</div>
    <div class="lu-bar"><span><b>10</b> leyendas</span><span><b>${done}</b>/90 partidos</span><span>${when}</span><span>Final en Formentera 🏝️</span></div>
  </section>`;
}
function vHoy(){
  const J=currentJ(), st=standings().byId;
  const live=[...FIXTURE.map(f=>getMatch(f.id)),...PLAYOFF_IDS.map(getMatch)].filter(m=>m.status==="live");
  const jm=FIXTURE.filter(f=>f.j===J).map(f=>getMatch(f.id));
  const pend=jm.filter(m=>!result(m)&&m.status!=="live");
  const score=m=>(st[m.a].pos+st[m.b].pos)+Math.abs(probA(m.a,m.b)-.5)*10-(m.date&&m.date>=today()?3:0);
  const star=pend.slice().sort((x,y)=>score(x)-score(y))[0] || jm.find(m=>result(m));
  const M=mvp();
  let h=lineup();
  if(live.length) h+=`<h2>En directo</h2><div class="grid2">${live.map(m=>`<div>${poster(m,{wide:live.length===1})}<div style="margin-top:8px">${scoreboard(m)}</div></div>`).join("")}</div>`;
  if(star) h+=`<h2>${live.length?"Próximo gran partido":"El partido de la jornada"}</h2>${poster(star,{wide:true})}`;
  h+=`<h2>Jornada ${J}</h2><p class="sub">Toca un partido para ver la previa, pronosticar o llevar el marcador.</p><div class="mlist">${jm.map(matchRow).join("")}</div>`;
  h+=`<div class="grid2" style="margin-top:28px">
    <div><h2 style="margin-top:0">Clasificación</h2>${miniTable(standings().slice(0,5))}<div class="btnrow"><button class="btn ghost" data-tab="clasificacion">Ver tabla completa</button></div></div>
    <div><h2 style="margin-top:0">MVP</h2>${M.jornada?award(M.jornada.id,`MVP de la jornada ${M.jornada.j}`,`+${M.jornada.d.toFixed(0)} de rendimiento`,"gold"):`<div class="empty">El MVP aparece en cuanto haya resultados.</div>`}
    ${M.season?`<div style="height:10px"></div>`+award(M.season.id,"MVP de la temporada",`Índice ${M.season.r.toFixed(0)}`):""}</div></div>`;
  return h;
}
function miniTable(rows){
  return `<div class="tblwrap"><table><thead><tr><th>#</th><th style="text-align:left">Jugador</th><th>PJ</th><th>DS</th><th>PTS</th></tr></thead><tbody>
  ${rows.map(r=>`<tr class="clickable" data-open-player="${r.id}"><td class="pos">${r.pos}</td><td class="name"><div class="pl">${av(r.id,"sm")}<span>${P[r.id].first}</span></div></td><td>${r.pj}</td><td>${sign(r.ds)}</td><td class="pts">${r.pts}</td></tr>`).join("")}</tbody></table></div>`;
}
function vCal(){
  const J=currentJ(); let h=`<h2>Calendario</h2><p class="sub">Cada jornada dura 10 días. Los dos jugadores acuerdan día, hora y pista.</p>`;
  for(let j=1;j<=18;j++){
    if(j===10) h+=`<div class="break"><b>Cena de mitad de temporada y descanso</b>Tras la jornada 9 queda fijada la Clasificación de Invierno. Enero sin jornadas: se pueden recuperar aplazados. La vuelta arranca el 1 de febrero.</div>`;
    const ms=FIXTURE.filter(f=>f.j===j).map(f=>getMatch(f.id));
    h+=`<section class="jblock"><div class="jhead ${j===J?"now":""}"><h3>Jornada ${j}</h3><span>${fmtD(JORNADAS[j-1][0])} – ${fmtD(JORNADAS[j-1][1])} · ${ms.filter(m=>result(m)).length}/5 jugados</span></div><div class="mlist">${ms.map(matchRow).join("")}</div></section>`;
  }
  return h;
}
function vClas(){
  const rows=standings(S.inv);
  return `<h2>Clasificación</h2>
  <div class="seg" role="group" aria-label="Tipo de clasificación"><button data-inv="0" aria-pressed="${!S.inv}">General</button><button data-inv="1" aria-pressed="${S.inv}">Invierno (J1–J9)</button></div>
  <div class="tblwrap"><table><thead><tr><th>#</th><th style="text-align:left">Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>DS</th><th>JF</th><th>JC</th><th>DJ</th><th>Forma</th><th>PTS</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr class="clickable ${i===3?"cut":""} ${i===rows.length-1&&r.pj?"spoon":""}" data-open-player="${r.id}"><td class="pos">${r.pos}</td><td class="name"><div class="pl">${av(r.id,"sm")}<span>${P[r.id].name}</span></div></td><td>${r.pj}</td><td>${r.pg}</td><td>${r.pp}</td><td>${r.sf}</td><td>${r.sc}</td><td>${sign(r.ds)}</td><td>${r.jf}</td><td>${r.jc}</td><td>${sign(r.dj)}</td><td>${formHtml(r.form)}</td><td class="pts">${r.pts}</td></tr>`).join("")}
  </tbody></table></div>
  <p class="legend">La línea azul marca los 4 puestos de playoff. Victoria 2-0: 3 pts. Victoria 2-1: 2 pts, y 1 para el perdedor. El super tie-break cuenta como set pero no suma juegos. Desempate: cara a cara, diferencia de sets, diferencia de juegos y partidos ganados.</p>`;
}
function vJug(){
  return `<h2>Jugadores</h2><p class="sub">Toca a cualquiera para ver su ficha.</p><div class="pgrid">${standings().map(r=>{const p=P[r.id];return `
    <button class="card" data-open-player="${r.id}" style="--c:${p.color}"><span class="nm-bg" aria-hidden="true">${esc(p.first)}</span><span class="cimg"><img src="${IMG(r.id)}" alt="" loading="lazy" decoding="async"></span><span class="rk">${r.pos}</span>
    <span class="plate"><b>${esc(p.first)}</b>${p.nick?`<em class="nick">“${esc(p.nick)}”</em>`:""}<span>${r.pts} pts · ${r.pg}V ${r.pp}D</span></span><span class="stripe"></span></button>`;}).join("")}</div>`;
}
function vPron(){
  const J=currentJ();
  const open=[...FIXTURE.filter(f=>f.j===J||f.j===J+1).map(f=>getMatch(f.id)),...PLAYOFF_IDS.map(getMatch)].filter(m=>m.a&&m.b&&!result(m)&&m.status!=="live");
  const rank=predRanking();
  return `<h2>Pronósticos</h2><p class="sub">Elige quién gana y por cuánto antes de que empiece el partido. Acertar el ganador da 1 punto; acertar además el resultado (2-0 o 2-1), 3 puntos.</p>
  <div class="panel"><label for="me">¿Quién eres?</label><select id="me"><option value="">Elige tu nombre</option>${PLAYERS.map(p=>`<option value="${p.id}" ${S.me===p.id?"selected":""}>${p.name}</option>`).join("")}</select></div>
  <div class="grid2" style="margin-top:14px"><div><h3>Por pronosticar</h3>${open.length?open.map(predCard).join(""):`<div class="empty">No hay partidos abiertos ahora mismo.</div>`}</div>
  <div><h3>Ranking de pitonisos</h3>${rank.length?`<div class="tblwrap"><table><thead><tr><th>#</th><th style="text-align:left">Jugador</th><th>Aciertos</th><th>Exactos</th><th>PTS</th></tr></thead><tbody>${rank.map((r,i)=>`<tr><td class="pos">${i+1}</td><td class="name"><div class="pl">${av(r.v,"sm")}<span>${P[r.v].first}</span></div></td><td>${r.hits}/${r.n}</td><td>${r.exact}</td><td class="pts">${r.pts}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Aún no hay pronósticos resueltos.</div>`}</div></div>`;
}
function predCard(m){
  const mine=S.me?Store.preds[`${m.id}__${S.me}`]:null;
  const all=Object.values(Store.preds).filter(p=>p.m===m.id), na=all.filter(p=>p.w==="a").length, nb=all.length-na;
  const pa=probA(m.a,m.b);
  return `<div class="panel" style="margin-bottom:10px">
    <div class="mini">${m.playoff?PO_LABEL[m.id]:"Jornada "+m.j}${m.date?" · "+fmtDay(m.date):""} · algoritmo: ${nm(m.a)} ${(pa*100).toFixed(0)}% – ${(100-pa*100).toFixed(0)}% ${nm(m.b)}</div>
    <div class="pickrow"><button class="pick" data-pred="${m.id}" data-w="a" aria-pressed="${mine?.w==="a"}">${av(m.a,"sm")}${nm(m.a)}</button><button class="pick" data-pred="${m.id}" data-w="b" aria-pressed="${mine?.w==="b"}">${nm(m.b)}${av(m.b,"sm")}</button></div>
    ${mine?`<div class="pickrow"><button class="pick small" data-pred="${m.id}" data-w="${mine.w}" data-r="20" aria-pressed="${mine.r==="20"}">Gana 2-0</button><button class="pick small" data-pred="${m.id}" data-w="${mine.w}" data-r="21" aria-pressed="${mine.r==="21"}">Gana 2-1</button></div>`:""}
    <div class="crowd">${all.length} pronóstico${all.length===1?"":"s"} del grupo${all.length?`: ${na} con ${nm(m.a)}, ${nb} con ${nm(m.b)}`:""}${all.length?`<div class="cbar"><span style="width:${na/all.length*100}%;background:${col(m.a)}"></span><span style="flex:1;background:${col(m.b)}"></span></div>`:""}</div>
  </div>`;
}
function vPO(){
  const ligaDone=FIXTURE.every(f=>result(getMatch(f.id)))||today()>=PLAYOFF_START;
  const st=standings(), M=mvp();
  const fin=getMatch("F"), fr=result(fin), champ=fr?fin[fr.w]:null, sub=fr?fin[fr.w==="a"?"b":"a"]:null;
  const remon=st.slice().sort((a,b)=>b.rem-a.rem)[0], last=st[st.length-1];
  const box=(id,label,cls="")=>{const m=getMatch(id);return `<div class="${cls}"><h3>${label}</h3>${m.a&&m.b?poster(m):`<div class="empty">Por decidir</div>`}</div>`;};
  return `<h2>Playoffs</h2><p class="sub">${ligaDone?"Cruces definitivos.":"Cruces provisionales según la clasificación actual."} Partido único, todos parten de cero.</p>
  <div class="bracket">${box("SF1","Semifinal 1 · 1º contra 4º")}${box("SF2","Semifinal 2 · 2º contra 3º")}${box("F","Gran final","final")}</div>
  <h2>Premios · Formentera, junio 2027</h2><div class="grid2">
   ${champ?award(champ,"Campeón Legends Cup Vol. 1","Ganador de la gran final","gold"):`<div class="award gold"><div><small>Campeón</small><b>Por decidir</b><p>Sale de la gran final de mayo</p></div></div>`}
   ${sub?award(sub,"Subcampeón","Finalista"):""}
   ${M.season?award(M.season.id,"Mejor temporada / MVP",`Índice ${M.season.r.toFixed(0)} (líder provisional)`):""}
   ${remon&&remon.rem?award(remon.id,"Mayor remontada",`${remon.rem} partido${remon.rem>1?"s":""} ganado${remon.rem>1?"s":""} tras perder el primer set`):""}
   ${M.upset?award(M.upset.id,"Mayor sorpresa",`Ganó con solo un ${(M.upset.ea*100).toFixed(0)}% de probabilidad previa`):""}
   ${last&&last.pj?award(last.id,"Cuchara de madera 🥄","Último de la clasificación ahora mismo"):""}
  </div>
  <p class="legend">El índice de rendimiento (tipo Elo) sube más cuanto mejor es el rival al que ganas y si ganas 2-0. El MVP de la jornada es quien más lo sube en esa jornada.</p>`;
}


/* ---------- Comparador H2H ---------- */
function vH2H(){
  if(S.h2a===S.h2b) S.h2b=PLAYERS.find(p=>p.id!==S.h2a).id;
  const opt=sel=>PLAYERS.map(p=>`<option value="${p.id}" ${sel===p.id?"selected":""}>${esc(p.name)}</option>`).join("");
  const ms=FIXTURE.filter(f=>(f.a===S.h2a&&f.b===S.h2b)||(f.a===S.h2b&&f.b===S.h2a)).map(f=>getMatch(f.id));
  return `<h2>Comparador H2H</h2><p class="sub">Elige dos jugadores y compara sus números y sus enfrentamientos directos.</p>
  <div class="panel f2"><div><label for="h2a">Jugador 1</label><select id="h2a">${opt(S.h2a)}</select></div><div><label for="h2b">Jugador 2</label><select id="h2b">${opt(S.h2b)}</select></div></div>
  <div style="margin-top:14px">${poster(ms[0],{wide:true})}</div>
  <div class="grid2" style="margin-top:14px"><div class="panel"><h3>Cara a cara</h3>${cmpTable(S.h2a,S.h2b)}</div>
  <div><h3>Sus dos partidos</h3><div class="mlist">${ms.map(matchRow).join("")}</div></div></div>`;
}

/* ---------- Analytics ---------- */
function vAna(){
  const st=standings(), played=FIXTURE.map(f=>getMatch(f.id)).filter(m=>{const r=result(m);return r&&!r.wo;});
  const kpi=(t,v,s,cls="")=>`<div class="kpi ${cls}"><small>${t}</small><b>${v}</b>${s?`<span>${s}</span>`:""}</div>`;
  const bestN=Math.max(0,...st.map(r=>r.streak)), worstN=Math.min(0,...st.map(r=>r.streak));
  const names=ids=>ids.length>3?ids.slice(0,3).map(r=>P[r.id].first).join(", ")+` y ${ids.length-3} más`:ids.length>1?ids.slice(0,-1).map(r=>P[r.id].first).join(", ")+" y "+P[ids[ids.length-1].id].first:esc(P[ids[0].id].name);
  const bestL=st.filter(r=>bestN>0&&r.streak===bestN), worstL=st.filter(r=>worstN<0&&r.streak===worstN);
  const diff=m=>{const r=result(m);return Math.abs(r.ga-r.gb);};
  const paliza=played.slice().sort((x,y)=>diff(y)-diff(x))[0];
  const ajust=played.slice().sort((x,y)=>(diff(x)-diff(y))||((result(y).sa+result(y).sb)-(result(x).sa+result(x).sb)))[0];
  const avg=played.length?(played.reduce((s,m)=>{const r=result(m);return s+r.ga+r.gb;},0)/played.length).toFixed(1):"–";
  const eff=st.filter(r=>r.pj).sort((a,b)=>(b.pg/b.pj-a.pg/a.pj)||b.pj-a.pj||b.pts-a.pts)[0];
  const W=(m)=>{const r=result(m);return m[r.w];};
  let h=`<h2>Analytics y estadísticas</h2><p class="sub">Se recalcula sola con cada resultado. Los juegos siguen el reglamento: el super tie-break cuenta como set, no como juegos.</p>
  <div class="kpis">
   ${kpi("Mejor racha",bestL.length?names(bestL):"–",bestL.length?bestN+" victoria"+(bestN>1?"s":"")+" seguida"+(bestN>1?"s":""):"","good")}
   ${kpi("Peor racha",worstL.length?names(worstL):"–",worstL.length?(-worstN)+" derrota"+(worstN<-1?"s":"")+" seguida"+(worstN<-1?"s":""):"","bad")}
   ${kpi("Mayor paliza",paliza?esc(P[W(paliza)].name):"–",paliza?`+${diff(paliza)} juegos (${esc(scoreText(paliza))})`:"","gold")}
   ${kpi("Partido más ajustado",ajust?`${nm(ajust.a)} vs ${nm(ajust.b)}`:"–",ajust?`${esc(scoreText(ajust))} · dif. ${diff(ajust)} juegos`:"","sky")}
   ${kpi("Promedio juegos / partido",avg,played.length+" partidos jugados","sky")}
   ${kpi("Jugador más efectivo",eff?esc(P[eff.id].name):"–",eff?Math.round(eff.pg/eff.pj*100)+"% de victorias":"","good")}
  </div>
  <div class="grid2 wide" style="margin-top:14px">
   <div class="panel"><h3>Distribución de victorias</h3>${donut(st)}</div>
   <div class="panel"><h3>Juegos ganados y perdidos</h3>${bars(st,r=>[r.jf,r.jc],["Juegos +","Juegos −"])}</div>
   <div class="panel"><h3>Balance de sets (+/−)</h3>${bars(st,r=>[r.ds],["Dif. sets"],true)}</div>
   <div class="panel"><h3>Puntos</h3>${bars(st,r=>[r.pts],["Puntos"])}</div>
  </div>`;
  return h;
}
function donut(st){
  const rows=st.filter(r=>r.pg>0), tot=rows.reduce((s,r)=>s+r.pg,0);
  if(!tot) return `<div class="empty">Aún no hay victorias.</div>`;
  let ang=-Math.PI/2; const R=90,r0=52,cx=110,cy=110;
  const seg=rows.map(r=>{const a0=ang, a1=ang+2*Math.PI*r.pg/tot; ang=a1; const large=a1-a0>Math.PI?1:0;
    const p=(rad,a)=>[cx+rad*Math.cos(a),cy+rad*Math.sin(a)];
    const [x0,y0]=p(R,a0),[x1,y1]=p(R,a1-1e-4),[x2,y2]=p(r0,a1-1e-4),[x3,y3]=p(r0,a0);
    return `<path d="M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z" fill="${col(r.id)}" stroke="#fff" stroke-width="2"/>`;}).join("");
  return `<div class="donut"><svg viewBox="0 0 220 220" role="img" aria-label="Distribución de victorias">${seg}<text x="110" y="108" text-anchor="middle" font-family="Big Shoulders Display,Impact" font-weight="900" font-size="38" fill="#0A1530">${tot}</text><text x="110" y="128" text-anchor="middle" font-size="12" fill="#5B6A85">victorias</text></svg>
   <ul>${rows.map(r=>`<li><i style="background:${col(r.id)}"></i>${P[r.id].first} <b>${r.pg}</b></li>`).join("")}</ul></div>`;
}
function bars(st,f,labels,signed=false){
  const W=640,H=250,top=16,bot=60,left=30, n=st.length, bw=(W-left-10)/n;
  const vals=st.map(f), all=vals.flat(), mx=Math.max(1,...all.map(Math.abs));
  const zero=signed?top+(H-top-bot)/2:H-bot, sc=signed?(H-top-bot)/2/mx:(H-top-bot)/mx;
  const colors=labels.length>1?["#14A06A","#E0413A"]:null;
  let g=`<line x1="${left}" x2="${W-10}" y1="${zero}" y2="${zero}" stroke="#D3DDEC"/>`;
  st.forEach((r,i)=>{
    const x=left+i*bw, vs=vals[i], w=(bw-10)/vs.length;
    vs.forEach((v,k)=>{ const hgt=Math.abs(v)*sc, y=v>=0?zero-hgt:zero; const c=colors?colors[k]:(signed?(v>=0?"#14A06A":"#E0413A"):col(r.id));
      g+=`<rect x="${x+5+k*w}" y="${y}" width="${w-2}" height="${Math.max(hgt,v?1:0)}" fill="${c}" rx="2"><title>${P[r.id].first}: ${v}</title></rect>`;
      if(v) g+=`<text x="${x+5+k*w+(w-2)/2}" y="${v>=0?y-4:y+hgt-5}" text-anchor="middle" font-size="11" font-weight="700" fill="${v>=0?"#0A1530":"#fff"}">${v}</text>`; });
    g+=`<image href="${IMG(r.id)}" x="${x+bw/2-15}" y="${H-bot+8}" width="30" height="34" preserveAspectRatio="xMidYMid meet"/><text x="${x+bw/2}" y="${H-6}" text-anchor="middle" font-size="11" fill="#5B6A85">${P[r.id].first}</text>`;
  });
  const leg=labels.length>1?`<div class="legend2">${labels.map((l,k)=>`<span><i style="background:${colors[k]}"></i>${l}</span>`).join("")}</div>`:"";
  return `${leg}<div class="chartwrap"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${labels.join(", ")}">${g}</svg></div>`;
}

/* ---------- Votación MVP ---------- */
function vMVP(){
  const J=S.mvpJ||currentJ();
  const votes=Object.values(Store.votes).filter(v=>v.j===J);
  const tally={}; votes.forEach(v=>tally[v.c]=(tally[v.c]||0)+1);
  const mine=S.me?Store.votes[`J${J}__${S.me}`]:null;
  const max=Math.max(0,...Object.values(tally));
  const ranking=PLAYERS.map(p=>({id:p.id,n:tally[p.id]||0})).sort((a,b)=>b.n-a.n);
  // MVPs ganados en la temporada
  const wins={}; for(let j=1;j<=18;j++){ const t={}; Object.values(Store.votes).filter(v=>v.j===j).forEach(v=>t[v.c]=(t[v.c]||0)+1); const m=Math.max(0,...Object.values(t)); if(m>0) Object.entries(t).filter(e=>e[1]===m).forEach(e=>wins[e[0]]=(wins[e[0]]||0)+1); }
  const winList=Object.entries(wins).sort((a,b)=>b[1]-a[1]);
  const ms=FIXTURE.filter(f=>f.j===J).map(f=>getMatch(f.id));
  return `<h2>Votación MVP</h2><p class="sub">Cada jugador vota al mejor de la jornada (no vale votarse a uno mismo). Se puede cambiar el voto cuando quieras.</p>
  <div class="chips" role="group" aria-label="Jornada">${Array.from({length:18},(_,i)=>i+1).map(j=>`<button data-mvpj="${j}" aria-pressed="${j===J}">J${j}</button>`).join("")}</div>
  <div class="panel" style="margin-bottom:14px"><label for="me">¿Quién eres?</label><select id="me"><option value="">Elige tu nombre</option>${PLAYERS.map(p=>`<option value="${p.id}" ${S.me===p.id?"selected":""}>${p.name}</option>`).join("")}</select></div>
  <div class="grid2"><div><h3>Vota al MVP de la jornada ${J}</h3><div class="vgrid">${PLAYERS.map(p=>`<button class="vcard ${mine&&mine.c===p.id?"on":""}" data-vote="${p.id}" style="--c:${p.color}" ${p.id===S.me?"disabled":""}><span class="cimg"><img src="${IMG(p.id)}" alt="" loading="lazy"></span><b>${p.first}</b><small>${tally[p.id]||0} voto${(tally[p.id]||0)===1?"":"s"}</small></button>`).join("")}</div>
   <h3 style="margin-top:16px">Partidos de la jornada ${J}</h3><div class="mlist">${ms.map(matchRow).join("")}</div></div>
  <div><h3>Recuento · ${votes.length} voto${votes.length===1?"":"s"}</h3><div class="panel">${ranking.map(r=>`<div class="vbar"><div class="pl">${av(r.id,"sm")}<span>${P[r.id].first}</span></div><div class="vtrack"><span style="width:${max?r.n/max*100:0}%;background:${col(r.id)}"></span></div><b class="num">${r.n}</b></div>`).join("")}</div>
   <h3 style="margin-top:16px">MVPs de jornada ganados</h3>${winList.length?`<div class="panel">${winList.map(([id,n])=>`<div class="tline"><div class="pl">${av(id,"sm")}<span>${P[id].name}</span></div><span class="num" style="font-size:22px;font-weight:900">${n} 🏅</span></div>`).join("")}</div>`:`<div class="empty">Todavía no hay votos.</div>`}</div></div>`;
}


/* =====================================================================
   PRESENTACIÓN ÉPICA DEL CARA A CARA
   Si existe img/<id>-walkout.webm (vídeo con fondo transparente), el
   jugador aparece andando; si no, su foto entra con efecto cine.
   ===================================================================== */
const WALKOUTS = (CFG.WALKOUTS||[]);
let VSX=null;
function vsMedia(id,side){
  if(WALKOUTS.includes(id)) return `<video class="vx-img" src="img/${id}-walkout.webm" autoplay muted playsinline preload="auto"></video>`;
  return `<img class="vx-img" src="${IMG(id)}" alt="" decoding="async">`;
}
function openVersus(id){
  const m=getMatch(id); if(!m.a||!m.b){ openMatch(id); return; }
  closeModal();
  const st=standings().byId, A=st[m.a], B=st[m.b], pA=P[m.a], pB=P[m.b], E=elo(), r=result(m), live=m.status==="live";
  const h2=A.h2h[m.b]||{w:0,l:0}, pa=probA(m.a,m.b);
  const pct=x=>x.pj?Math.round(x.pg/x.pj*100):0;
  const rows=[
    ["Puntos",A.pts,B.pts,""],["% victorias",pct(A),pct(B),"%"],["Sets ganados",A.sf,B.sf,""],
    ["Juegos ganados",A.jf,B.jf,""],["Índice MVP",Math.round(E.R[m.a]),Math.round(E.R[m.b]),""],["Victorias entre ellos",h2.w,h2.l,""]];
  const kick=m.playoff?PO_LABEL[m.id]:`Jornada ${m.j} · Partido ${FIXTURE.filter(f=>f.j===m.j).findIndex(f=>f.id===m.id)+1}`;
  const when=m.date?`${fmtDay(m.date)}${m.time?" · "+m.time:""}${m.court?" · "+m.court:""}`:"Fecha por fijar";
  const tick=(`${pA.name} <em>vs</em> ${pB.name} · Americana Legends Cup · `).repeat(5);
  const side=(id,p,R,cls)=>`<div class="vx-side ${cls}" style="--c:${p.color}">
      <div class="vx-name" aria-hidden="true">${esc(p.first)}</div>
      <div class="vx-fig">${vsMedia(id,cls)}</div>
      <div class="vx-tag"><b>${esc(p.name)}</b>${p.nick?`<em>“${esc(p.nick)}”</em>`:""}<span>${R.pos}º · ${R.pts} pts · ${R.pg}V ${R.pp}D</span></div>
    </div>`;
  const el=document.getElementById("modal");
  el.innerHTML=`<div class="vsx" role="dialog" aria-modal="true" aria-label="${esc(pA.name)} contra ${esc(pB.name)}" style="--ca:${pA.color};--cb:${pB.color}">
    <div class="vx-stage">
      <div class="vx-beams" aria-hidden="true"></div><div class="vx-haze" aria-hidden="true"></div>
      <canvas class="vx-fx" aria-hidden="true"></canvas>
      <div class="vx-kick">${esc(kick)}<span>Americana Legends Cup · Vol. 1</span></div>
      ${side(m.a,pA,A,"a")}${side(m.b,pB,B,"b")}
      <div class="vx-slash" aria-hidden="true"><div class="vx-track">${tick}</div></div>
      <div class="vx-rings" aria-hidden="true"><i></i><i></i></div>
      <div class="vx-vs-glow" aria-hidden="true"></div><div class="vx-vs" aria-hidden="true">VS</div>
      ${(live||r)?`<div class="vx-score num">${live?'<span class="livedot"></span>':""}${r&&r.wo?"WO":esc(scoreText(m))||"0-0"}</div>`:""}
      <div class="vx-flash" aria-hidden="true"></div>
    </div>
    <button class="vx-close" data-vx-close aria-label="Cerrar">×</button>
    <button class="vx-skip" data-vx-skip>Saltar ›</button>
    <section class="vx-tape" aria-label="Comparativa">
      <div class="vx-th"><div class="pl">${av(m.a)}<b>${esc(pA.first)}</b></div><span>Tale of the tape</span><div class="pl r"><b>${esc(pB.first)}</b>${av(m.b)}</div></div>
      ${rows.map(([k,a,b,u])=>{const t=(a+b)||1;return `<div class="vx-row"><b class="num" data-count="${a}" data-u="${u}">0${u}</b><div class="vx-bars"><span class="ba" style="--w:${a/t*100}%"></span><em>${k}</em><span class="bb" style="--w:${b/t*100}%"></span></div><b class="num" data-count="${b}" data-u="${u}">0${u}</b></div>`;}).join("")}
      <div class="vx-row form"><span>${formHtml(A.form)||"–"}</span><em>Últimos 5</em><span>${formHtml(B.form)||"–"}</span></div>
      <div class="vx-prob">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" class="trk"/><circle cx="60" cy="60" r="50" class="pa" style="--p:${pa}"/></svg>
        <div><small>Probabilidad según el algoritmo</small><b><span style="color:${pA.color}">${pA.first} ${Math.round(pa*100)}%</span> · <span style="color:${pB.color}">${Math.round(100-pa*100)}% ${pB.first}</span></b><span class="mini">${esc(when)}</span></div>
      </div>
      <div class="btnrow"><button class="btn ball" data-vx-match="${m.id}">${live?"Ver marcador en directo":r?"Ver el partido":"Pronosticar y gestionar"}</button><button class="btn ghost" data-vx-replay="${m.id}">↻ Repetir</button></div>
    </section>
  </div>`;
  document.body.style.overflow="hidden";
  const root=el.querySelector(".vsx"); const lite=document.documentElement.classList.contains("lite");
  if(lite) root.classList.add("lite");
  const fx=lite?{burst(){},stop(){}}:startFx(root);
  if(!lite){ let f=0; const t0=performance.now(); (function c(t){ f++; if(t-t0<900) requestAnimationFrame(c); else if(f/((t-t0)/1000)<28){ root.classList.add("lite"); fx.stop(); } })(t0); }
  const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T=[]; const at=(ms,f)=>T.push(setTimeout(f,reduced?0:ms));
  at(150,()=>root.classList.add("s1"));
  at(800,()=>root.classList.add("s2"));
  at(1550,()=>{ root.classList.add("s3"); if(!reduced){ fx.burst(); if(navigator.vibrate) navigator.vibrate([30,40,60]); } });
  at(3300,()=>tape());
  function tape(){ root.classList.add("s1","s2","s3","s4"); root.querySelectorAll("[data-count]").forEach(n=>countUp(n,reduced)); }
  VSX={stop(){ T.forEach(clearTimeout); fx.stop(); }, skip(){ T.forEach(clearTimeout); tape(); }};
}
function closeVersus(){ if(VSX){ VSX.stop(); VSX=null; } }
function countUp(n,instant){
  const to=+n.dataset.count, u=n.dataset.u||""; if(instant){ n.textContent=to+u; return; }
  const t0=performance.now(), d=900;
  const step=t=>{ const k=Math.min(1,(t-t0)/d), e=1-Math.pow(1-k,3); n.textContent=Math.round(to*e)+u; if(k<1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
/* Partículas: polvo en suspensión bajo los focos + estallido de chispas en el VS */
function startFx(root){
  const cv=root.querySelector(".vx-fx"), cx=cv.getContext("2d"); let W,H,run=true; const dpr=1;
  const size=()=>{ W=cv.clientWidth; H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr; cx.setTransform(dpr,0,0,dpr,0,0); };
  size(); addEventListener("resize",size);
  const dust=Array.from({length:38},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.3,v:Math.random()*.35+.08,a:Math.random()*.5+.15}));
  let sparks=[];
  const ca=getComputedStyle(root).getPropertyValue("--ca").trim(), cb=getComputedStyle(root).getPropertyValue("--cb").trim();
  function frame(){
    if(!run) return;
    if(document.hidden){ requestAnimationFrame(frame); return; }
    cx.clearRect(0,0,W,H);
    cx.fillStyle="#cfe2ff"; for(const d of dust){ d.y-=d.v; d.x+=Math.sin(d.y/40)*.15; if(d.y<-5){d.y=H+5;d.x=Math.random()*W;} cx.globalAlpha=d.a; cx.fillRect(d.x,d.y,d.r*1.6,d.r*1.6); }
    sparks=sparks.filter(s=>s.l>0);
    for(const s of sparks){ s.vx*=.985; s.vy=s.vy*.985+.12; s.x+=s.vx; s.y+=s.vy; s.l-=1;
      cx.globalAlpha=Math.min(1,s.l/40); cx.strokeStyle=s.c; cx.lineWidth=s.w; cx.beginPath(); cx.moveTo(s.x,s.y); cx.lineTo(s.x-s.vx*3,s.y-s.vy*3); cx.stroke(); }
    cx.globalAlpha=1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    burst(){ const x=W/2,y=H*.46, cols=["#E3FF3B","#FFFFFF","#F3C64E",ca,cb];
      for(let i=0;i<90;i++){ const a=Math.random()*6.283, v=Math.random()*11+3; sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,l:40+Math.random()*50,c:cols[i%cols.length],w:Math.random()*2+1}); } },
    stop(){ run=false; removeEventListener("resize",size); }
  };
}

/* =====================================================================
   Ventanas
   ===================================================================== */
function showModal(html){ document.getElementById("modal").innerHTML=`<div class="modal" data-backdrop><div class="sheet" role="dialog" aria-modal="true"><button class="close" data-close aria-label="Cerrar">×</button>${html}</div></div>`; document.body.style.overflow="hidden"; }
function closeModal(){ closeVersus(); S.modal=null; document.getElementById("modal").innerHTML=""; document.body.style.overflow=""; }

function cmpTable(a,b){
  const st=standings().byId, A=st[a], B=st[b], h2=A.h2h[b]||{w:0,l:0}, pa=probA(a,b);
  const pct=x=>x.pj?Math.round(x.pg/x.pj*100)+"%":"–";
  const c=(va,k,vb,hi,na,nb)=>{const ba=hi?na>nb:na<nb, bb=hi?nb>na:nb<na; return `<tr><td class="${ba?"better":""}">${va}</td><td class="k">${k}</td><td class="${bb?"better":""}">${vb}</td></tr>`;};
  return `<table class="cmp">
    ${c(A.pos+"º","Posición",B.pos+"º",false,A.pos,B.pos)}${c(A.pts,"Puntos",B.pts,true,A.pts,B.pts)}${c(pct(A),"% victorias",pct(B),true,A.pj?A.pg/A.pj:0,B.pj?B.pg/B.pj:0)}
    ${c(sign(A.ds),"Diferencia de sets",sign(B.ds),true,A.ds,B.ds)}${c(sign(A.dj),"Diferencia de juegos",sign(B.dj),true,A.dj,B.dj)}
    ${c(`${A.tbW}-${A.tbL}`,"Tie-breaks",`${B.tbW}-${B.tbL}`,true,A.tbW-A.tbL,B.tbW-B.tbL)}${c(`${A.stW}-${A.stL}`,"Super tie-breaks",`${B.stW}-${B.stL}`,true,A.stW-A.stL,B.stW-B.stL)}
    <tr><td>${formHtml(A.form)||"–"}</td><td class="k">Últimos 5</td><td>${formHtml(B.form)||"–"}</td></tr>
    ${c(h2.w,"Victorias entre ellos",h2.l,true,h2.w,h2.l)}
    ${c((pa*100).toFixed(0)+"%","Probabilidad (algoritmo)",(100-pa*100).toFixed(0)+"%",true,pa,1-pa)}</table>`;
}
function openMatch(id){
  S.modal=()=>openMatch(id);
  const m=getMatch(id), r=result(m);
  if(!m.a||!m.b){ showModal(`<div class="sheet-body"><h3>Por decidir</h3><p>Este cruce se completa cuando acabe la ronda anterior.</p></div>`); return; }
  const prev=FIXTURE.filter(f=>f.id!==id&&((f.a===m.a&&f.b===m.b)||(f.a===m.b&&f.b===m.a))).map(f=>getMatch(f.id)).filter(x=>result(x));
  let h=poster(m,{still:true})+`<div class="sheet-body"><button class="btn ball vx-open" data-versus="${id}">▶ Ver presentación del cara a cara</button>`;
  if(m.status==="live"||r) h+=scoreboard(m);
  h+=`<h3 style="margin-top:14px">Cara a cara</h3>${cmpTable(m.a,m.b)}`;
  if(prev.length) h+=`<p class="mini">Ya se enfrentaron: ${prev.map(x=>`${nm(x.a)} ${scoreText(x)} ${nm(x.b)}`).join("; ")}</p>`;
  if(!r&&m.status!=="live") h+=`<h3 style="margin-top:16px">Tu pronóstico</h3>${S.me?predCard(m):`<p class="mini">Elige quién eres en la pestaña Pronósticos para votar.</p>`}`;
  h+=`<h3 style="margin-top:16px">Gestionar partido</h3>`;
  if(!r) h+=`<div class="f3"><div><label for="md">Día</label><input type="date" id="md" value="${esc(m.date||"")}"></div><div><label for="mt">Hora</label><input type="time" id="mt" value="${esc(m.time||"")}"></div><div><label for="mc">Pista</label><input id="mc" value="${esc(m.court||"")}" placeholder="Club, pista…" maxlength="40"></div></div>`;
  h+=`<div class="btnrow">
    ${!r?`<button class="btn ball" data-act="live" data-id="${id}">${m.status==="live"?"Seguir marcador en directo":"Empezar marcador en directo"}</button><button class="btn ghost" data-act="details" data-id="${id}">Guardar día y pista</button>`:""}
    <button class="btn ghost" data-act="result" data-id="${id}">${r?"Corregir resultado":"Meter resultado final"}</button>
    ${!r?`<button class="btn ghost" data-act="wo" data-id="${id}">Incomparecencia (WO)</button>`:""}
    ${(r||m.status==="live")?`<button class="btn danger" data-act="reset" data-id="${id}">Borrar resultado</button>`:""}
  </div></div>`;
  showModal(h);
}

function openPlayer(id){
  S.modal=()=>openPlayer(id);
  const R=standings().byId[id], E=elo(), p=P[id], pct=R.pj?Math.round(R.pg/R.pj*100):0;
  const stats=[[R.pos+"º","Posición"],[R.pts,"Puntos"],[R.pj,"Partidos"],[pct+"%","Victorias"],[`${R.sf}-${R.sc}`,"Sets"],[`${R.jf}-${R.jc}`,"Juegos"],
    [`${R.tbW}-${R.tbL}`,"Tie-breaks"],[`${R.stW}-${R.stL}`,"Super tie-breaks"],[R.rem,"Remontadas"],[R.bag,"Roscos (6-0)"],
    [R.streak>0?R.streak+"V":R.streak<0?(-R.streak)+"D":"–","Racha actual"],[R.best,"Mejor racha"],[E.R[id].toFixed(0),"Índice MVP"]];
  const hs=E.hist[id]; let chart="";
  if(hs.length>1){
    const W=600,H=150,pd=26,mn=Math.min(...hs,1450),mx=Math.max(...hs,1550);
    const pts=hs.map((r,i)=>[pd+i*(W-2*pd)/(hs.length-1),H-pd-(r-mn)/(mx-mn)*(H-2*pd)]), y0=H-pd-(1500-mn)/(mx-mn)*(H-2*pd);
    chart=`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del índice"><text x="${pd}" y="14" font-size="12" fill="#5B6A85">Evolución del índice MVP (1500 = inicio)</text><line x1="${pd}" x2="${W-pd}" y1="${y0}" y2="${y0}" stroke="#D3DDEC" stroke-dasharray="4 4"/><polyline fill="none" stroke="${p.color}" stroke-width="4" stroke-linejoin="round" points="${pts.map(x=>x.join(",")).join(" ")}"/>${pts.map(x=>`<circle cx="${x[0]}" cy="${x[1]}" r="4" fill="#0A1530"/>`).join("")}</svg>`;
  }
  const rivals=PLAYERS.filter(x=>x.id!==id).map(x=>{const h=R.h2h[x.id]||{w:0,l:0};return `<div class="tline"><div class="pl">${av(x.id,"sm")}<span>${x.first}</span></div><span class="num" style="font-size:22px;font-weight:900">${h.w}–${h.l}</span></div>`;}).join("");
  const next=FIXTURE.filter(f=>f.a===id||f.b===id).map(f=>getMatch(f.id)).find(m=>!result(m));
  showModal(playerPoster(id)+`<div class="sheet-body">${p.nick||p.bio?`<div class="bio" style="--c:${p.color}">${p.nick?`<b>“${esc(p.nick)}”</b>`:""}${p.style?`<span>${esc(p.style)}</span>`:""}${p.bio?`<p>${esc(p.bio)}</p>`:""}</div>`:""}<div class="statgrid">${stats.map(s=>`<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join("")}</div>
    ${chart?`<div class="panel" style="margin-top:12px">${chart}</div>`:""}
    ${next?`<h3 style="margin-top:16px">Próximo partido</h3>${matchRow(next)}`:""}
    <h3 style="margin-top:16px">Contra cada rival</h3><div class="panel">${rivals}</div>
    <h3 style="margin-top:16px">Resultados</h3>${R.res.length?`<div class="mlist">${R.res.slice().reverse().map(matchRow).join("")}</div>`:`<div class="empty">Todavía sin partidos jugados.</div>`}</div>`);
}

function requirePin(then){
  if(getPin() && (Store.db || getPin()===CFG.LOCAL_PIN)) return then();
  const back=S.modal; S.modal=null;
  showModal(`<div class="sheet-body"><h3>PIN de la liga</h3><p class="mini">Para tocar resultados hace falta el PIN del grupo. Solo se pide una vez en cada móvil.</p><input id="pin" inputmode="numeric" autocomplete="off" aria-label="PIN"><div class="err" id="pinerr"></div><div class="btnrow"><button class="btn" id="pinok">Entrar</button></div></div>`);
  const ok=async()=>{ const v=document.getElementById("pin").value.trim();
    if(await Store.checkPin(v)){ localStorage.setItem("am_pin",v); closeModal(); then(); }
    else document.getElementById("pinerr").textContent="PIN incorrecto. Pídeselo al organizador."; };
  document.getElementById("pinok").onclick=ok; document.getElementById("pin").onkeydown=e=>{if(e.key==="Enter")ok();}; document.getElementById("pin").focus();
}

function openResult(id){
  S.modal=null;
  const m=getMatch(id), sets=m.status==="done"&&m.sets?m.sets:[], v=(i,s)=>sets[i]?sets[i][s]:"";
  showModal(`<div class="sheet-body"><h3>Resultado final</h3><p class="mini">Juegos de cada set. Con 1-1, el tercero es el super tie-break a 10.</p>
   <div class="setin"><span></span><span class="h">Set 1</span><span class="h">Set 2</span><span class="h">Super TB</span></div>
   ${["a","b"].map(s=>`<div class="setin"><div class="pl">${av(m[s],"sm")}<span>${nm(m[s])}</span></div>${[0,1,2].map(i=>`<input inputmode="numeric" id="r${s}${i}" value="${v(i,s)}" aria-label="${nm(m[s])} set ${i+1}">`).join("")}</div>`).join("")}
   <details style="margin-top:8px"><summary class="mini">Puntos de los tie-breaks (opcional)</summary>
   ${["a","b"].map(s=>`<div class="setin"><div class="pl"><span>${nm(m[s])}</span></div>${[0,1].map(i=>`<input inputmode="numeric" id="t${s}${i}" value="${sets[i]&&sets[i].tb?sets[i].tb[s]:""}" aria-label="Tie-break set ${i+1}">`).join("")}<span></span></div>`).join("")}</details>
   <div class="err" id="rerr"></div><div class="btnrow"><button class="btn" id="rsave">Guardar resultado</button><button class="btn ghost" data-open-match="${id}">Cancelar</button></div></div>`);
  document.getElementById("rsave").onclick=async()=>{
    const out=[]; let err="";
    for(let i=0;i<3;i++){
      const xa=document.getElementById("ra"+i).value.trim(), xb=document.getElementById("rb"+i).value.trim();
      if(xa===""&&xb==="") continue;
      const s={a:+xa,b:+xb}; if(!Number.isInteger(s.a)||!Number.isInteger(s.b)){err="Solo números enteros.";break;}
      if(i===2) s.st=true;
      if(!setDone(s)){ err=i===2?"El super tie-break se gana a 10 con 2 de diferencia (10-8, 11-9…).":`El set ${i+1} no es válido (6-x con 2 de diferencia, 7-5 o 7-6).`; break; }
      if(i<2&&Math.max(s.a,s.b)===7&&Math.min(s.a,s.b)===6){ const ta=document.getElementById("ta"+i).value.trim(), tb=document.getElementById("tb"+i).value.trim(); if(ta!==""&&tb!=="") s.tb={a:+ta,b:+tb}; }
      out.push(s);
    }
    if(!err){ const w=setsWon(out);
      if(out.length<2) err="Faltan sets.";
      else if(out.length===2&&w.a===1) err="Con 1-1 hay que meter el super tie-break.";
      else if(out.length===3&&((out[0].a>out[0].b)===(out[1].a>out[1].b))) err="Si alguien gana los dos primeros sets no hay super tie-break.";
      else if(w.a<2&&w.b<2) err="Nadie ha llegado a 2 sets."; }
    if(err){ document.getElementById("rerr").textContent=err; return; }
    const base={...(Store.matches[id]||{})}; delete base.hist; delete base.woWinner;
    const doc={...base,status:"done",sets:out}; if(m.playoff){doc.a=m.a;doc.b=m.b;}
    if(await Store.setMatch(id,doc)){ toast("Resultado guardado"); openMatch(id); }
  };
}

function openScorer(id){
  S.modal=()=>openScorer(id);
  const m=getMatch(id), el=document.getElementById("modal");
  el.innerHTML=`<div class="scorer" role="dialog" aria-modal="true" aria-label="Marcador en directo">
    ${scoreboard(m)}<p class="mode">${m.status==="done"?"Partido terminado":liveMode(m)}</p>
    <div class="tapzone">${["a","b"].map(s=>`<button class="tap" data-tap="${s}" style="--c:${col(m[s])}" ${m.status==="done"?"disabled":""}><img src="${IMG(m[s])}" alt=""><span>${nm(m[s])}</span><small>+1</small></button>`).join("")}</div>
    <div class="btnrow" style="justify-content:center;margin:0"><button class="btn ghost" id="undo" ${(m.hist&&m.hist.length)?"":"disabled"}>Deshacer</button><button class="btn" id="sclose">Cerrar</button></div></div>`;
  document.body.style.overflow="hidden";
  el.querySelectorAll("[data-tap]").forEach(b=>b.onclick=()=>{
    const cur=getMatch(id), nx=liveAdd(cur,b.dataset.tap); if(!nx) return;
    const hist=[...(cur.hist||[]),JSON.stringify(cur.sets||[])].slice(-40);
    const doc={...(Store.matches[id]||{}),status:nx.done?"done":"live",sets:nx.sets,hist}; if(cur.playoff){doc.a=cur.a;doc.b=cur.b;}
    if(navigator.vibrate) navigator.vibrate(12);
    Store.setMatch(id,doc); if(nx.done) toast(`¡Partido para ${nm(cur[setsWon(nx.sets).a===2?"a":"b"])}!`);
  });
  document.getElementById("undo").onclick=()=>{ const cur=getMatch(id); if(!cur.hist||!cur.hist.length) return; const hist=[...cur.hist], prev=JSON.parse(hist.pop()); Store.setMatch(id,{...(Store.matches[id]||{}),status:"live",sets:prev,hist}); };
  document.getElementById("sclose").onclick=()=>openMatch(id);
}

/* =====================================================================
   Eventos
   ===================================================================== */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-tab],[data-open-match],[data-open-player],[data-close],[data-backdrop],[data-act],[data-pred],[data-inv],[data-vote],[data-mvpj],#export,[data-versus],[data-vx-close],[data-vx-skip],[data-vx-match],[data-vx-replay]");
  if(!t) return;
  if(t.hasAttribute("data-backdrop")&&e.target!==t) return;
  if(t.dataset.tab){ S.tab=t.dataset.tab; history.replaceState(null,"","#"+S.tab); closeModal(); render(); window.scrollTo(0,0); return; }
  if(t.hasAttribute("data-close")||t.hasAttribute("data-backdrop")){ closeModal(); return; }
  if(t.dataset.inv){ S.inv=t.dataset.inv==="1"; render(); return; }
  if(t.dataset.mvpj){ S.mvpJ=+t.dataset.mvpj; render(); return; }
  if(t.dataset.vote){
    if(!S.me){ toast("Primero elige quién eres"); return; }
    if(t.dataset.vote===S.me){ toast("No puedes votarte a ti mismo"); return; }
    const J=S.mvpJ||currentJ();
    Store.setVote(`J${J}__${S.me}`,{j:J,v:S.me,c:t.dataset.vote,t:Date.now()}).then(ok=>ok&&toast(`Voto para ${nm(t.dataset.vote)}`));
    return;
  }
  if(t.id==="export"){
    const blob=new Blob([JSON.stringify({exportado:new Date().toISOString(),partidos:Store.matches,pronosticos:Store.preds,votosMVP:Store.votes},null,2)],{type:"application/json"});
    const u=URL.createObjectURL(blob), l=document.createElement("a"); l.href=u; l.download="legends-cup-datos.json"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000);
    return;
  }
  if(t.dataset.versus){ openVersus(t.dataset.versus); return; }
  if(t.hasAttribute("data-vx-close")){ closeModal(); return; }
  if(t.hasAttribute("data-vx-skip")){ VSX&&VSX.skip(); return; }
  if(t.dataset.vxMatch){ const id=t.dataset.vxMatch; closeModal(); openMatch(id); return; }
  if(t.dataset.vxReplay){ openVersus(t.dataset.vxReplay); return; }
  if(t.dataset.openMatch){ openMatch(t.dataset.openMatch); return; }
  if(t.dataset.openPlayer){ openPlayer(t.dataset.openPlayer); return; }
  if(t.dataset.pred){
    if(!S.me){ toast("Primero elige quién eres en Pronósticos"); return; }
    const id=t.dataset.pred, key=`${id}__${S.me}`, prev=Store.preds[key], m=getMatch(id);
    if(result(m)||m.status==="live"){ toast("Este partido ya ha empezado"); return; }
    const r=t.dataset.r||(prev&&prev.w===t.dataset.w?prev.r:"20");
    Store.setPred(key,{m:id,v:S.me,w:t.dataset.w,r,t:Date.now()}).then(ok=>ok&&toast("Pronóstico guardado"));
    return;
  }
  if(t.dataset.act){
    const id=t.dataset.id, act=t.dataset.act;
    const vals = act==="details" ? {date:document.getElementById("md")?.value||"", time:document.getElementById("mt")?.value||"", court:(document.getElementById("mc")?.value||"").slice(0,40)} : null;
    requirePin(async()=>{
      const m=getMatch(id), base={...(Store.matches[id]||{})}; if(m.playoff){base.a=m.a;base.b=m.b;}
      if(act==="live"){ if(m.status!=="live") Store.setMatch(id,{...base,status:"live",sets:[],hist:[]}); openScorer(id); }
      if(act==="result") openResult(id);
      if(act==="details"){ if(await Store.setMatch(id,{...base,...vals})) toast("Guardado"); }
      if(act==="wo"){
        S.modal=null;
        showModal(`<div class="sheet-body"><h3>Incomparecencia</h3><p class="mini">Cuenta como victoria 2-0 (3 puntos) sin sumar juegos. ¿Quién gana?</p><div class="pickrow"><button class="pick" id="woa">${av(m.a,"sm")}${nm(m.a)}</button><button class="pick" id="wob">${nm(m.b)}${av(m.b,"sm")}</button></div><div class="btnrow"><button class="btn ghost" data-open-match="${id}">Cancelar</button></div></div>`);
        const set=async w=>{ if(await Store.setMatch(id,{...base,status:"wo",woWinner:w,sets:[]})){ toast("WO registrado"); openMatch(id);} };
        document.getElementById("woa").onclick=()=>set("a"); document.getElementById("wob").onclick=()=>set("b");
      }
      if(act==="reset"&&confirm("¿Borrar el resultado de este partido?")){
        if(await Store.setMatch(id,{date:base.date||"",time:base.time||"",court:base.court||"",status:"pending",sets:[]})){ toast("Resultado borrado"); openMatch(id);} }
    });
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&document.getElementById("modal").innerHTML) closeModal();
  if((e.key==="Enter"||e.key===" ")&&e.target.matches('[role="button"]')){ e.preventDefault(); e.target.click(); }
});
document.addEventListener("change",e=>{ if(e.target.id==="me"){ S.me=e.target.value; localStorage.setItem("am_me",S.me); render(); }
  if(e.target.id==="h2a"){ S.h2a=e.target.value; render(); } if(e.target.id==="h2b"){ S.h2b=e.target.value; render(); } });

/* Modo ligero automático: si el dispositivo va justo, se apagan los efectos más pesados */
(function(){
  if(sessionStorage.getItem("am_lite")==="1"){ document.documentElement.classList.add("lite"); return; }
  const measure=()=>{ let f=0; const t0=performance.now();
    (function c(t){ f++; if(t-t0<1500) requestAnimationFrame(c); else if(f/((t-t0)/1000)<30 && !document.hidden){
      document.documentElement.classList.add("lite"); try{sessionStorage.setItem("am_lite","1");}catch(e){} } })(t0); };
  // espera a que la página termine de cargar y se quede quieta
  const go=()=>setTimeout(measure,2500);
  if(document.readyState==="complete") go(); else addEventListener("load",go,{once:true});
})();

/* Precarga de las caras para que los carteles aparezcan sin saltos */
PLAYERS.forEach(p=>{ const i=new Image(); i.decoding="async"; i.src=IMG(p.id); });
render();
Store.init();
