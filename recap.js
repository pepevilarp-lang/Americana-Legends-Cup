/* =====================================================================
   RECAP DE LA PRIMERA VUELTA · estilo «Wrapped»
   Historias a pantalla completa con los números de cada jugador en la ida
   (J1–J9) y «tu temporada en una canción», que suena mientras se revela.
   - Se abre solo la primera vez a partir de RECAP_FROM (config.js) y desde
     el aviso especial (#recap). Antes de esa fecha nadie lo ve, salvo con #recap-preview.
   - Audio: preview oficial de 30 s de Apple (API pública de iTunes, sin clave).
     Botón para abrir la canción en Spotify.
   ===================================================================== */
"use strict";
(function(){
const RECAP_FROM = CFG.RECAP_FROM || "2026-12-26";   // último día de la ida
const IDA = 9;

/* ---------- Canciones: cada jugador recibe una, sin repetir ---------- */
const pl=(n,a,b)=>`${n} ${n===1?a:b}`;
const SONGS = {
  bichota:  {t:"BICHOTA",              a:"KAROL G",                       id:1560071918, why:x=>`Líder de la primera vuelta con ${x.R.pts} puntos. Aquí se hace lo que diga quien va primero.`},
  silence:  {t:"The Sound of Silence", a:"Simon & Garfunkel",             id:192480260,  why:x=>`${x.R.pj} partidos, 0 victorias. Hay silencios que lo dicen todo… y una segunda vuelta para romperlo.`},
  gasolina: {t:"Gasolina",             a:"Daddy Yankee",                  id:1786000124, ok:x=>x.R.best>=2, why:x=>`${x.R.best} victorias seguidas. Ese depósito no se vacía nunca.`},
  tusa:     {t:"Tusa",                 a:"KAROL G & Nicki Minaj",         id:1560072127, ok:x=>x.tight>=1, why:x=>`${pl(x.tight,"derrota","derrotas")} por la mínima. Tan cerca… y tan lejos. Esa tusa se cura en febrero.`},
  safaera:  {t:"Safaera",              a:"Bad Bunny, Jowell & Randy, Ñengo Flow", id:1500776935, ok:x=>x.stb>=1, why:x=>`${pl(x.stb,"super tie-break","super tie-breaks")}. Tus partidos cambian de ritmo cada dos minutos y la grada lo agradece.`},
  calma:    {t:"Con Calma",            a:"Daddy Yankee & Snow",           id:1449106558, ok:x=>x.easy>=1, why:x=>`${pl(x.easy,"victoria","victorias")} sin despeinarte${x.R.bag?` y ${x.R.bag} ${x.R.bag===1?"rosco":"roscos"} repartidos`:""}. Todo con calma.`},
  despacito:{t:"Despacito",            a:"Luis Fonsi & Daddy Yankee",     id:1447401620, ok:x=>x.R.rem>=1||(x.firstLost&&x.R.pg>x.R.pp), why:x=>x.R.rem?`${pl(x.R.rem,"remontada","remontadas")} después de perder el primer set. Despacito, pero siempre llegas.`:`Empezaste perdiendo y acabas la ida en positivo. Despacito, pero llegas.`},
  kuduro:   {t:"Danza Kuduro",         a:"Don Omar & Lucenzo",            id:1440636498, ok:x=>x.R.pj>0&&x.R.pj===x.maxPj, why:x=>`${x.R.pj} partidos: nadie ha pisado más la pista que tú. No paras quieto.`},
  provenza: {t:"PROVENZA",             a:"KAROL G",                       id:1619425410, ok:x=>x.R.pj<=x.maxPj-2, why:x=>x.R.pj?`Solo ${x.R.pj} ${x.R.pj===1?"partido":"partidos"} en toda la ida. ¿Estabas de vacaciones?`:`Ni un partido en la ida. ¿Estabas de vacaciones?`},
  callaita: {t:"Callaita",             a:"Bad Bunny & Tainy",             id:1622046245, ok:x=>x.R.pj>0&&x.R.pos<=4&&x.votes<=1, why:x=>`${x.R.pos}.º de la tabla y casi nadie te vota MVP. Sin hacer ruido, pero ahí arriba.`},
  ojitos:   {t:"Ojitos Lindos",        a:"Bad Bunny & Bomba Estéreo",     id:1622045962, why:x=>`${x.votes} votos MVP: nadie ha recibido más. La grada solo tiene ojos para ti.`},
  titi:     {t:"Tití Me Preguntó",     a:"Bad Bunny",                     id:1622045635, why:x=>`El mejor pronosticador de la ida: ${x.pred.hits} de ${x.pred.n} aciertos. Todos te preguntan quién gana.`},
  losiento: {t:"Lo Siento BB:/",       a:"Tainy, Bad Bunny & Julieta Venegas", id:1586673104, ok:x=>x.R.pj>0&&x.R.pos>=8, why:x=>`Cierras la ida ${x.R.pos}.º. Lo siento, pero la segunda vuelta te debe una.`},
  paso:     {t:"Lo Que Pasó, Pasó",    a:"Daddy Yankee",                  id:1786000220, ok:x=>x.R.pj>0&&x.R.pp>=x.R.pg, why:x=>`Balance de ${x.R.pg}–${x.R.pp}. Lo que pasó, pasó: en febrero, borrón y cuenta nueva.`},
  bonito:   {t:"Me Porto Bonito",      a:"Bad Bunny & Chencho Corleone",  id:1622045634, ok:x=>x.R.pj>0, why:x=>`${x.R.pg}–${x.R.pp} y ${x.R.pos}.º puesto. Una ida sin sobresaltos: te has portado bonito.`},
};
const spotifyUrl = s => `https://open.spotify.com/search/${encodeURIComponent(s.t+" "+s.a.split(/,|&/)[0].trim())}`;

/* ---------- Números de la ida ---------- */
function idaStats(){
  return cached("recap",()=>{
    const st=standings(IDA), by=st.byId;
    const idaM=FIXTURE.filter(f=>f.j<=IDA).map(f=>getMatch(f.id)).filter(m=>result(m)).sort((x,y)=>sortKey(x)<sortKey(y)?-1:1);
    // Elo solo con la ida (misma fórmula que la app)
    const E=Object.fromEntries(PLAYERS.map(p=>[p.id,1500])), up={};
    idaM.filter(m=>!result(m).wo).forEach(m=>{ const r=result(m), ea=1/(1+Math.pow(10,(E[m.b]-E[m.a])/400));
      const sA=r.w==="a"?(r.sb===0?1:.8):(r.sa===0?0:.2), d=36*(sA-ea); E[m.a]+=d; E[m.b]-=d;
      const wid=r.w==="a"?m.a:m.b, pe=r.w==="a"?ea:1-ea; if(!up[wid]||pe<up[wid].pe) up[wid]={m,pe}; });
    const eloRank=PLAYERS.map(p=>p.id).sort((a,b)=>E[b]-E[a]);
    // Votos MVP de la ida
    const votes={}, jWins={};
    for(let j=1;j<=IDA;j++){ const t={}; Object.values(Store.votes).filter(v=>v.j===j&&P[v.c]).forEach(v=>{ t[v.c]=(t[v.c]||0)+1; votes[v.c]=(votes[v.c]||0)+1; });
      const mx=Math.max(0,...Object.values(t)); if(mx>0) Object.entries(t).filter(e=>e[1]===mx).forEach(e=>jWins[e[0]]=(jWins[e[0]]||0)+1); }
    // Pronósticos de la ida
    const pred={};
    Object.values(Store.preds).forEach(p=>{ const fx=FX[p.m]; if(!fx||fx.j>IDA||!P[p.v]) return; const r=result(getMatch(p.m)); if(!r||r.wo) return;
      const T=pred[p.v]=pred[p.v]||{n:0,hits:0,exact:0}; T.n++; if(p.w===r.w){ T.hits++; if(p.r===((r.sa+r.sb)===3?"21":"20")) T.exact++; } });
    const out={};
    PLAYERS.forEach(p=>{
      const R=by[p.id], x={id:p.id,R,elo:Math.round(E[p.id]),eloPos:eloRank.indexOf(p.id)+1,votes:votes[p.id]||0,mvpJ:jWins[p.id]||0,pred:pred[p.id]||{n:0,hits:0,exact:0},upset:up[p.id]||null};
      x.stb=R.stW+R.stL;
      x.tight=0; x.easy=0;
      R.res.forEach(m=>{ const r=result(m), me=m.a===p.id?"a":"b", won=r.w===me; if(r.wo) return;
        if(!won&&r.sa+r.sb===3) x.tight++; const conc=me==="a"?r.gb:r.ga; if(won&&r.sa+r.sb===2&&conc<=4) x.easy++; });
      x.tight+=R.tbL;
      x.firstLost=R.form[0]==="L";
      // Rival fetiche y némesis
      const h=Object.entries(R.h2h);
      const fet=h.filter(([,v])=>v.w>0).sort((a,b)=>(b[1].w-b[1].l)-(a[1].w-a[1].l)||b[1].pts-a[1].pts)[0];
      const nem=h.filter(([,v])=>v.l>0).sort((a,b)=>(b[1].l-b[1].w)-(a[1].l-a[1].w)||a[1].pts-b[1].pts)[0];
      x.fetiche=fet?fet[0]:null; x.nemesis=nem?nem[0]:null;
      // Partido de tu temporada: la victoria más épica (o la derrota más dura si no hay)
      let best=null, bs=-1e9;
      R.res.forEach(m=>{ const r=result(m); if(r.wo) return; const me=m.a===p.id?"a":"b", won=r.w===me;
        let s=won?100:0; const fs=r.sets[0]; if(won&&fs&&(me==="a"?fs.a<fs.b:fs.b<fs.a)) s+=40; if(r.sets.some(z=>z.st)) s+=30;
        if(won&&up[p.id]&&up[p.id].m.id===m.id) s+=35; s+=won?((me==="a"?r.ga-r.gb:r.gb-r.ga)):-(Math.abs(r.ga-r.gb));
        if(s>bs){ bs=s; best={m,won}; } });
      x.match=best;
      out[p.id]=x;
    });
    // Más/menos partidos, más votos, mejor pronosticador
    const pjs=PLAYERS.map(p=>by[p.id].pj), maxPj=Math.max(...pjs), minPj=Math.min(...pjs);
    const maxVotes=Math.max(0,...Object.values(votes));
    PLAYERS.forEach(p=>out[p.id].maxPj=maxPj);
    const bestPred=Object.entries(pred).filter(([,v])=>v.n>=5).sort((a,b)=>(b[1].hits+b[1].exact*2)/b[1].n-(a[1].hits+a[1].exact*2)/a[1].n)[0];
    // Reparto de canciones: puntuación por perfil, la más alta se queda la canción
    const cand=[];
    PLAYERS.forEach(p=>{ const x=out[p.id], R=x.R, add=(k,s)=>{ if(s>0) cand.push({id:p.id,k,s}); };
      add("silence", R.pj>0&&R.pg===0?1000:0);
      add("bichota", R.pj>0&&R.pos===1?900:0);
      add("losiento", R.pg>0&&R.pos===PLAYERS.length?500:0);
      add("provenza", maxPj-R.pj>=3&&R.pj===minPj?150+(maxPj-R.pj)*20:0);
      add("ojitos", x.votes>=2&&x.votes===maxVotes?130+x.votes*10:0);
      add("titi", bestPred&&bestPred[0]===p.id?125:0);
      add("gasolina", R.best>=3?100+R.best*40:0);
      add("despacito", (R.rem?90+R.rem*40:0)+(x.firstLost&&R.pg>R.pp?60:0));
      add("safaera", x.stb>=2?80+x.stb*35:0);
      add("tusa", x.tight>=2?80+x.tight*35:0);
      add("callaita", R.pos<=3&&R.pos>1&&x.votes<=1&&R.pj>0?110:0);
      add("calma", x.easy>=2?70+x.easy*25+R.bag*10:0);
      add("kuduro", R.pj===maxPj&&R.pj>=4?60+R.pj*5:0);
      add("paso", R.pp>R.pg&&R.pos>=6?60+(R.pp-R.pg)*10:0);
      Object.entries(SONGS).forEach(([k,S])=>{ if(S.ok&&S.ok(x)) add(k,1); });   // comodines: solo si la frase es cierta
    });
    cand.sort((a,b)=>b.s-a.s||a.id.localeCompare(b.id));
    const usedS=new Set(), song={};
    cand.forEach(c=>{ if(song[c.id]||usedS.has(c.k)) return; song[c.id]=c.k; usedS.add(c.k); });
    // Último recurso (muy improbable): se repite la canción neutra que encaje antes que poner una frase falsa
    PLAYERS.forEach(p=>{ if(!song[p.id]) song[p.id]=["bonito","provenza","paso"].find(k=>SONGS[k].ok(out[p.id]))||"bonito"; });
    PLAYERS.forEach(p=>out[p.id].song=song[p.id]);
    out.__total=idaM.length;
    return out;
  });
}

/* ---------- Música de fondo: una canción distinta en cada historia ---------- */
const BG = {
  liga:     {t:"Waka Waka (Esto es África)", a:"Shakira",                id:674461056},
  cifras:   {t:"Mi Gente",                   a:"J Balvin & Willy William", id:1444327839},
  honores:  {t:"Hasta el Amanecer",          a:"Nicky Jam",              id:1189391898},
  intro:    {t:"Vivir Mi Vida",              a:"Marc Anthony",           id:668743167},
  nums:     {t:"Shaky Shaky",                a:"Daddy Yankee",           id:1445050456},
  pos:      {t:"La Bicicleta",               a:"Carlos Vives & Shakira", id:1234665881},
  streak:   {t:"Dura",                       a:"Daddy Yankee",           id:1444855250},
  rivals:   {t:"Échame La Culpa",            a:"Luis Fonsi & Demi Lovato", id:1447401618},
  match:    {t:"Bailando",                   a:"Enrique Iglesias",       id:1443368808},
  crowd:    {t:"La Gozadera",                a:"Gente de Zona & Marc Anthony", id:1014994765},
};
BG.none=BG.nums; BG.thanks=BG.intro;

/* ---------- La liga entera en la ida ---------- */
const JUNIORS = CFG.JUNIORS || ["julian","tomas"];   // «comité junior»
const WD = ["domingos","lunes","martes","miércoles","jueves","viernes","sábados"];
function leagueStats(){
  return cached("recapLiga",()=>{
    const fx=FIXTURE.filter(f=>f.j<=IDA), t0=today();
    const L={played:0,games:0,sets:0,stb:0,wo:0,late:0,latePending:0,lateBy:{},longest:null,days:{},hours:{},preds:0,votes:0,dates:0,moved:0,live:0};
    fx.forEach(f=>{ const m=getMatch(f.id), r=result(m), end=JORNADAS[f.j-1][1];
      const late=r ? (m.date&&m.date>end) : (end<t0);
      if(late){ L.late++; if(!r) L.latePending++; [m.a,m.b].forEach(p=>L.lateBy[p]=(L.lateBy[p]||0)+1); }
      if(!r) return; L.played++;
      if(r.wo){ L.wo++; return; }
      L.sets+=r.sets.length; L.stb+=r.sets.filter(s=>s.st).length;
      const g=r.sets.reduce((s,z)=>s+(z.st?0:z.a+z.b),0); L.games+=g;
      if(!L.longest||g>L.longest.g) L.longest={m,g};
      if(m.date){ const[y,mo,d]=m.date.split("-").map(Number); const w=new Date(y,mo-1,d).getDay(); L.days[w]=(L.days[w]||0)+1; }
      if(m.time){ const h=m.time.slice(0,2); L.hours[h]=(L.hours[h]||0)+1; }
    });
    Object.values(Store.preds).forEach(p=>{ const f=FX[p.m]; if(f&&f.j<=IDA) L.preds++; });
    Object.values(Store.votes).forEach(v=>{ if(v.j<=IDA) L.votes++; });
    const per={}; Object.values(Store.log||{}).forEach(e=>{ if(!e||!e.txt) return;
      if(/^fijó /.test(e.txt)){ L.dates++; const k=e.txt.split(" para ")[0]; per[k]=(per[k]||0)+1; }
      if(/^empezó el marcador en directo/.test(e.txt)) L.live++; });
    L.moved=Object.values(per).reduce((s,n)=>s+Math.max(0,n-1),0);
    const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1])[0]||null;
    L.lateKing=top(L.lateBy); L.day=top(L.days); L.hour=top(L.hours);
    const O=Store.recapOpens||{}; L.opens=O.total||0;
    const ob=Object.entries(O).filter(([k])=>P[k]); L.opener=ob.sort((a,b)=>b[1]-a[1])[0]||null; L.openBy=Object.fromEntries(ob);
    L.hoursOnCourt=Math.round(L.games*5/60);   // a ojo: unos 5 minutos por juego
    return L;
  });
}

/* ---------- Bromas de la casa (editar aquí) ---------- */
const LORE = {
  alvaro:  "El DJ de la liga. Hoy la música la ponemos nosotros.",
  eduardo: "Más duro que el pan de tres días. Veamos si los números también.",
  joan:    "El Martillo. El frontón que desespera a media liga.",
  pepe:    "Revés de Andy Murray y pura magia. Veamos si había truco.",
  marc:    "Leyenda viva y patrocinador oficial de las cañas de después.",
  julian:  "El Pollo. Esta vez no te has escapado: aquí tienes tu ida.",
  carlos:  "El que deja la competición un mes cada semana… y nunca la deja.",
  marcos:  "El Caudillo. Dicen que te dan un palo y ganas igual.",
  pablo:   "Globos, cortadas y pesadillas de resaca para tus rivales.",
  tomas:   "Comité Junior: mucho pelo y Vichy Catalan en vena.",
};
function quip(k,x,L){
  const id=x.id, R=x.R, me=n=>n===id, late=(L.lateBy[id]||0);
  const Q=[];
  if(k==="nums"){
    if(me("carlos")&&R.pj) Q.push(`Dijiste que lo dejabas un mes. ${R.pj} partidos después, aquí sigues.`);
    else if(R.pp>=4) Q.push(`Has perdido más partidos que veces ha anunciado Rovira que deja de competir un mes. Y mira que son.`);
    if(R.pg>=5) Q.push(me("marcos")?`Con raqueta o con palo: ${R.pg} victorias.`:`${R.pg} victorias. Ni Marcos Pich con un palo.`);
    if(late>=2) Q.push(me("alvaro")?`${late} partidos aplazados: cambias de fecha como de canción en tus sesiones.`:`${late} partidos aplazados: cambias más de fecha que Álvaro de canción.`);
    if(R.pj&&R.pj<=x.maxPj-3) Q.push(me("julian")?`Solo ${R.pj} partidos. ¿Otra vez castigado?`:`Has desaparecido más que Julián cuando se escapó de casa.`);
  }
  if(k==="streak"){
    if(R.best>=3) Q.push(me("marc")?`${R.best} victorias seguidas. Esas cañas te las has ganado.`:`${R.best} seguidas: más rondas que una noche de cañas con Marc Huet.`);
    if(x.stb>=2) Q.push(me("tomas")?`Tus super tie-breaks tienen más gas que tu Vichy.`:`${x.stb} super tie-breaks: más burbujas que el Vichy de Tomás.`);
    if(R.bag>=1) Q.push(me("eduardo")?`Roscos más duros que el pan de tres días.`:`Repartir roscos: eso es más duro que el pan de tres días de Eduardo.`);
  }
  if(k==="rivals"&&x.nemesis){
    if(x.nemesis==="marcos") Q.push("Perder con Marcos no cuenta: juega bien hasta con un palo.");
    else if(x.nemesis==="pablo") Q.push("Caer ante los globos de Pablo… eso escuece el doble.");
    else if(x.nemesis==="joan") Q.push("Contra el frontón de Joan no se gana: se sobrevive.");
    else if(x.nemesis==="marc") Q.push("Contra Marc Huet hay que ir con casco. Avisado estabas.");
  }
  if(k==="crowd"){
    const o=L.openBy[id]||0;
    if(L.opener&&L.opener[0]===id&&o) Q.push(`Has entrado en la app ${fmtN(o)} veces. Nadie más. Esto ya es amor.`);
    else if(o) Q.push(`Has entrado en la app ${fmtN(o)} veces${me("tomas")?" (una por cada Vichy, calculamos)":""}.`);
  }
  return Q.length?`<p class="rc-quip">${esc(Q[0])}</p>`:"";
}

/* ---------- Audio: preview oficial de 30 s ---------- */
let PREV=null;
async function previews(){
  if(PREV) return PREV;
  try{
    const ids=[...new Set([...Object.values(SONGS),...Object.values(BG)].map(s=>s.id))].join(",");
    const r=await fetch(`https://itunes.apple.com/lookup?id=${ids}&country=es`).then(r=>r.json());
    PREV={}; (r.results||[]).forEach(t=>{ if(t.previewUrl) PREV[t.trackId]={url:t.previewUrl,art:(t.artworkUrl100||"").replace("100x100bb","600x600bb")}; });
    Object.values(PREV).forEach(p=>{ const a=new Audio(); a.preload="auto"; a.src=p.url; });   // precarga
  }catch(e){ PREV={}; }
  return PREV;
}
const audio=new Audio(); audio.preload="auto"; audio.loop=true;
let unlocked=false, curTrack=null, fadeT=null;
function unlockAudio(){ if(unlocked) return; unlocked=true; try{ audio.muted=true; const p=audio.play(); if(p) p.then(()=>{ audio.pause(); audio.muted=false; }).catch(()=>{ audio.muted=false; }); }catch(e){} }
function ramp(to,ms,done){ clearInterval(fadeT); const from=audio.volume, t0=Date.now(); fadeT=setInterval(()=>{ const k=Math.min(1,(Date.now()-t0)/ms); try{ audio.volume=from+(to-from)*k; }catch(e){} if(k>=1){ clearInterval(fadeT); done&&done(); } },40); }
function playTrack(id,onFail){
  if(id===curTrack) { if(id&&audio.paused) audio.play().catch(()=>{}); return; }
  curTrack=id;
  const start=()=>{ if(curTrack!==id) return; if(!id){ audio.pause(); return; }
    const p=PREV&&PREV[id]; if(!p){ audio.pause(); onFail&&onFail(); return; }
    audio.src=p.url; audio.currentTime=0; audio.volume=0;
    const pr=audio.play(); if(pr) pr.then(()=>ramp(1,700)).catch(()=>onFail&&onFail()); else ramp(1,700); };
  if(!audio.paused&&audio.src) ramp(0,260,start); else start();
}
function stopAudio(){ curTrack=null; clearInterval(fadeT); try{ audio.pause(); }catch(e){} }

/* ---------- Historias ---------- */
const fmtN=n=>Number(n).toLocaleString("es-ES");
const face=(id,cls="")=>`<span class="rc-face ${cls}" style="--c:${P[id].color}"><img src="${IMG(id)}" alt=""></span>`;
const nowPlaying=s=>s?`<div class="rc-np" aria-hidden="true"><span class="rc-np-eq"><i></i><i></i><i></i></span>${esc(s.t)} · ${esc(s.a)}</div>`:"";
function matchLine(m,me){ const r=result(m); const op=m.a===me?m.b:m.a; const sets=r.sets.map(s=>m.a===me?`${s.a}-${s.b}`:`${s.b}-${s.a}`).join(" · "); return {op,sets,j:m.j}; }

function slides(id){
  const X=idaStats(), x=X[id], R=x.R, p=P[id], S2=SONGS[x.song], L=leagueStats();
  const pct=Math.round(100*PLAYERS.filter(q=>X[q.id].R.jf<R.jf).length/(PLAYERS.length-1));
  const nm=i=>esc(P[i].first);
  const out=[]; const add=(k,d,h,track)=>out.push({k,d,h,track:track===undefined?(BG[k]&&BG[k].id):track});
  /* 1-3 · La liga (igual para todos) */
  add("liga",9000,`<div class="rc-kick">Seniors, Juniors:</div>
    <h1 class="rc-big">Empezó como una idea entre ${PLAYERS.length} amigos.</h1>
    <p class="rc-lead">Primera vuelta cerrada: <b>${fmtN(L.played)}</b> partidos, <b>${fmtN(L.games)}</b> juegos y <b>${fmtN(L.stb)}</b> super tie-breaks${L.opens?`. Habéis entrado en la app <b>${fmtN(L.opens)}</b> veces`:""}. Esto ya no es una pachanga: es una liga.</p>${nowPlaying(BG.liga)}`);
  const big=[[L.played,"partidos jugados"],[L.games,"juegos disputados"],[L.hoursOnCourt,"horas en pista (a ojo)"],[L.opens,"entradas a la app"],[L.preds,"pronósticos"],[L.votes,"votos MVP"]].filter(([v])=>v>0).slice(0,6);
  add("cifras",9000,`<h2 class="rc-h">La ida en cifras</h2><div class="rc-grid rc-grid3">${big.map(([v,l])=>`<div><b data-count="${v}">0</b><small>${l}</small></div>`).join("")}</div>
    ${L.day?`<p class="rc-lead">Día favorito de la liga: los <b>${WD[L.day[0]]}</b>${L.hour?`, sobre las <b>${+L.hour[0]}:00</b>`:""}.</p>`:""}${nowPlaying(BG.cifras)}`);
  const hon=[];
  hon.push(`<div><b data-count="${L.late}">0</b><small>partidos aplazados${L.latePending?` · ${L.latePending} aún por jugar`:""}</small></div>`);
  if(L.moved) hon.push(`<div><b data-count="${L.moved}">0</b><small>cambios de fecha</small></div>`);
  if(L.wo) hon.push(`<div><b data-count="${L.wo}">0</b><small>${L.wo===1?"WO":"WO"}</small></div>`);
  const aw=[];
  if(L.lateKing) aw.push(`<li>${face(L.lateKing[0],"sm")}<span><small>Rey del aplazamiento</small><b>${nm(L.lateKing[0])}</b> · ${L.lateKing[1]} aplazados</span></li>`);
  if(L.opener) aw.push(`<li>${face(L.opener[0],"sm")}<span><small>Adicto a la app</small><b>${nm(L.opener[0])}</b> · ${fmtN(L.opener[1])} entradas</span></li>`);
  if(L.longest) aw.push(`<li><span class="rc-face sm rc-face-x">⏱</span><span><small>El partido más largo</small><b>${nm(L.longest.m.a)} – ${nm(L.longest.m.b)}</b> · ${L.longest.g} juegos</span></li>`);
  add("honores",10000,`<h2 class="rc-h">Méritos, honores y deshonores</h2><div class="rc-row">${hon.join("")}</div>
    <ul class="rc-awards">${aw.join("")}</ul>
    <p class="rc-lead">${L.late>=10?"Con todo el honor del mundo: aquí aplazar es casi una disciplina olímpica.":L.late?"Aplazar también es parte del juego. Con honor.":"Ni un aplazamiento. ¿Seguro que esto es una liga de amigos?"}</p>${nowPlaying(BG.honores)}`);
  /* 4+ · Tu ida */
  add("intro",7500,`<div class="rc-kick">Y ahora, tú</div><h1 class="rc-big">${esc(p.first)}</h1>
    <div class="rc-hero">${face(id,"xl")}</div>
    <p class="rc-lead">${esc(LORE[id]||p.bio||"")}</p>${nowPlaying(BG.intro)}`);
  if(!R.pj){
    add("none",7000,`<h2 class="rc-h">La ida, desde la grada</h2><div class="rc-num"><span data-count="0">0</span><small>partidos</small></div><p class="rc-lead">Te guardamos el sitio en la segunda vuelta.</p>${quip("nums",x,L)}${nowPlaying(BG.none)}`);
  } else {
    add("nums",8000,`<h2 class="rc-h">Tus números</h2>
      <div class="rc-num"><span data-count="${R.pj}">0</span><small>partidos</small></div>
      <div class="rc-row"><div><b class="rc-w" data-count="${R.pg}">0</b><small>victorias</small></div><div><b data-count="${R.pp}">0</b><small>derrotas</small></div><div><b data-count="${R.jf}">0</b><small>juegos ganados</small></div></div>
      <p class="rc-lead">Has ganado más juegos que el <b>${pct}%</b> de la liga.</p>${quip("nums",x,L)}${nowPlaying(BG.nums)}`);
    add("pos",7500,`<h2 class="rc-h">Cierras la ida</h2>
      <div class="rc-num rc-posn"><span data-count="${R.pos}">0</span><sup>º</sup></div>
      <div class="rc-row"><div><b data-count="${R.pts}">0</b><small>puntos</small></div><div><b data-count="${x.elo}">0</b><small>índice Elo · ${x.eloPos}º</small></div></div>
      <p class="rc-lead">${R.pos<=4?"Hoy estarías en playoffs. Que no se escape.":R.pos<=7?"A tiro de los playoffs. La vuelta decide.":"La tabla da muchas vueltas. Y queda la segunda."}</p>${nowPlaying(BG.pos)}`);
    const stk=[]; if(R.best) stk.push(`<div><b data-count="${R.best}">0</b><small>mejor racha de victorias</small></div>`);
    if(R.rem) stk.push(`<div><b data-count="${R.rem}">0</b><small>${R.rem===1?"remontada":"remontadas"}</small></div>`);
    if(x.stb) stk.push(`<div><b data-count="${R.stW}">0</b><small>super tie-breaks ganados de ${x.stb}</small></div>`);
    if(R.bag) stk.push(`<div><b data-count="${R.bag}">0</b><small>${R.bag===1?"rosco":"roscos"} (6-0)</small></div>`);
    if(stk.length) add("streak",8000,`<h2 class="rc-h">Tu carácter en pista</h2><div class="rc-grid">${stk.join("")}</div>
      <p class="rc-lead">Forma: <span class="rc-form">${R.form.map(f=>`<i class="${f==="W"?"w":"l"}">${f==="W"?"V":"D"}</i>`).join("")}</span></p>${quip("streak",x,L)}${nowPlaying(BG.streak)}`);
    if(x.fetiche||x.nemesis) add("rivals",8000,`<h2 class="rc-h">Tus rivales</h2><div class="rc-duo">
      ${x.fetiche?`<div class="rc-riv">${face(x.fetiche)}<small>Rival fetiche</small><b>${nm(x.fetiche)}</b><span>${R.h2h[x.fetiche].w}–${R.h2h[x.fetiche].l}</span></div>`:""}
      ${x.nemesis?`<div class="rc-riv bad">${face(x.nemesis)}<small>Tu némesis</small><b>${nm(x.nemesis)}</b><span>${R.h2h[x.nemesis].w}–${R.h2h[x.nemesis].l}</span></div>`:""}
      </div>${quip("rivals",x,L)||`<p class="rc-lead">${x.nemesis&&x.fetiche?"A uno ya le tienes cogida la medida. Con el otro hay cuentas pendientes.":x.fetiche?"Nadie te ha cogido la medida. De momento.":"La vuelta es para ajustar cuentas."}</p>`}${nowPlaying(BG.rivals)}`);
    if(x.match){ const ml=matchLine(x.match.m,id); add("match",8000,`<h2 class="rc-h">${x.match.won?"El partido de tu ida":"El que más dolió"}</h2>
      <div class="rc-vs">${face(id)}<em>vs</em>${face(ml.op)}</div>
      <div class="rc-score">${esc(ml.sets)}</div><p class="rc-lead">Jornada ${ml.j} contra ${nm(ml.op)}. ${x.match.won?(x.upset&&x.upset.m.id===x.match.m.id?`Nadie daba un duro por ti (${Math.round(x.upset.pe*100)}% de opciones). Y ganaste.`:"Ese día fuiste leyenda."):"Ese se queda en la memoria. Para mal."}</p>${nowPlaying(BG.match)}`); }
  }
  add("crowd",7500,`<h2 class="rc-h">La grada</h2><div class="rc-row"><div><b data-count="${x.votes}">0</b><small>votos MVP recibidos</small></div><div><b data-count="${x.mvpJ}">0</b><small>${x.mvpJ===1?"jornada como MVP":"jornadas como MVP"}</small></div></div>
    ${x.pred.n?`<div class="rc-row"><div><b data-count="${x.pred.hits}">0</b><small>pronósticos acertados de ${x.pred.n}</small></div><div><b data-count="${x.pred.exact}">0</b><small>clavados al set</small></div></div>`:`<p class="rc-lead">Ni un pronóstico. En la vuelta, mójate.</p>`}${quip("crowd",x,L)}${nowPlaying(BG.crowd)}`);
  add("tease",3800,`<h2 class="rc-big rc-tease">Toda temporada<br>tiene banda sonora.</h2><p class="rc-lead">Sube el volumen 🔊</p>`,null);
  add("song",16000,`<div class="rc-kick">Tu ida en una canción</div>
    <div class="rc-disc"><div class="rc-vinyl"><img class="rc-art" alt=""><span class="rc-lbl" style="--c:${p.color}"><img src="${IMG(id)}" alt=""></span></div></div>
    <h2 class="rc-song">${esc(S2.t)}</h2><div class="rc-artist">${esc(S2.a)}</div>
    <div class="rc-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <p class="rc-lead">${esc(S2.why(x))}</p>
    <a class="rc-spot" href="${spotifyUrl(S2)}" target="_blank" rel="noopener" data-nostep>▶ Abrir en Spotify</a>`,S2.id);
  add("card",0,`<div class="rc-kick">Tu resumen</div>
    <div class="rc-card" style="--c:${p.color}">
      <div class="rc-card-top">${face(id)}<div><b>${esc(p.name)}</b><small>${esc(p.nick)} · Primera vuelta</small></div></div>
      <div class="rc-card-grid"><div><b>${R.pos||"–"}º</b><small>puesto</small></div><div><b>${R.pg}–${R.pp}</b><small>balance</small></div><div><b>${R.pts}</b><small>puntos</small></div><div><b>${R.best}</b><small>mejor racha</small></div></div>
      <div class="rc-card-song">🎧 <b>${esc(S2.t)}</b> · ${esc(S2.a)}</div>
      <div class="rc-card-foot">Americana Legends Cup · Vol. 1</div>
    </div>
    <div class="rc-actions" data-nostep><button class="btn ball" data-rc-share>Compartir mi ida</button><a class="btn ghost" href="${spotifyUrl(S2)}" target="_blank" rel="noopener">Spotify</a></div>`,S2.id);
  add("thanks",0,`<div class="rc-kick">Gracias</div>
    <h2 class="rc-big">Gracias por hacer historia.</h2>
    <p class="rc-lead">Esta es la primera temporada de la Americana Legends Cup y existe porque ${PLAYERS.length} amigos decidieron tomársela en serio. Gracias por cada partido, cada voto, cada aplazamiento y cada pique en el grupo.</p>
    <p class="rc-lead">La vuelta arranca el <b>1 de febrero</b>. Id calentando.</p>
    <div class="rc-others" data-nostep><small>Cotillea la ida de los demás</small><div>${PLAYERS.filter(q=>q.id!==id).map(q=>`<button data-rc-who="${q.id}" style="--c:${q.color}"><img src="${IMG(q.id)}" alt="${esc(q.first)}"></button>`).join("")}</div></div>
    <button class="btn ghost" data-rc-close data-nostep>Volver a la app</button>`);
  return {list:out, x, song:S2};
}

/* ---------- Reproductor de historias ---------- */
let RC=null;
async function loadOpens(){
  if(!Store.db) { try{ Store.recapOpens=JSON.parse(localStorage.getItem("am_opens")||"{}"); }catch(e){} return; }
  try{ const d=await Store.db.collection("stats").doc("opens").get(); Store.recapOpens=d.exists?d.data():{}; VERSION++; }catch(e){}
}
async function openRecap(id){
  id=id||S.me||(Store.myPlayer)||PLAYERS[0].id; if(!P[id]) return;
  if(!Store.recapOpens) await loadOpens();
  closeRecap(true);
  const data=slides(id);
  const el=document.createElement("div"); el.id="recap"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Resumen de la primera vuelta");
  el.style.setProperty("--c",P[id].color);
  el.innerHTML=`<div class="rc-bars">${data.list.map(()=>`<i><b></b></i>`).join("")}</div>
    <button class="rc-x" data-rc-close aria-label="Cerrar">×</button><button class="rc-mute" data-rc-mute aria-label="Silenciar">${audio.muted?"🔇":"🔊"}</button>
    <div class="rc-stage">${data.list.map((s,i)=>`<section class="rc-s rc-k-${s.k}" data-i="${i}"><div class="rc-blob a"></div><div class="rc-blob b"></div><div class="rc-in">${s.h}</div></section>`).join("")}</div>
    <div class="rc-start"><div class="rc-in"><div class="rc-kick">Americana Legends Cup · Vol. 1</div><h1 class="rc-big">La primera vuelta ya suena</h1><p class="rc-lead">${esc(P[id].first)}: cada historia tiene su canción. Sube el volumen.</p><button class="btn ball" data-rc-go>Empezar 🎧</button></div></div>`;
  document.body.appendChild(el); document.body.classList.add("rc-on");
  RC={el,id,data,i:-1,t0:0,left:0,timer:null,paused:false};
  previews().then(pv=>{ const s=pv[data.song.id]; if(!RC||RC.id!==id) return; const art=el.querySelector(".rc-art"); if(art&&s&&s.art) art.src=s.art; if(RC.i>=0) playTrack(RC.data.list[RC.i].track); });
  el.addEventListener("click",onClick); el.addEventListener("pointerdown",onDown); el.addEventListener("pointerup",onUp); el.addEventListener("pointercancel",onUp);
  document.addEventListener("keydown",onKey);
  try{ localStorage.setItem("am_recap_seen","1"); }catch(e){}
  if(window.va) window.va("event",{name:"recap_open"});
}
function closeRecap(silent){
  if(!RC) return; clearTimeout(RC.timer); stopAudio();
  document.removeEventListener("keydown",onKey); RC.el.remove(); document.body.classList.remove("rc-on"); RC=null;
  if(!silent&&location.hash.startsWith("#recap")) history.replaceState(null,"",location.pathname+location.search+"#hoy");
}
function go(i){
  if(!RC) return; const n=RC.data.list.length; i=Math.max(0,Math.min(n-1,i));
  RC.i=i; clearTimeout(RC.timer);
  RC.el.querySelectorAll(".rc-s").forEach((s,k)=>{ s.classList.toggle("on",k===i); s.classList.toggle("past",k<i); });
  RC.el.querySelectorAll(".rc-bars i").forEach((b,k)=>{ b.className=k<i?"done":k===i?"now":""; });
  const s=RC.data.list[i], sec=RC.el.querySelector(`.rc-s[data-i="${i}"]`);
  RC.el.querySelector(".rc-bars").style.setProperty("--d",(s.d||0)+"ms");
  countUp(sec);
  playTrack(s.track,()=>sec.classList.add("noaudio"));
  RC.left=s.d||0; RC.t0=Date.now(); if(RC.left&&!RC.paused) RC.timer=setTimeout(()=>go(RC.i+1),RC.left);
  RC.el.classList.toggle("rc-final",!s.d);
}
function countUp(root){
  root.querySelectorAll("[data-count]").forEach(n=>{ const to=+n.dataset.count, t0=performance.now(), D=900;
    if(!to){ n.textContent="0"; return; }
    const f=t=>{ const k=Math.min(1,(t-t0)/D), e=1-Math.pow(1-k,3); n.textContent=fmtN(Math.round(to*e)); if(k<1) requestAnimationFrame(f); }; requestAnimationFrame(f); });
}
let downAt=0;
function onDown(e){ if(!RC||RC.i<0||e.target.closest("[data-nostep],a,button")) return; downAt=Date.now(); clearTimeout(RC.timer); RC.paused=true; RC.left=Math.max(0,RC.left-(Date.now()-RC.t0)); RC.el.classList.add("paused"); }
function onUp(){ if(!RC||!RC.paused) return; RC.paused=false; RC.el.classList.remove("paused"); RC.t0=Date.now(); if(RC.left) RC.timer=setTimeout(()=>go(RC.i+1),RC.left); }
function onClick(e){
  if(!RC) return; const t=e.target;
  if(t.closest("[data-rc-close]")){ closeRecap(); return; }
  if(t.closest("[data-rc-mute]")){ audio.muted=!audio.muted; t.closest("[data-rc-mute]").textContent=audio.muted?"🔇":"🔊"; return; }
  if(t.closest("[data-rc-go]")){ unlockAudio(); RC.el.querySelector(".rc-start").classList.add("gone"); go(0); return; }
  if(t.closest("[data-rc-share]")){ shareCard(RC.id,t.closest("[data-rc-share]")); return; }
  const w=t.closest("[data-rc-who]"); if(w){ const id=w.dataset.rcWho; openRecap(id); unlockAudio(); RC.el.querySelector(".rc-start").classList.add("gone"); go(0); return; }
  if(t.closest("a,[data-nostep]")){ if(t.closest(".rc-spot,a")) stopAudio(); return; }
  if(RC.i<0) return;
  if(Date.now()-downAt>350&&downAt) { downAt=0; return; }   // mantener pulsado = pausa, no avanza
  downAt=0;
  const x=e.clientX/window.innerWidth; go(RC.i+(x<.3?-1:1));
}
function onKey(e){ if(!RC) return; if(e.key==="Escape") closeRecap(); else if(e.key==="ArrowRight") go(RC.i+1); else if(e.key==="ArrowLeft") go(RC.i-1); }

/* ---------- Imagen para compartir (formato historia 1080×1920) ---------- */
async function shareCard(id,btn){
  if(btn){ btn.disabled=true; btn.textContent="Preparando…"; }
  try{
    const X=idaStats(), x=X[id], R=x.R, p=P[id], s=SONGS[x.song];
    const W=1080,H=1920, cv=document.createElement("canvas"); cv.width=W; cv.height=H; const g=cv.getContext("2d");
    const cap=(pr,ms)=>Promise.race([pr,new Promise(r=>setTimeout(r,ms))]);   // con mala red no se queda esperando
    try{ await cap(Promise.all([document.fonts.load('italic 900 100px "Big Shoulders Display"'),document.fonts.load('700 30px Barlow')]),2500); }catch(e){}
    const load=src=>cap(new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src=src; }),4000).then(i=>i||null);
    let img=await load(BODY(id)); if(!img) img=await load(IMG(id));
    const D='"Big Shoulders Display", Impact, sans-serif', B='Barlow, Arial, sans-serif';
    let gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,"#06173F"); gr.addColorStop(1,"#0B2A6B"); g.fillStyle=gr; g.fillRect(0,0,W,H);
    const blob=(cx,cy,r,c)=>{ const base=c.slice(0,7), rg=g.createRadialGradient(cx,cy,0,cx,cy,r); rg.addColorStop(0,c); rg.addColorStop(1,base+"00"); g.fillStyle=rg; g.fillRect(0,0,W,H); };
    blob(200,300,700,p.color+"CC"); blob(950,1250,650,"#E3FF3B66"); blob(900,200,420,p.color+"88");
    if(img){ const dw=780, dh=dw*img.naturalHeight/img.naturalWidth; g.save(); g.shadowColor="rgba(0,0,0,.5)"; g.shadowBlur=50; g.drawImage(img,W-dw+130,1110-dh,dw,dh); g.restore(); }
    g.shadowColor="rgba(0,0,0,.45)"; g.shadowBlur=24;
    g.fillStyle="#fff"; g.textAlign="left"; g.font=`700 38px ${B}`; g.fillText("AMERICANA LEGENDS CUP · VOL. 1",80,120);
    g.font=`italic 900 150px ${D}`; g.fillText("MI PRIMERA",80,290); g.fillStyle="#E3FF3B"; g.fillText("VUELTA",80,430);
    g.fillStyle="#fff"; g.font=`italic 900 120px ${D}`; g.fillText(p.first.toUpperCase(),80,1010);
    g.font=`600 40px ${B}`; g.fillStyle="rgba(255,255,255,.8)"; g.fillText(p.nick,84,1070);
    g.shadowBlur=0; g.shadowColor="transparent";
    const stats=[[`${R.pos||"–"}º`,"PUESTO"],[`${R.pg}–${R.pp}`,"BALANCE"],[`${R.pts}`,"PUNTOS"],[`${R.best}`,"MEJOR RACHA"]];
    stats.forEach(([v,l],i)=>{ const cx=80+(i%2)*470, cy=1180+Math.floor(i/2)*230; g.fillStyle="rgba(255,255,255,.1)"; g.fillRect(cx,cy,440,200);
      g.fillStyle="#fff"; g.font=`italic 900 110px ${D}`; g.fillText(v,cx+30,cy+120); g.font=`700 30px ${B}`; g.fillStyle="rgba(255,255,255,.75)"; g.fillText(l,cx+32,cy+170); });
    g.fillStyle="#E3FF3B"; g.fillRect(80,1660,920,150); g.fillStyle="#06173F"; g.font=`700 30px ${B}`; g.fillText("🎧 MI IDA EN UNA CANCIÓN",115,1712);
    let fs=64; g.font=`italic 900 ${fs}px ${D}`; const line=`${s.t.toUpperCase()} · ${s.a.toUpperCase()}`; while(g.measureText(line).width>850&&fs>30){ fs-=2; g.font=`italic 900 ${fs}px ${D}`; } g.fillText(line,115,1782);
    const blobOut=await new Promise(r=>cv.toBlob(r,"image/jpeg",.92));
    const file=new File([blobOut],`mi-primera-vuelta-${id}.jpg`,{type:"image/jpeg"});
    const text=`🎧 Mi primera vuelta en la Americana Legends Cup: ${R.pos}º, ${R.pg}–${R.pp}. Mi canción: ${s.t} (${s.a}).`;
    if(navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],text}); return; }catch(e){ if(e&&e.name==="AbortError") return; } }
    downloadBlob(blobOut,file.name); toast("Imagen descargada: súbela a tu historia o al grupo");
  }catch(e){ console.error(e); toast("No se pudo crear la imagen"); }
  finally{ if(btn){ btn.disabled=false; btn.textContent="Compartir mi ida"; } }
}

/* ---------- Cuándo se enseña ---------- */
function preview(){ try{ return localStorage.getItem("am_recap_preview")==="1"; }catch(e){ return false; } }
function available(){ return today()>=RECAP_FROM || preview(); }   // antes del 26/12 solo con el enlace #recap-preview
if(location.hash==="#recap-preview"){ try{ localStorage.setItem("am_recap_preview","1"); }catch(e){} }
const ready=()=>Store.member&&Store.first&&!document.getElementById("gate");
function maybeAuto(){
  if(!ready()) return false;
  const want=location.hash.startsWith("#recap");
  let seen=false; try{ seen=localStorage.getItem("am_recap_seen")==="1"; }catch(e){}
  if(want||(today()>=RECAP_FROM&&!seen)){ if(available()) openRecap(); }
  return true;
}
const iv=setInterval(()=>{ if(maybeAuto()){ clearInterval(iv); countOpen(); } },800);
/* Contador de entradas a la app (una por sesión): alimenta «habéis entrado X veces» */
function countOpen(){
  try{ if(sessionStorage.getItem("am_opened")) return; sessionStorage.setItem("am_opened","1"); }catch(e){ return; }
  const me=Store.myPlayer||S.me; if(!me||!P[me]) return;
  if(!Store.db){ try{ const o=JSON.parse(localStorage.getItem("am_opens")||"{}"); o.total=(o.total||0)+1; o[me]=(o[me]||0)+1; localStorage.setItem("am_opens",JSON.stringify(o)); }catch(e){} return; }
  const inc=firebase.firestore.FieldValue.increment(1);
  Store.db.collection("stats").doc("opens").set({total:inc,[me]:inc},{merge:true}).catch(()=>{});
}
window.addEventListener("hashchange",()=>{ if(location.hash.startsWith("#recap")&&ready()&&available()) openRecap(); });

/* Tarjeta en «Hoy» para volver a verlo */
const vHoyBase=VIEWS.hoy;
VIEWS.hoy=function(){
  const base=vHoyBase();
  if(!available()||!Store.member) return base;
  const me=S.me&&P[S.me]?S.me:null, x=me?idaStats()[me]:null, s=x?SONGS[x.song]:null;
  const card=`<button class="rc-banner" data-rc-open style="--c:${me?P[me].color:"#3E86E8"}"><span class="rc-banner-eq"><i></i><i></i><i></i></span><span><small>Ya disponible</small><b>Tu primera vuelta</b><em>${s?"Tu canción te está esperando 🎧":"Resumen de la ida, con canción incluida"}</em></span><span class="rc-banner-go">▶</span></button>`;
  const k=base.indexOf("</section>");   // justo debajo de la cabecera con las caras
  return k>=0 ? base.slice(0,k+10)+card+base.slice(k+10) : card+base;
};
document.addEventListener("click",e=>{ if(e.target.closest("[data-rc-open]")) openRecap(); });

window.openRecap=openRecap;
window.recapSongs=()=>{ const X=idaStats(); return PLAYERS.map(p=>[p.first,SONGS[X[p.id].song].t]); };
})();
