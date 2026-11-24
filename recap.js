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
  sol:      {t:"Salió el Sol",         a:"Don Omar",                      id:1443507774, ok:x=>x.R.pj>0, why:x=>`Una ida de ${x.R.pg}–${x.R.pp} y ${x.R.pos}.º puesto. Al final siempre sale el sol: la vuelta es tuya.`},
  vida:     {t:"Vivir Mi Vida",        a:"Marc Anthony",                  id:668743167,  ok:x=>x.R.pj>0, why:x=>`${x.R.pj} ${x.R.pj===1?"partido":"partidos"} y ${x.R.pos}.º puesto. Ríe, baila y juega: esta liga se vive.`},
  bonito:   {t:"Me Porto Bonito",      a:"Bad Bunny & Chencho Corleone",  id:1622045634, ok:x=>x.R.pj>0, why:x=>`${x.R.pg}–${x.R.pp} y ${x.R.pos}.º puesto. Una ida sin sobresaltos: te has portado bonito.`},
};
const q_=s=>encodeURIComponent(s.t+" "+s.a.split(/,|&/)[0].trim());
const listenLinks=s=>`<a class="rc-l sp" href="https://open.spotify.com/search/${q_(s)}" target="_blank" rel="noopener">Spotify</a><a class="rc-l am" href="https://music.apple.com/es/search?term=${q_(s)}" target="_blank" rel="noopener">Apple Music</a><a class="rc-l yt" href="https://music.youtube.com/search?q=${q_(s)}" target="_blank" rel="noopener">YouTube</a>`;
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
    const NEUTRAL=["bonito","sol","vida","paso","provenza","callaita","calma","kuduro","safaera","tusa","gasolina","despacito"];
    PLAYERS.forEach(p=>{ if(song[p.id]) return; const ok=k=>!SONGS[k].ok||SONGS[k].ok(out[p.id]);
      const k=NEUTRAL.find(k=>!usedS.has(k)&&ok(k))||NEUTRAL.find(ok)||"bonito"; song[p.id]=k; usedS.add(k); });
    PLAYERS.forEach(p=>out[p.id].song=song[p.id]);
    out.__total=idaM.length;
    return out;
  });
}

/* ---------- Música de fondo: cada historia elige canción según lo que enseña ---------- */
const TR = {
  september:{t:"September",            a:"Earth, Wind & Fire",       id:1456444818},
  migente:  {t:"Mi Gente",             a:"J Balvin & Willy William", id:1444327839},
  amanecer: {t:"Hasta el Amanecer",    a:"Nicky Jam",                id:1189391898},
  porahi:   {t:"Bailando por Ahí",     a:"Juan Magán",               id:436873963},
  vivir:    {t:"Vivir Mi Vida",        a:"Marc Anthony",             id:668743167},
  limbo:    {t:"Limbo",                a:"Daddy Yankee",             id:715685003},
  shaky:    {t:"Shaky Shaky",          a:"Daddy Yankee",             id:1445050456},
  inmyhead: {t:"In My Head",           a:"Jason Derulo",             id:353554290},
  bici:     {t:"La Bicicleta",         a:"Carlos Vives & Shakira",   id:1234665881},
  perdon:   {t:"El Perdón",            a:"Nicky Jam & Enrique Iglesias", id:1189391901},
  dura:     {t:"Dura",                 a:"Daddy Yankee",             id:1444855250},
  culpa:    {t:"Échame La Culpa",      a:"Luis Fonsi & Demi Lovato", id:1447401618},
  amigos:   {t:"¿Quién Dijo Amigos?",  a:"Carlitos Rossy",           id:1203479312},
  abusadora:{t:"Abusadora",            a:"Wisin & Yandel",           id:1442227075},
  pajaritos:{t:"Te Pintaron Pajaritos",a:"Yandar & Yostin",          id:1581599226},
  bailando: {t:"Bailando",             a:"Enrique Iglesias",         id:1443368808},
  gozadera: {t:"La Gozadera",          a:"Gente de Zona & Marc Anthony", id:1014994765},
  corazon:  {t:"Corazón",              a:"Maluma & Nego do Borel",   id:1377817359},
  livin:    {t:"Livin' la Vida Loca",  a:"Ricky Martin",             id:192821659},
  mordidita:{t:"La Mordidita",         a:"Ricky Martin",             id:1014994767},
  ventepaca:{t:"Vente Pa' Ca",         a:"Ricky Martin & Maluma",    id:1205161915},
  subeme:   {t:"SUBEME LA RADIO",      a:"Enrique Iglesias",         id:1585690490},
  bailamos: {t:"Bailamos",             a:"Enrique Iglesias",         id:1443479200},
  chantaje: {t:"Chantaje",             a:"Shakira & Maluma",         id:1234665569},
  tortura:  {t:"La Tortura",           a:"Shakira & Alejandro Sanz", id:1817217220},
  hips:     {t:"Hips Don't Lie",       a:"Shakira",                  id:1817217411},
  loca:     {t:"Loca",                 a:"Shakira & El Cata",        id:888878378},
  partio:   {t:"Corazón Partío",       a:"Alejandro Sanz",           id:478735639},
  rakata:   {t:"Rakata",               a:"Wisin & Yandel",           id:1467933609},
  levanto:  {t:"Ella Me Levantó",      a:"Daddy Yankee",             id:1786000517},
  daledon:  {t:"Dale Don Dale",        a:"Don Omar",                 id:1467968831},
  salio:    {t:"Salió el Sol",         a:"Don Omar",                 id:1443507774},
  ellayyo:  {t:"Ella y Yo",            a:"Aventura & Don Omar",      id:1073189255},
  obsesion: {t:"Obsesión",             a:"Aventura",                 id:211280101},
  propuesta:{t:"Propuesta Indecente",  a:"Romeo Santos",             id:804149490},
  travesuras:{t:"Travesuras",          a:"Nicky Jam",                id:1790287644},
  felices:  {t:"Felices los 4",        a:"Maluma",                   id:1377817652},
  hawai:    {t:"Hawái",                a:"Maluma",                   id:1523698843},
  sixam:    {t:"6 AM",                 a:"J Balvin & Farruko",       id:1440862759},
  ayvamos:  {t:"Ay Vamos",             a:"J Balvin",                 id:1440817278},
  ginza:    {t:"Ginza",                a:"J Balvin",                 id:1440835180},
  calma:    {t:"Calma",                a:"Pedro Capó",               id:1412993945},
  taxi:     {t:"El Taxi",              a:"Osmani García & Pitbull",  id:893250207},
  camisa:   {t:"La Camisa Negra",      a:"Juanes",                   id:6825044387},
  adios:    {t:"A Dios Le Pido",       a:"Juanes",                   id:1442717297},
  mayores:  {t:"Mayores",              a:"Becky G & Bad Bunny",      id:1483618937},
  sincontrato:{t:"Sin Contrato",       a:"Maluma",                   id:1048181449},
  lomalo:   {t:"Lo Malo",              a:"Aitana & Ana Guerra",      id:1445060457},
  megustas: {t:"Me Gustas Tú",         a:"Manu Chao",                id:726124491},
  bonito:   {t:"Bonito",               a:"Jarabe de Palo",           id:306349246},
  granoche: {t:"Mi Gran Noche",        a:"Raphael",                  id:734819808},
};
const HOOK = {"september": "Porque todo arrancó un 28 de septiembre.","migente": "Porque esto va de mi gente: 10 amigos y una liga.","amanecer": "Porque hay partidos que se aplazan hasta el amanecer.","porahi": "Porque, con tanto aplazamiento, medio liga estaba bailando por ahí.","vivir": "Porque esta liga se vive. Y tú la vives así.","limbo": "Porque hay quien juega en otra dimensión.","shaky": "Porque estos números hacen temblar a cualquiera.","inmyhead": "Porque esas derrotas siguen en tu cabeza.","bici": "Porque la tabla sube y baja como una bicicleta.","perdon": "Porque hay temporadas que piden perdón.","dura": "Porque así de dura ha sido tu ida.","culpa": "Porque a alguien hay que echarle la culpa.","amigos": "¿Amigos? En la pista no hay amigos.","abusadora": "Porque hay rivales que abusan sin piedad.","pajaritos": "Porque ese día te pintaron pajaritos.","bailando": "Porque ese día bailaste a tu rival.","gozadera": "Porque la grada es una gozadera.","corazon": "Gracias, de corazón.","livin": "Porque esta liga es la vida loca.","mordidita": "Porque cada partido deja su mordidita.","ventepaca": "Vente pa' cá, que esto no ha acabado.","subeme": "Súbele el volumen a estos números.","bailamos": "Porque en la pista bailamos todos.","chantaje": "Porque contra algunos rivales todo vale.","tortura": "Porque hay partidos que son una tortura.","hips": "Porque los números no mienten.","loca": "Porque esta ida ha sido una locura.","partio": "Porque hay derrotas que te dejan el corazón partío.","rakata": "Porque ganaste a ritmo de rakata.","levanto": "Porque esta liga te ha levantado.","daledon": "Porque había que darle. Y le diste.","salio": "Porque al final siempre sale el sol.","ellayyo": "Porque algunas rivalidades son cosa de dos.","obsesion": "Porque esa derrota ya es una obsesión.","propuesta": "Porque la revancha es una propuesta indecente.","travesuras": "Porque en la pista hiciste tus travesuras.","felices": "Porque aquí cabemos todos: felices los diez.","hawai": "Porque arriba de la tabla se está como en Hawái.","sixam": "Porque hay partidos que parece que acaban a las 6 AM.","ayvamos": "¡Ay, vamos! Que esto sigue.","ginza": "Porque esta grada lo pide.","calma": "Porque todo, con calma.","taxi": "Porque esta racha no la para ni un taxi.","camisa": "Porque hay días de camisa negra.","adios": "Porque a Dios le pides una segunda vuelta así.","mayores": "Porque esto ya es cosa de mayores.","sincontrato": "Porque aquí se juega sin contrato y con orgullo.","lomalo": "Porque lo malo también se celebra.","megustas": "Porque esta liga, sencillamente, nos gusta.","bonito": "Porque, al final, todo te parece bonito.","granoche": "Porque esta primera vuelta ha sido una gran noche."};
/* Ánimos: cada historia tira de uno; a cada jugador le tocan canciones distintas y sin repetir artista */
const MOOD = {
  fiesta:   ["migente","gozadera","bailando","vivir","limbo","shaky","livin","mordidita","ventepaca","subeme","bailamos","hips","loca","levanto","daledon","salio","travesuras","felices","hawai","sixam","ayvamos","ginza","calma","taxi","camisa","mayores","lomalo","bici","rakata"],
  derrota:  ["perdon","inmyhead","partio","tortura","obsesion","ellayyo","propuesta","adios","amanecer","sincontrato","pajaritos"],
  rival:    ["culpa","chantaje","tortura","rakata","ellayyo","propuesta"],
  racha:    ["dura","rakata","levanto","limbo","daledon","salio","shaky","taxi","sixam"],
  nostalgia:["corazon","granoche","bonito","megustas","adios","vivir","livin","bailamos","bici","camisa"],
};
const artistKey=a=>a.toLowerCase().split(/\s*(?:&|,|feat\.)\s*/)[0].trim();
const hashStr=str=>{ let h=2166136261; for(const c of str){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };
/* Paliza: derrota por 7 juegos o más, o con un 6-0 en contra */
function isPaliza(m,me){ const r=result(m); if(!r||r.wo) return false; const side=m.a===me?"a":"b"; if(r.w===side) return false;
  const diff=side==="a"?r.gb-r.ga:r.ga-r.gb; return diff>=7||r.sets.some(z=>!z.st&&(side==="a"?z.a===0&&z.b===6:z.b===0&&z.a===6)); }
function bgFor(k,x,L){
  const R=x.R, id=x.id;
  switch(k){
    case "liga": return ["september"];                                   // empezó en septiembre
    case "cifras": return "fiesta";
    case "honores": return L.late>=5?["porahi","amanecer"]:"fiesta";      // medio liga bailando por ahí
    case "intro": return id==="alvaro"?["limbo","shaky"]:"nostalgia";     // el DJ entra con su música
    case "nums": case "none": return R.pg>=R.pp?"fiesta":"derrota";
    case "pos": return R.pos<=4?"fiesta":R.pos>=8?"derrota":"nostalgia";
    case "streak": return "racha";
    case "rivals": { if(!x.nemesis) return "rival"; const h=R.h2h[x.nemesis];
      const beat=R.res.some(m=>(m.a===x.nemesis||m.b===x.nemesis)&&isPaliza(m,id));
      return (h.l>=2||beat)?["abusadora","amigos"]:["amigos","abusadora"]; }
    case "match": return !x.match||x.match.won?"fiesta":isPaliza(x.match.m,id)?["pajaritos","perdon"]:"derrota";
    case "crowd": return "fiesta";
    case "thanks": return "nostalgia";
  }
  return "fiesta";
}
/* Elige la canción de una historia: fija si la broma lo pide; si no, del ánimo, distinta por jugador */
function hookFor(key,k,x,L){
  if(key==="limbo"&&x.id==="alvaro") return "Porque al DJ de la liga se le recibe con su música.";
  if(key==="abusadora"&&x.nemesis) return `Porque ${P[x.nemesis].first} te ha repasado sin piedad.`;
  if(key==="amigos"&&x.nemesis) return `¿Amigos? ${P[x.nemesis].first} no se acordó en la pista.`;
  if(key==="porahi"&&L.late) return `Porque con ${L.late} aplazados medio liga estaba bailando por ahí.`;
  if(key==="pajaritos"&&x.match) return `Porque contra ${P[x.match.m.a===x.id?x.match.m.b:x.match.m.a].first} te pintaron pajaritos.`;
  if(key==="bailando"&&x.match&&x.match.won) return `Porque ese día bailaste a ${P[x.match.m.a===x.id?x.match.m.b:x.match.m.a].first}.`;
  return HOOK[key]||"";
}
function pickTrack(k,x,L,used,usedArt){
  const want=bgFor(k,x,L), ok=key=>TR[key]&&!used.has(key)&&!usedArt.has(artistKey(TR[key].a));
  let key=null;
  if(Array.isArray(want)) key=want.find(ok)||want.find(z=>TR[z]&&!used.has(z));
  if(!key){ const pool=MOOD[Array.isArray(want)?"fiesta":want]||MOOD.fiesta, h=hashStr(x.id+":"+k);
    for(let i=0;i<pool.length&&!key;i++){ const z=pool[(h+i*7)%pool.length]; if(ok(z)) key=z; }
    if(!key) key=MOOD.fiesta.find(z=>!used.has(z)); }
  if(key){ used.add(key); usedArt.add(artistKey(TR[key].a)); }
  return key;
}
/* Alternativas por si una canción no carga: del mismo ánimo, ya precargadas */
function altsFor(key){ const m=Object.entries(MOOD).find(([,v])=>v.includes(key)); return (m?m[1]:MOOD.fiesta).filter(z=>z!==key).slice(0,4).map(z=>TR[z].id); }

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
    const O=Store.recapOpens||{}, U=CFG.APP_USAGE||null;
    // Entradas: lo contado hasta U.hasta (Vercel + estimación de los días sin analítica) y desde ahí lo que diga Vercel
    // (U.vercel, lo rellena la tarea del 26/12) o, mientras tanto, el ritmo medio por día
    let est=0; if(U&&U.entradas){ const end=today()<RECAP_FROM?today():RECAP_FROM, d=Math.max(0,Math.round((Date.parse(end)-Date.parse(U.hasta))/864e5));
      est=U.entradas+(U.vercel?+U.vercel:Math.round((+U.ritmo||0)*d)); }
    L.opens=Math.max(O.total||0, +CFG.APP_OPENS||0, est);
    L.minVisit=U&&+U.minVisita||0; L.appHours=L.minVisit?Math.round(L.opens*L.minVisit/60):0;
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
    const ids=[...new Set([...Object.values(SONGS),...Object.values(TR)].map(s=>s.id))].join(",");
    const r=await fetch(`https://itunes.apple.com/lookup?id=${ids}&country=es`).then(r=>r.json());
    PREV={}; (r.results||[]).forEach(t=>{ if(t.previewUrl) PREV[t.trackId]={url:t.previewUrl,art:(t.artworkUrl100||"").replace("100x100bb","600x600bb")}; });
  }catch(e){ PREV={}; }
  return PREV;
}
/* Un solo reproductor para todo el recap: es lo que mejor funciona en iPhone (Safari solo deja sonar
   un elemento que se haya activado con un toque, y no precarga audio). Se activa en «Empezar» y a partir de
   ahí va cambiando de canción. En ordenador y Android además se precarga la canción de la historia siguiente. */
const SILENT="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const audio=new Audio(); audio.loop=true; audio.preload="auto"; audio.setAttribute("playsinline",""); audio.setAttribute("webkit-playsinline","");
const pre=new Audio(); pre.preload="auto"; pre.muted=true;
let curTrack=null, muted=false, fadeT=null, onErr=null;
audio.addEventListener("error",()=>{ if(audio.src&&audio.src!==SILENT&&onErr) onErr(); });
const BLOB={}, Q=[]; let active=0;
function prefetch(ids){ ids.forEach(id=>{ if(id&&!BLOB[id]&&!Q.includes(id)) Q.push(id); }); pump(); }
function pump(){ while(active<2&&Q.length){ const id=Q.shift(), u=PREV&&PREV[id]&&PREV[id].url; if(!u||BLOB[id]) continue; active++;
  fetch(u).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(buf=>{ BLOB[id]=URL.createObjectURL(new Blob([buf],{type:"audio/mp4"})); })
    .catch(()=>{}).finally(()=>{ active--; pump(); }); } }
function urlOf(id){ return BLOB[id]||(PREV&&PREV[id]&&PREV[id].url); }
function unlockAudio(){ if(audio._u) return; audio._u=true;
  try{ if(!audio.src) audio.src=SILENT; const p=audio.play(); if(p) p.then(()=>{ if(!curTrack) audio.pause(); }).catch(e=>{ if(!(e&&e.name==="AbortError")) audio._u=false; }); }catch(e){ audio._u=false; } }   // AbortError = ya cambió a la primera canción: está activado
function preloadNext(id){ prefetch([id]); }
function playTrack(id,onFail){
  if(id&&id===curTrack){ if(audio.paused) audio.play().catch(()=>{}); return; }
  curTrack=id; onErr=null; clearInterval(fadeT);
  if(!id){ audio.pause(); return; }
  const u=urlOf(id); if(!u){ curTrack=null; onFail&&onFail(); return; }
  onErr=()=>{ if(curTrack!==id) return;
    if(BLOB[id]&&audio.src===BLOB[id]&&PREV[id]){ delete BLOB[id]; audio.src=PREV[id].url; audio.play().catch(()=>{}); return; }   // si la copia en memoria falla, directo
    curTrack=null; onFail&&onFail(); };
  audio.src=u; audio.muted=muted; try{ audio.volume=0; }catch(e){}
  const pr=audio.play();                      // dentro del toque si lo hay; si no, vale porque ya se activó
  const fadeIn=()=>{ let v=0; fadeT=setInterval(()=>{ v=Math.min(1,v+.1); try{ audio.volume=v; }catch(e){} if(v>=1) clearInterval(fadeT); },45); };
  if(pr) pr.then(fadeIn).catch(e=>{ if(e&&e.name==="AbortError") return; if(curTrack===id){ curTrack=null; onFail&&onFail(); } }); else fadeIn();
}
function isPlaying(id){ return curTrack===id&&!audio.paused&&audio.currentTime>.05; }
/* Que suene siempre: si falla o se atasca, salta a una alternativa del mismo ánimo */
function playSlide(s,sec){
  const i=RC.i, tries=[s.track,...(s.alts||[])].filter(Boolean); let n=0;
  const attempt=()=>{ if(!RC||RC.i!==i) return; const id=tries[n++]; if(!id){ sec.classList.add("noaudio"); return; }
    if(n>1){ const e=Object.entries(TR).find(([,z])=>z.id===id); const np=sec.querySelector(".rc-np"); if(e&&np){ np.outerHTML=nowPlaying(e[1],HOOK[e[0]]); fillArt(sec); } }
    playTrack(id,()=>attempt());
    clearTimeout(RC.wd); RC.wd=setTimeout(()=>{ if(!RC||RC.i!==i||curTrack!==id) return;
      if(isPlaying(id)||audio.readyState>=3) return;      // ya suena o está a punto
      attempt(); },3500); };
  if(!s.track) playTrack(null); else attempt();
  prefetch(RC.data.list.slice(i+1,i+4).map(z=>z.track));
}
function stopAudio(){ curTrack=null; onErr=null; clearInterval(fadeT); try{ audio.pause(); }catch(e){} }
function setMuted(v){ muted=v; audio.muted=v; }

function fillArt(root){ if(!PREV) return; root.querySelectorAll("img[data-art]").forEach(im=>{ const p=PREV[im.dataset.art]; if(p&&p.art&&!im.src) im.src=p.art.replace("600x600bb","200x200bb"); }); }
/* ---------- Historias ---------- */
const fmtN=n=>Number(n).toLocaleString("es-ES");
const face=(id,cls="")=>`<span class="rc-face ${cls}" style="--c:${P[id].color}"><img src="${IMG(id)}" alt=""></span>`;
const nowPlaying=(s,hook)=>s?`<div class="rc-np" aria-hidden="true"><img class="rc-np-art" data-art="${s.id}" alt=""><span class="rc-np-txt"><span class="rc-np-t"><span class="rc-np-eq"><i></i><i></i><i></i></span>${esc(s.t)} · ${esc(s.a)}</span>${hook?`<em>${esc(hook)}</em>`:""}</span></div>`:"";
function matchLine(m,me){ const r=result(m); const op=m.a===me?m.b:m.a; const sets=r.sets.map(s=>m.a===me?`${s.a}-${s.b}`:`${s.b}-${s.a}`).join(" · "); return {op,sets,j:m.j}; }

function slides(id){
  const X=idaStats(), x=X[id], R=x.R, p=P[id], S2=SONGS[x.song], L=leagueStats();
  const pct=Math.round(100*PLAYERS.filter(q=>X[q.id].R.jf<R.jf).length/(PLAYERS.length-1));
  const nm=i=>esc(P[i].first);
  const out=[], used=new Set(), usedArt=new Set([artistKey(S2.a)]);
  const DUR=1.8;   // más tiempo para leer; tocar a la derecha pasa a la siguiente   // el artista de tu canción no suena antes
  const add=(k,d,h,track)=>{ let tr=null, key=null;
    if(track===undefined){ key=pickTrack(k,x,L,used,usedArt); tr=key&&TR[key]; }
    out.push({k,d:d?Math.round(d*(k==="song"?1:k==="tease"?1.2:DUR)):0,h:h+(tr?nowPlaying(tr,hookFor(key,k,x,L)):""),track:tr?tr.id:track,alts:key?altsFor(key):[]}); };
  /* 1-3 · La liga */
  add("liga",9000,`<div class="rc-kick">Seniors, Juniors:</div>
    <h1 class="rc-big">Empezó como una idea entre ${PLAYERS.length} amigos.</h1>
    <p class="rc-lead">Todo arrancó el 28 de septiembre. Primera vuelta cerrada: <b>${fmtN(L.played)}</b> partidos, <b>${fmtN(L.games)}</b> juegos y <b>${fmtN(L.stb)}</b> super tie-breaks${L.opens?`. Habéis entrado en la app <b>${fmtN(L.opens)}</b> veces${L.appHours?` y habéis pasado unas <b>${fmtN(L.appHours)}</b> horas dentro`:""}`:""}. Esto ya no es una pachanga: es una liga.</p>`);
  const big=[[L.played,"partidos jugados"],[L.games,"juegos disputados"],[L.hoursOnCourt,"horas en pista (a ojo)"],[L.opens,"entradas a la app"],[L.appHours,"horas en la app (a ojo)"],[L.preds,"pronósticos"],[L.votes,"votos MVP"]].filter(([v])=>v>0).slice(0,6);
  add("cifras",9000,`<h2 class="rc-h">La ida en cifras</h2><div class="rc-grid rc-grid3">${big.map(([v,l])=>`<div><b data-count="${v}">0</b><small>${l}</small></div>`).join("")}</div>
    ${L.day?`<p class="rc-lead">Día favorito de la liga: los <b>${WD[L.day[0]]}</b>${L.hour?`, sobre las <b>${+L.hour[0]}:00</b>`:""}.${L.minVisit?` Cada visita a la app dura de media unos <b>${fmtN(Math.round(L.minVisit))}</b> minutos.`:""}</p>`:""}`);
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
    <p class="rc-lead">${L.late>=10?"Con todo el honor del mundo: aquí aplazar es casi una disciplina olímpica.":L.late?"Aplazar también es parte del juego. Con honor.":"Ni un aplazamiento. ¿Seguro que esto es una liga de amigos?"}</p>`);
  /* 4+ · Tu ida */
  add("intro",7500,`<div class="rc-kick">Y ahora, tú</div><h1 class="rc-big">${esc(p.first)}</h1>
    <div class="rc-hero">${face(id,"xl")}</div>
    <p class="rc-lead">${esc(LORE[id]||p.bio||"")}</p>`);
  if(!R.pj){
    add("none",7000,`<h2 class="rc-h">La ida, desde la grada</h2><div class="rc-num"><span data-count="0">0</span><small>partidos</small></div><p class="rc-lead">Te guardamos el sitio en la segunda vuelta.</p>${quip("nums",x,L)}`);
  } else {
    add("nums",8000,`<h2 class="rc-h">Tus números</h2>
      <div class="rc-num"><span data-count="${R.pj}">0</span><small>partidos</small></div>
      <div class="rc-row"><div><b class="rc-w" data-count="${R.pg}">0</b><small>victorias</small></div><div><b data-count="${R.pp}">0</b><small>derrotas</small></div><div><b data-count="${R.jf}">0</b><small>juegos ganados</small></div></div>
      <p class="rc-lead">Has ganado más juegos que el <b>${pct}%</b> de la liga.</p>${quip("nums",x,L)}`);
    add("pos",7500,`<h2 class="rc-h">Cierras la ida</h2>
      <div class="rc-num rc-posn"><span data-count="${R.pos}">0</span><sup>º</sup></div>
      <div class="rc-row"><div><b data-count="${R.pts}">0</b><small>puntos</small></div><div><b data-count="${x.elo}">0</b><small>índice Elo · ${x.eloPos}º</small></div></div>
      <p class="rc-lead">${R.pos<=4?"Hoy estarías en playoffs. Que no se escape.":R.pos<=7?"A tiro de los playoffs. La vuelta decide.":"La tabla da muchas vueltas. Y queda la segunda."}</p>`);
    const stk=[]; if(R.best) stk.push(`<div><b data-count="${R.best}">0</b><small>mejor racha de victorias</small></div>`);
    if(R.rem) stk.push(`<div><b data-count="${R.rem}">0</b><small>${R.rem===1?"remontada":"remontadas"}</small></div>`);
    if(x.stb) stk.push(`<div><b data-count="${R.stW}">0</b><small>super tie-breaks ganados de ${x.stb}</small></div>`);
    if(R.bag) stk.push(`<div><b data-count="${R.bag}">0</b><small>${R.bag===1?"rosco":"roscos"} (6-0)</small></div>`);
    if(stk.length) add("streak",8000,`<h2 class="rc-h">Tu carácter en pista</h2><div class="rc-grid">${stk.join("")}</div>
      <p class="rc-lead">Forma: <span class="rc-form">${R.form.map(f=>`<i class="${f==="W"?"w":"l"}">${f==="W"?"V":"D"}</i>`).join("")}</span></p>${quip("streak",x,L)}`);
    if(x.fetiche||x.nemesis) add("rivals",8000,`<h2 class="rc-h">Tus rivales</h2><div class="rc-duo">
      ${x.fetiche?`<div class="rc-riv">${face(x.fetiche)}<small>Rival fetiche</small><b>${nm(x.fetiche)}</b><span>${R.h2h[x.fetiche].w}–${R.h2h[x.fetiche].l}</span></div>`:""}
      ${x.nemesis?`<div class="rc-riv bad">${face(x.nemesis)}<small>Tu némesis</small><b>${nm(x.nemesis)}</b><span>${R.h2h[x.nemesis].w}–${R.h2h[x.nemesis].l}</span></div>`:""}
      </div>${x.nemesis&&bgFor("rivals",x,L)[0]==="abusadora"?`<p class="rc-lead">${nm(x.nemesis)} te ha repasado: ${R.h2h[x.nemesis].w}–${R.h2h[x.nemesis].l}. Suena lo que tiene que sonar.</p>`:""}${quip("rivals",x,L)||`<p class="rc-lead">${x.nemesis&&x.fetiche?"A uno ya le tienes cogida la medida. Con el otro hay cuentas pendientes.":x.fetiche?"Nadie te ha cogido la medida. De momento.":"La vuelta es para ajustar cuentas."}</p>`}`);
    if(x.match){ const ml=matchLine(x.match.m,id); add("match",8000,`<h2 class="rc-h">${x.match.won?"El partido de tu ida":"El que más dolió"}</h2>
      <div class="rc-vs">${face(id)}<em>vs</em>${face(ml.op)}</div>
      <div class="rc-score">${esc(ml.sets)}</div><p class="rc-lead">Jornada ${ml.j} contra ${nm(ml.op)}. ${x.match.won?(x.upset&&x.upset.m.id===x.match.m.id?`Nadie daba un duro por ti (${Math.round(x.upset.pe*100)}% de opciones). Y ganaste.`:"Ese día fuiste leyenda."):(isPaliza(x.match.m,id)?"Ese día te pintaron pajaritos.":"Ese se queda en la memoria. Para mal.")}</p>`); }
  }
  add("crowd",7500,`<h2 class="rc-h">La grada</h2><div class="rc-row"><div><b data-count="${x.votes}">0</b><small>votos MVP recibidos</small></div><div><b data-count="${x.mvpJ}">0</b><small>${x.mvpJ===1?"jornada como MVP":"jornadas como MVP"}</small></div></div>
    ${x.pred.n?`<div class="rc-row"><div><b data-count="${x.pred.hits}">0</b><small>pronósticos acertados de ${x.pred.n}</small></div><div><b data-count="${x.pred.exact}">0</b><small>clavados al set</small></div></div>`:`<p class="rc-lead">Ni un pronóstico. En la vuelta, mójate.</p>`}${quip("crowd",x,L)}`);
  add("tease",3800,`<h2 class="rc-big rc-tease">Toda temporada<br>tiene banda sonora.</h2><p class="rc-lead">Sube el volumen 🔊</p>`,null);
  add("song",29000,`<div class="rc-kick">Tu ida en una canción</div>
    <div class="rc-disc"><div class="rc-vinyl"><img class="rc-art" alt=""><span class="rc-lbl" style="--c:${p.color}"><img src="${IMG(id)}" alt=""></span></div></div>
    <h2 class="rc-song">${esc(S2.t)}</h2><div class="rc-artist">${esc(S2.a)}</div>
    <div class="rc-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <p class="rc-lead">${esc(S2.why(x))}</p>
    <div class="rc-listen" data-nostep><small>Escúchala entera</small>${listenLinks(S2)}</div>`,S2.id);
  add("card",0,`<div class="rc-kick">Tu resumen</div>
    <div class="rc-card" style="--c:${p.color}">
      <div class="rc-card-top">${face(id)}<div><b>${esc(p.name)}</b><small>${esc(p.nick)} · Primera vuelta</small></div></div>
      <div class="rc-card-grid"><div><b>${R.pos||"–"}º</b><small>puesto</small></div><div><b>${R.pg}–${R.pp}</b><small>balance</small></div><div><b>${R.pts}</b><small>puntos</small></div><div><b>${R.best}</b><small>mejor racha</small></div></div>
      <div class="rc-card-song">🎧 Tu canción es <b>${esc(S2.t)}</b> · ${esc(S2.a)}<span>${esc(S2.why(x))}</span></div>
      <div class="rc-card-foot">Americana Legends Cup · Vol. 1</div>
    </div>
    <div class="rc-actions" data-nostep><button class="btn ball" data-rc-share>Compartir mi ida</button></div>
    <div class="rc-listen" data-nostep>${listenLinks(S2)}</div>`,S2.id);
  add("thanks",0,`<div class="rc-kick">Gracias</div>
    <h2 class="rc-big">Gracias por hacer historia.</h2>
    <p class="rc-lead">Esta es la primera temporada de la Americana Legends Cup y existe porque ${PLAYERS.length} amigos decidieron tomársela en serio. Gracias por cada partido, cada voto, cada aplazamiento y cada birra post partido.</p>
    <p class="rc-lead">La vuelta arranca el <b>1 de febrero</b>. Id calentando.</p>
    <button class="btn ghost" data-rc-close data-nostep>Volver a la app</button>`);
  return {list:out, x, song:S2};
}

/* ---------- Reproductor de historias ---------- */
let RC=null;
async function loadOpens(){
  if(!Store.db) { try{ Store.recapOpens=JSON.parse(localStorage.getItem("am_opens")||"{}"); }catch(e){} return; }
  try{ const d=await Store.db.collection("stats").doc("opens").get(); Store.recapOpens=d.exists?d.data():{}; VERSION++; }catch(e){}
}
const trackIds=d=>[...new Set(d.list.flatMap(s=>[s.track,...(s.alts||[]).slice(0,1)]).filter(Boolean))];
/* Rótulo gigante que cruza el fondo de cada historia */
function tickerFor(k,id,x,song){
  const R=x.R, T={liga:"PRIMERA VUELTA",cifras:"LA IDA EN CIFRAS",honores:"APLAZADOS",intro:P[id].first.toUpperCase(),nums:"TUS NÚMEROS",none:"DESDE LA GRADA",
    pos:`${R.pos}º PUESTO`,streak:"CARÁCTER",rivals:"RIVALES",match:"PARTIDAZO",crowd:"LA GRADA",tease:"BANDA SONORA",song:song.t.toUpperCase(),card:"TU IDA",thanks:"GRACIAS"};
  const w=T[k]||"LEGENDS CUP"; return `<div class="rc-tick" aria-hidden="true"><span>${(esc(w)+" · ").repeat(6)}</span><span>${(esc(w)+" · ").repeat(6)}</span></div>`;
}
/* Titulares palabra a palabra */
function splitWords(root){
  root.querySelectorAll(".rc-big,.rc-h,h2.rc-song").forEach(h=>{ let n=0;
    [...h.childNodes].forEach(nd=>{ if(nd.nodeType!==3) return; const f=document.createDocumentFragment();
      nd.textContent.split(/(\s+)/).forEach(w=>{ if(!w) return; if(/^\s+$/.test(w)){ f.appendChild(document.createTextNode(" ")); return; }
        const sp=document.createElement("span"); sp.className="w"; sp.style.setProperty("--i",n++); sp.textContent=w; f.appendChild(sp); });
      h.replaceChild(f,nd); }); });
}
/* Ajusta cada titular al ancho de la pantalla (palabras largas como DESHONORES) */
function fitText(root){
  root.querySelectorAll(".rc-big,.rc-h,h2.rc-song").forEach(h=>{ h.style.fontSize=""; let fs=parseFloat(getComputedStyle(h).fontSize), n=0;
    const max=h.clientWidth; if(!max) return;
    const widest=()=>Math.max(...[...h.querySelectorAll(".w")].map(w=>w.offsetWidth),0);
    while(widest()>max&&fs>22&&n++<30){ fs*=.94; h.style.fontSize=fs+"px"; } });
}
const FXS=["fx-circle","fx-wipe","fx-zoom","fx-diag","fx-circle","fx-slide"];   // no llamarlo FX: taparía el mapa de partidos
async function openRecap(id){
  /* Cada uno solo ve el suyo (en modo prueba local se puede pedir otro para revisar) */
  id=(Store.local&&id)||Store.myPlayer||S.me; if(!P[id]) return;
  if(!available()&&!Store.local) return;   // antes del 26/12 solo los testers
  if(!Store.recapOpens) await loadOpens();
  closeRecap(true);
  const data=slides(id);
  const el=document.createElement("div"); el.id="recap"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Resumen de la primera vuelta");
  el.style.setProperty("--c",P[id].color);
  el.innerHTML=`<div class="rc-bars">${data.list.map(()=>`<i><b></b></i>`).join("")}</div>
    <button class="rc-x" data-rc-close aria-label="Cerrar">×</button><button class="rc-mute" data-rc-mute aria-label="Silenciar">${muted?"🔇":"🔊"}</button>
    <div class="rc-stage">${data.list.map((s,i)=>`<section class="rc-s rc-k-${s.k} ${FXS[i%FXS.length]}" data-i="${i}"><div class="rc-blob a"></div><div class="rc-blob b"></div><div class="rc-shape s1"></div><div class="rc-shape s2"></div>${tickerFor(s.k,id,data.x,data.song)}<div class="rc-in">${s.h}</div></section>`).join("")}</div>
    <div class="rc-start"><div class="rc-in"><div class="rc-kick">Americana Legends Cup · Vol. 1</div><h1 class="rc-big">La primera vuelta ya suena</h1><p class="rc-lead">${esc(P[id].first)}: cada historia tiene su canción. Sube el volumen.</p><button class="btn ball" data-rc-go>Empezar 🎧</button></div></div>`;
  splitWords(el);
  document.body.appendChild(el); document.body.classList.add("rc-on");
  fitText(el); try{ document.fonts&&document.fonts.ready.then(()=>RC&&RC.el===el&&fitText(el)); }catch(e){}
  RC={el,id,data,i:-1,t0:0,left:0,timer:null,paused:false};
  previews().then(pv=>{ const s=pv[data.song.id]; if(!RC||RC.id!==id) return; const art=el.querySelector(".rc-art"); if(art&&s&&s.art) art.src=s.art;
    fillArt(el); prefetch(data.list.map(z=>z.track)); if(RC.i>=0&&!curTrack) go(RC.i); });
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
  const prev=RC.i; RC.i=i; clearTimeout(RC.timer);
  const tp=RC.tap||{x:innerWidth*.8,y:innerHeight*.5}; RC.tap=null;
  RC.el.style.setProperty("--tx",tp.x+"px"); RC.el.style.setProperty("--ty",tp.y+"px");
  RC.el.classList.toggle("back",i<prev);
  RC.el.querySelectorAll(".rc-s").forEach((s,k)=>{ s.classList.toggle("on",k===i); s.classList.toggle("past",k<i); s.classList.toggle("out",k===prev&&k!==i); });
  RC.el.querySelectorAll(".rc-bars i").forEach((b,k)=>{ b.className=k<i?"done":k===i?"now":""; });
  const s=RC.data.list[i], sec=RC.el.querySelector(`.rc-s[data-i="${i}"]`);
  RC.el.querySelector(".rc-bars").style.setProperty("--d",(s.d||0)+"ms");
  countUp(sec);
  playSlide(s,sec);
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
  unlockAudio();   // cada toque asegura que el audio está activado (iPhone)
  if(t.closest("[data-rc-close]")){ closeRecap(); return; }
  if(t.closest("[data-rc-mute]")){ setMuted(!muted); t.closest("[data-rc-mute]").textContent=muted?"🔇":"🔊"; return; }
  if(t.closest("[data-rc-go]")){ unlockAudio(); RC.el.querySelector(".rc-start").classList.add("gone"); go(0); return; }
  if(t.closest("[data-rc-share]")){ shareCard(RC.id,t.closest("[data-rc-share]")); return; }
  if(t.closest("a,[data-nostep]")){ if(t.closest(".rc-spot,a")) stopAudio(); return; }
  if(RC.i<0) return;
  if(Date.now()-downAt>350&&downAt) { downAt=0; return; }   // mantener pulsado = pausa, no avanza
  downAt=0;
  RC.tap={x:e.clientX,y:e.clientY}; const x=e.clientX/window.innerWidth; go(RC.i+(x<.3?-1:1));
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
    stats.forEach(([v,l],i)=>{ const cx=80+(i%2)*470, cy=1120+Math.floor(i/2)*200; g.fillStyle="rgba(255,255,255,.1)"; g.fillRect(cx,cy,440,180);
      g.fillStyle="#fff"; g.font=`italic 900 100px ${D}`; g.fillText(v,cx+30,cy+108); g.font=`700 28px ${B}`; g.fillStyle="rgba(255,255,255,.75)"; g.fillText(l,cx+32,cy+152); });
    // Tu canción y la frase que te define
    const why=s.why(x), wrap=(t,max)=>{ const out=[]; let cur=""; t.split(" ").forEach(w=>{ const n=cur?cur+" "+w:w; if(g.measureText(n).width>max&&cur){ out.push(cur); cur=w; } else cur=n; }); if(cur) out.push(cur); return out; };
    g.font=`600 34px ${B}`; let lines=wrap(why,850); if(lines.length>3){ lines=lines.slice(0,3); lines[2]=lines[2].replace(/\s*\S*$/,"…"); }
    const boxH=150+lines.length*44; const by=Math.min(1530,1880-boxH);
    g.fillStyle="#E3FF3B"; g.fillRect(80,by,920,boxH); g.fillStyle="#06173F"; g.font=`700 30px ${B}`; g.fillText("🎧 MI IDA EN UNA CANCIÓN",115,by+50);
    let fs=64; g.font=`italic 900 ${fs}px ${D}`; const line=`${s.t.toUpperCase()} · ${s.a.toUpperCase()}`; while(g.measureText(line).width>850&&fs>30){ fs-=2; g.font=`italic 900 ${fs}px ${D}`; } g.fillText(line,115,by+118);
    g.font=`600 34px ${B}`; lines.forEach((l,i)=>g.fillText(l,115,by+172+i*44));
    const blobOut=await new Promise(r=>cv.toBlob(r,"image/jpeg",.92));
    const file=new File([blobOut],`mi-primera-vuelta-${id}.jpg`,{type:"image/jpeg"});
    const text=`🎧 Mi primera vuelta en la Americana Legends Cup: ${R.pos}º, ${R.pg}–${R.pp}. Mi canción: ${s.t} (${s.a}). ${why}`;
    if(navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],text}); return; }catch(e){ if(e&&e.name==="AbortError") return; } }
    downloadBlob(blobOut,file.name); toast("Imagen descargada: súbela a tu historia o al grupo");
  }catch(e){ console.error(e); toast("No se pudo crear la imagen"); }
  finally{ if(btn){ btn.disabled=false; btn.textContent="Compartir mi ida"; } }
}

/* ---------- Cuándo se enseña ---------- */
const TESTERS=CFG.RECAP_TESTERS||["pepe"];   // solo estas cuentas pueden ver el recap antes de tiempo
const isTester=()=>{ const me=Store.myPlayer||S.me; return !!me&&TESTERS.includes(me); };
function preview(){ if(!isTester()) return false; try{ return localStorage.getItem("am_recap_preview")==="1"; }catch(e){ return false; } }
function available(){ return today()>=RECAP_FROM || preview(); }   // antes del 26/12 solo con el enlace #recap-preview
if(location.hash==="#recap-preview"){ try{ localStorage.setItem("am_recap_preview","1"); }catch(e){} }
const ready=()=>Store.member&&(Store.first||Store.local||Object.keys(Store.matches||{}).length>0)&&!document.getElementById("gate");
function maybeAuto(){
  if(!ready()) return false;
  const want=location.hash.startsWith("#recap");
  let seen=false; try{ seen=localStorage.getItem("am_recap_seen")==="1"; }catch(e){}
  if(want||(today()>=RECAP_FROM&&!seen)){ if(available()) openRecap(); }
  return true;
}
const iv=setInterval(()=>{ if(maybeAuto()){ clearInterval(iv); countOpen(); if(available()) previews().then(()=>{ try{ const me=Store.myPlayer||S.me; if(P[me]) prefetch(slides(me).list.map(z=>z.track).slice(0,4)); }catch(e){} }); } },800);
/* Contador de entradas a la app (una por sesión): alimenta «habéis entrado X veces» */
function countOpen(){
  try{ if(sessionStorage.getItem("am_opened")) return; sessionStorage.setItem("am_opened","1"); }catch(e){ return; }
  const me=Store.myPlayer||S.me; if(!me||!P[me]) return;
  if(!Store.db){ try{ const o=JSON.parse(localStorage.getItem("am_opens")||"{}"); o.total=(o.total||0)+1; o[me]=(o[me]||0)+1; localStorage.setItem("am_opens",JSON.stringify(o)); }catch(e){} return; }
  const inc=firebase.firestore.FieldValue.increment(1);
  Store.db.collection("stats").doc("opens").set({total:inc,[me]:inc},{merge:true}).catch(()=>{});
}
window.addEventListener("hashchange",()=>{
  if(location.hash==="#recap-preview"){ try{ localStorage.setItem("am_recap_preview","1"); }catch(e){} }
  if(location.hash.startsWith("#recap")&&ready()&&available()) openRecap(); });
/* Vista previa desde la app instalada (donde no se puede escribir una URL): 7 toques seguidos en el logo */
let taps=[]; document.addEventListener("click",e=>{ if(!e.target.closest(".logo")) return; const t=Date.now(); taps=taps.filter(x=>t-x<4000); taps.push(t);
  if(taps.length>=7){ taps=[]; if(!isTester()) return; try{ localStorage.setItem("am_recap_preview","1"); }catch(e){} if(ready()) openRecap(); } });

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
window.recapNow=()=>({track:curTrack, playing:!audio.paused&&!!curTrack, t:+audio.currentTime.toFixed(2)});
window.recapSongs=()=>{ const X=idaStats(); return PLAYERS.map(p=>[p.first,SONGS[X[p.id].song].t]); };
})();
