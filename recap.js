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
  bichota:  {t:"BICHOTA",              a:"KAROL G",                       id:1560071918, why:x=>`Líder de la primera vuelta con ${x.R.pts} puntos. Aquí manda quien va primero, y lo sabe todo el grupo.`},
  silence:  {t:"The Sound of Silence", a:"Simon & Garfunkel",             id:192480260,  why:x=>`${pl(x.R.pj,"partido","partidos")} y ninguna victoria. Hay silencios que lo dicen todo… y una vuelta entera para romperlo.`},
  vacaciones:{t:"Me Fui de Vacaciones",a:"Bad Bunny",                     id:1622046237, ok:x=>x.R.pj<=1&&x.pend>=2, why:x=>`${x.R.pj?`Un partido jugado`:`Ningún partido jugado`} y ${pl(x.pend,"pendiente","pendientes")}. La liga en septiembre, tú en modo fuera de la oficina.`},
  desaparecido:{t:"Desaparecido",      a:"Manu Chao",                     id:725493637,  ok:x=>x.woL>=1, why:x=>`${pl(x.woL,"WO","WO")} en contra. Tu rival te esperó en la pista… y la pista sigue esperando.`},
  culpa:    {t:"Échame La Culpa",      a:"Luis Fonsi & Demi Lovato",      id:1447401618, ok:x=>!!x.refix, why:x=>`${x.refix.vs}: ${x.refix.n} fechas fijadas y el partido sin jugar. Échame la culpa… pero a medias.`},
  despacito:{t:"Despacito",            a:"Luis Fonsi & Daddy Yankee",     id:1447401620, ok:x=>x.late>=2, why:x=>`${x.late} de tus partidos se fueron de su jornada. Tú juegas así: despacito, muy despacito.`},
  gasolina: {t:"Gasolina",             a:"Daddy Yankee",                  id:1786000124, ok:x=>x.R.best>=2, why:x=>`${x.R.best} victorias seguidas. Ese depósito no se vacía nunca.`},
  calma:    {t:"Con Calma",            a:"Daddy Yankee & Snow",           id:1449106558, ok:x=>x.easy>=1, why:x=>x.R.jc<=x.R.pj*3?`${fmtN(x.R.jf)} juegos ganados y solo ${x.R.jc} cedidos. Ni Nadal en la Chatrier. Todo con calma.`:`${pl(x.easy,"victoria","victorias")} sin despeinarte${x.R.bag?` y ${x.R.bag} ${x.R.bag===1?"rosco":"roscos"} repartidos`:""}. Todo con calma.`},
  tusa:     {t:"Tusa",                 a:"KAROL G & Nicki Minaj",         id:1560072127, ok:x=>x.tight>=1, why:x=>`${pl(x.tight,"derrota","derrotas")} por la mínima. Tan cerca… y tan lejos. Esa tusa se cura en febrero.`},
  safaera:  {t:"Safaera",              a:"Bad Bunny, Jowell & Randy, Ñengo Flow", id:1500776935, ok:x=>x.stb>=1, why:x=>`${pl(x.stb,"super tie-break","super tie-breaks")}. Tus partidos cambian de ritmo cada dos minutos y la grada lo agradece.`},
  levanto:  {t:"Ella Me Levantó",      a:"Daddy Yankee",                  id:1786000517, ok:x=>x.R.rem>=1, why:x=>`${pl(x.R.rem,"remontada","remontadas")} después de perder el primer set. Te tumban y te levantas.`},
  resistire:{t:"Resistiré",            a:"Dúo Dinámico",                  id:292365929,  ok:x=>x.R.pp>=2&&x.R.pp>x.R.pg, why:x=>`${x.R.pg}–${x.R.pp} y sigues pidiendo pista. Eso, en esta liga, es de héroes.`},
  kuduro:   {t:"Danza Kuduro",         a:"Don Omar & Lucenzo",            id:1440636498, ok:x=>x.R.pj>0&&x.R.pj===x.maxPj, why:x=>`${x.R.pj} partidos: nadie ha pisado más la pista que tú. En una liga de aplazados, eso es oro.`},
  callaita: {t:"Callaita",             a:"Bad Bunny & Tainy",             id:1622046245, ok:x=>x.R.pj>0&&x.R.pos<=4&&x.votes<=1, why:x=>`${x.R.pos}.º de la tabla y casi nadie habla de ti. Sin hacer ruido, pero ahí arriba.`},
  ojitos:   {t:"Ojitos Lindos",        a:"Bad Bunny & Bomba Estéreo",     id:1622045962, why:x=>`${x.votes} votos MVP: nadie ha recibido más. La grada solo tiene ojos para ti.`},
  titi:     {t:"Tití Me Preguntó",     a:"Bad Bunny",                     id:1622045635, why:x=>`El mejor pronosticador de la ida: ${x.pred.hits} de ${x.pred.n} aciertos. Todos te preguntan quién gana.`},
  losiento: {t:"Lo Siento BB:/",       a:"Tainy, Bad Bunny & Julieta Venegas", id:1586673104, ok:x=>x.R.pj>0&&x.R.pos>=8, why:x=>`Cierras la ida ${x.R.pos}.º. Lo siento, pero la segunda vuelta te debe una.`},
  paso:     {t:"Lo Que Pasó, Pasó",    a:"Daddy Yankee",                  id:1786000220, ok:x=>x.R.pj>0&&x.R.pp>=x.R.pg, why:x=>`Balance de ${x.R.pg}–${x.R.pp}. Lo que pasó, pasó: en febrero, borrón y cuenta nueva.`},
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
      // Lo que contestó en las encuestas de después del partido (solo cifras agregadas)
      const st=(Store.recapSurveys||{})[p.id]||{}, q8=st.q8||{}, q3b=Object.entries(st.q3b||{}).sort((a,b)=>b[1]-a[1]);
      x.sv={noRefleja:(q8["Nada"]||0)+(q8["Poco"]||0), derecha:((st.q3b||{})["Derecha"]||0)>=1};
      // Plazos: partidos tuyos fuera de su jornada (jugados tarde o aún sin jugar con la jornada cerrada)
      x.late=0; x.pend=0; x.woL=0; x.woW=0; const t0=today();
      FIXTURE.filter(f=>f.j<=IDA&&(f.a===p.id||f.b===p.id)).forEach(f=>{ const m=getMatch(f.id), r=result(m), end=JORNADAS[f.j-1][1];
        if(!r){ if(end<t0){ x.pend++; x.late++; } return; }
        const pd=playedOn(m); if(pd&&pd>end) x.late++;
        if(r.wo){ const me=f.a===p.id?"a":"b"; r.w===me?x.woW++:x.woL++; } });
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
    const maxStb=Math.max(0,...PLAYERS.map(p=>out[p.id].stb));
    const maxLate=Math.max(0,...PLAYERS.map(p=>out[p.id].late));
    PLAYERS.forEach(p=>{ out[p.id].maxPj=maxPj; out[p.id].maxStb=maxStb; out[p.id].maxLate=maxLate; });
    const bestPred=Object.entries(pred).filter(([,v])=>v.n>=5).sort((a,b)=>(b[1].hits+b[1].exact*2)/b[1].n-(a[1].hits+a[1].exact*2)/a[1].n)[0];
    PLAYERS.forEach(p=>{ out[p.id].maxVotes=maxVotes; out[p.id].isOracle=!!(bestPred&&bestPred[0]===p.id); });
    // Reparto de canciones: puntuación por perfil, la más alta se queda la canción
    const cand=[];
    PLAYERS.forEach(p=>{ const x=out[p.id], R=x.R, add=(k,s)=>{ if(s>0) cand.push({id:p.id,k,s}); };
      add("silence", R.pj>0&&R.pg===0&&R.pp>=2?1000:0);
      add("bichota", R.pj>=2&&R.pos===1?900:0);
      add("vacaciones", R.pj<=1&&x.pend>=2?600+x.pend*30:0);
      add("desaparecido", x.woL>=1?560+x.woL*40:0);
      add("losiento", R.pg>0&&R.pos===PLAYERS.length?500:0);
      add("calma", x.easy>=2&&R.jc<=R.pj*3?300+x.easy*20:0);   // arrasando: casi sin ceder juegos
      add("despacito", x.late>=3?150+x.late*30:0);
      add("ojitos", x.votes>=2&&x.votes===maxVotes?130+x.votes*10:0);
      add("titi", bestPred&&bestPred[0]===p.id?125:0);
      add("gasolina", R.best>=3?100+R.best*40:0);
      add("levanto", R.rem?90+R.rem*40:0);
      add("safaera", x.stb>=2?80+x.stb*35:0);
      add("tusa", x.tight>=2?80+x.tight*35:0);
      add("resistire", R.pp>=3&&R.pp>R.pg?85+R.pp*10:0);
      add("callaita", R.pos<=3&&R.pos>1&&x.votes<=1&&R.pj>0?110:0);
      add("calma", x.easy>=2?70+x.easy*25+R.bag*10:0);
      add("kuduro", R.pj===maxPj&&R.pj>=4?60+R.pj*5:0);
      add("despacito", x.late>=2?55+x.late*10:0);
      add("paso", R.pp>R.pg&&R.pos>=6?60+(R.pp-R.pg)*10:0);
      Object.entries(SONGS).forEach(([k,S])=>{ if(S.ok&&S.ok(x)) add(k,1); });   // comodines: solo si la frase es cierta
    });
    const LF=leagueStats().mostFixed;
    if(LF&&!LF.played) [LF.m.a,LF.m.b].forEach(id=>{ out[id].refix={vs:vs(LF.m),n:LF.n}; cand.push({id,k:"culpa",s:420+LF.n*20}); });
    cand.sort((a,b)=>b.s-a.s||a.id.localeCompare(b.id));
    const usedS=new Set(), song={};
    cand.forEach(c=>{ if(song[c.id]||usedS.has(c.k)) return; song[c.id]=c.k; usedS.add(c.k); });
    // Último recurso (muy improbable): se repite la canción neutra que encaje antes que poner una frase falsa
    PLAYERS.forEach(p=>{ if(!song[p.id]) song[p.id]=["bonito","vacaciones","paso","despacito"].find(k=>SONGS[k].ok(out[p.id]))||(out[p.id].R.pj?"bonito":"vacaciones"); });
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
  hoynome:  {t:"Hoy No Me Puedo Levantar", a:"Mecano",               id:1559885440},
  quedo:    {t:"Me Quedo Contigo",     a:"Los Chunguitos",           id:691914430},
};
const HOOK = {"september": "Porque todo arrancó un 28 de septiembre.","migente": "Porque esto va de mi gente: 10 amigos y una liga.","amanecer": "Porque hay partidos que se aplazan hasta el amanecer.","porahi": "Porque, con tanto aplazamiento, medio liga estaba bailando por ahí.","vivir": "Porque esta liga se vive. Y tú la vives así.","limbo": "Porque hay quien juega en otra dimensión.","shaky": "Porque estos números hacen temblar a cualquiera.","inmyhead": "Porque esas derrotas siguen en tu cabeza.","bici": "Porque la tabla sube y baja como una bicicleta.","perdon": "Porque hay temporadas que piden perdón.","dura": "Porque así de dura ha sido tu ida.","culpa": "Porque a alguien hay que echarle la culpa.","amigos": "¿Amigos? En la pista no hay amigos.","abusadora": "Porque hay rivales que abusan sin piedad.","pajaritos": "Porque ese día te pintaron pajaritos.","bailando": "Porque ese día bailaste a tu rival.","gozadera": "Porque la grada es una gozadera.","corazon": "Gracias, de corazón.","livin": "Porque esta liga es la vida loca.","mordidita": "Porque cada partido deja su mordidita.","ventepaca": "Vente pa' cá, que esto no ha acabado.","subeme": "Súbele el volumen a estos números.","bailamos": "Porque en la pista bailamos todos.","chantaje": "Porque contra algunos rivales todo vale.","tortura": "Porque hay partidos que son una tortura.","hips": "Porque los números no mienten.","loca": "Porque esta ida ha sido una locura.","partio": "Porque hay derrotas que te dejan el corazón partío.","rakata": "Porque ganaste a ritmo de rakata.","levanto": "Porque esta liga te ha levantado.","daledon": "Porque había que darle. Y le diste.","salio": "Porque al final siempre sale el sol.","ellayyo": "Porque algunas rivalidades son cosa de dos.","obsesion": "Porque esa derrota ya es una obsesión.","propuesta": "Porque la revancha es una propuesta indecente.","travesuras": "Porque en la pista hiciste tus travesuras.","felices": "Porque aquí cabemos todos: felices los diez.","hawai": "Porque arriba de la tabla se está como en Hawái.","sixam": "Porque hay partidos que parece que acaban a las 6 AM.","ayvamos": "¡Ay, vamos! Que esto sigue.","ginza": "Porque esta grada lo pide.","calma": "Porque todo, con calma.","taxi": "Porque esta racha no la para ni un taxi.","camisa": "Porque hay días de camisa negra.","adios": "Porque a Dios le pides una segunda vuelta así.","mayores": "Porque esto ya es cosa de mayores.","sincontrato": "Porque aquí se juega sin contrato y con orgullo.","lomalo": "Porque lo malo también se celebra.","megustas": "Porque esta liga, sencillamente, nos gusta.","bonito": "Porque, al final, todo te parece bonito.","granoche": "Porque esta primera vuelta ha sido una gran noche.","hoynome": "Porque los pronósticos y los votos dejaron de levantarse.","quedo": "Porque, con todo, me quedo con esta liga."};
/* Ánimos: cada historia tira de uno; a cada jugador le tocan canciones distintas y sin repetir artista */
const MOOD = {
  fiesta:   ["migente","gozadera","bailando","vivir","limbo","shaky","livin","mordidita","ventepaca","subeme","bailamos","hips","loca","levanto","daledon","salio","travesuras","felices","hawai","sixam","ayvamos","ginza","calma","taxi","camisa","mayores","lomalo","bici","rakata"],
  derrota:  ["perdon","inmyhead","partio","tortura","obsesion","ellayyo","propuesta","adios","amanecer","sincontrato","pajaritos"],
  rival:    ["culpa","chantaje","tortura","rakata","ellayyo","propuesta"],
  racha:    ["dura","rakata","levanto","limbo","daledon","salio","shaky","taxi","sixam"],
  nostalgia:["corazon","granoche","quedo","bonito","megustas","adios","vivir","livin","bailamos","bici","camisa"],
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
    case "plazos": return L.played&&L.onTime/L.played<.5?["amanecer","sixam"]:"fiesta";   // partidos que acaban jugándose «hasta el amanecer»
    case "honores": return L.mostFixed&&!L.mostFixed.played?["culpa","porahi"]:L.late>=5?["porahi","amanecer"]:"fiesta";   // a alguien hay que echarle la culpa
    case "fuera": return ["hoynome","subeme"];
    case "intro": return "nostalgia";
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
  if(key==="abusadora"&&x.nemesis) return `Porque ${P[x.nemesis].first} te ha repasado sin piedad.`;
  if(key==="amigos"&&x.nemesis) return `¿Amigos? ${P[x.nemesis].first} no se acordó en la pista.`;
  if(key==="porahi"&&L.late) return `Porque con ${L.late} partidos fuera de plazo, media liga estaba bailando por ahí.`;
  if(key==="amanecer"&&k==="plazos") return `Porque aquí los partidos se juegan… cuando se juegan.`;
  if(key==="culpa"&&k==="honores"&&L.mostFixed) return `Porque de ${vs(L.mostFixed.m)} alguien tendrá la culpa.`;
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
const dayDiff=(a,b)=>{ const P_=s=>{ const[y,m,d]=s.split("-").map(Number); return Date.UTC(y,m-1,d); }; return Math.round((P_(b)-P_(a))/864e5); };
const ymdOf=t=>{ const d=new Date(t); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const MES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fmtDia=s=>{ const[,m,d]=s.split("-").map(Number); return `${d} de ${MES[m-1]}`; };
/* Día en que se jugó: la fecha fijada; si no hay (o es posterior), el día en que se apuntó el resultado */
function playedOn(m){ const u=m.updated?ymdOf(m.updated):null; if(m.date&&(!u||m.date<=u)) return m.date; return u||m.date||null; }
function leagueStats(){
  return cached("recapLiga",()=>{
    const fx=FIXTURE.filter(f=>f.j<=IDA), t0=today();
    const L={total:fx.length,played:0,games:0,sets:0,stb:0,wo:0,late:0,latePending:0,lateBy:{},onTime:0,lateDays:[],worst:null,oldest:null,longest:null,days:{},hours:{},courts:{},bags:0,
      preds:0,predDays:{},predLast:null,votes:0,voteLast:null,dates:0,fixed:{},mostFixed:null,live:0,excuse:null,blame:{}};
    fx.forEach(f=>{ const m=getMatch(f.id), r=result(m), end=JORNADAS[f.j-1][1];
      const pd=r?playedOn(m):null, late=r ? (!!pd&&pd>end) : (end<t0);
      if(late){ L.late++; if(!r) L.latePending++; [m.a,m.b].forEach(p=>L.lateBy[p]=(L.lateBy[p]||0)+1); }
      if(!r){ if(end<t0){ const d=dayDiff(end,t0); if(!L.oldest||d>L.oldest.d) L.oldest={m,d}; } return; }
      L.played++;
      if(!late) L.onTime++; else if(pd){ const d=dayDiff(end,pd); L.lateDays.push(d); if(!L.worst||d>L.worst.d) L.worst={m,d}; }
      if(r.wo){ L.wo++; return; }
      L.sets+=r.sets.length; L.stb+=r.sets.filter(s=>s.st).length;
      L.bags+=r.sets.filter(s=>!s.st&&Math.min(s.a,s.b)===0&&Math.max(s.a,s.b)===6).length;
      const g=r.sets.reduce((s,z)=>s+(z.st?0:z.a+z.b),0); L.games+=g;
      if(!L.longest||g>L.longest.g) L.longest={m,g};
      if(m.date){ const[y,mo,d]=m.date.split("-").map(Number); const w=new Date(y,mo-1,d).getDay(); L.days[w]=(L.days[w]||0)+1; }
      if(m.time){ const h=m.time.slice(0,2); L.hours[h]=(L.hours[h]||0)+1; }
      const c=String(m.court||"").replace(/^pista\s*/i,"").trim(); if(c) L.courts[c]=(L.courts[c]||0)+1;
    });
    L.avgLate=L.lateDays.length?Math.round(L.lateDays.reduce((s,n)=>s+n,0)/L.lateDays.length):0;
    // Pronósticos y votos: cuántos y cuándo se dejaron de hacer
    Object.values(Store.preds).forEach(p=>{ const f=FX[p.m]; if(!f||f.j>IDA) return; L.preds++; if(p.t){ const d=ymdOf(p.t); L.predDays[d]=(L.predDays[d]||0)+1; if(!L.predLast||d>L.predLast) L.predLast=d; } });
    const pd=Object.keys(L.predDays).sort(); L.predFirst=pd[0]||null;
    L.predFirstWeek=pd.filter(d=>L.predFirst&&dayDiff(L.predFirst,d)<7).reduce((s,d)=>s+L.predDays[d],0);
    Object.values(Store.votes).forEach(v=>{ if(v.j>IDA) return; L.votes++; if(v.t){ const d=ymdOf(v.t); if(!L.voteLast||d>L.voteLast) L.voteLast=d; } });
    // Registro: cuántas veces se ha fijado la fecha de cada partido
    Object.values(Store.log||{}).forEach(e=>{ if(!e||!e.txt) return;
      if(e.k==="date"||/^fijó /.test(e.txt)){ L.dates++; const k=e.m||e.txt.split(" para ")[0]; L.fixed[k]=(L.fixed[k]||0)+1; }
      if(/^empezó el marcador en directo/.test(e.txt)) L.live++; });
    const mf=Object.entries(L.fixed).filter(([k])=>FX[k]&&FX[k].j<=IDA).sort((a,b)=>b[1]-a[1])[0];
    if(mf&&mf[1]>=3){ const m=getMatch(mf[0]); L.mostFixed={m,n:mf[1],played:!!result(m)}; }
    L.moved=Object.values(L.fixed).reduce((s,n)=>s+Math.max(0,n-1),0);
    // Encuestas de después del partido: la condición que más sale en las derrotas
    const ex={}; Object.values(Store.recapSurveys||{}).forEach(st=>{ Object.entries((st&&st.c5)||{}).forEach(([k,v])=>{ if(k==="Perfectas") return; const e=ex[k]||(ex[k]={l:0,w:0}); e.l+=v.l||0; e.w+=v.w||0; }); });
    const top=Object.entries(ex).sort((a,b)=>b[1].l-a[1].l)[0]; if(top&&top[1].l>=2) L.excuse={k:top[0],l:top[1].l,w:top[1].w};
    const topOf=o=>Object.entries(o).sort((a,b)=>b[1]-a[1])[0]||null;
    L.lateKing=topOf(L.lateBy); L.day=topOf(L.days); L.hour=topOf(L.hours); L.court=topOf(L.courts);
    if(L.lateKing&&L.lateKing[1]<2) L.lateKing=null;
    L.hoursOnCourt=Math.round(L.games*5/60);   // a ojo: unos 5 minutos por juego
    L.X=window.RECAP_DATA||{};
    return L;
  });
}

/* ---------- Bromas ----------
   Estilo: pique directo entre amigos. Cada broma va atada a un dato y lleva una etiqueta (la referencia):
   en un mismo recap no se repite ninguna etiqueta, así que nunca salen dos de Renfe, dos de Wimbledon, etc.
   Cuando varias encajan, gana la de más peso; a igualdad, cada jugador recibe una distinta. */
const vs=m=>`${P[m.a].first}–${P[m.b].first}`;
const J_=(when,score,tag,text)=>when?{score,tag,text}:null;
const jokesLiga = {
  plazos: L=>{ const pct=L.played?Math.round(100*L.onTime/L.played):100; return [
    J_(L.played&&pct<50,90,"ryanair",`${L.onTime} de ${L.played} partidos jugados en su jornada. Si esto fuera Ryanair, cada vez que se juega uno a tiempo sonaría la trompetita.`),
    J_(L.worst&&L.worst.d>=25,80,"tarde",`${vs(L.worst.m)} se jugó ${L.worst.d} días tarde. Para entonces, alguno ya ni se acordaba de cómo se cogía la raqueta.`),
    J_(L.oldest&&L.oldest.d>=30,70,"campnou",`${vs(L.oldest.m)} lleva ${L.oldest.d} días fuera de plazo. Como las obras del Camp Nou: siempre está a punto de acabarse.`),
    J_(true,1,"base",`Aplazar también es parte del juego. Con honor.`),
  ]; },
  honores: L=>[
    J_(L.mostFixed&&!L.mostFixed.played,95,"chiringuito",`${vs(L.mostFixed.m)}: ${L.mostFixed.n} fechas fijadas y 0 partidos. Tiene más amagos que un fichaje de verano en El Chiringuito.`),
    J_(L.mostFixed&&L.mostFixed.played,85,"boda",`${vs(L.mostFixed.m)} necesitó ${L.mostFixed.n} fechas para jugarse. Hay bodas que se organizan con menos llamadas.`),
    J_(L.longest&&L.longest.g>=20,60,"sobremesa",`${L.longest.g} juegos entre ${vs(L.longest.m)}. Dio tiempo a pedir, comer y alargar la sobremesa.`),
    J_(L.wo>=2,55,"sofa",`${L.wo} partidos ganados por WO. La victoria más cómoda desde que se inventó el sofá.`),
    J_(true,1,"base",`Con todo el honor del mundo: aquí aplazar es casi disciplina olímpica.`),
  ],
  fuera: L=>{ const g=L.X.github||{}; return [
    J_(L.excuse,95,"viento",`Según vuestras encuestas, «${(L.excuse||{}).k?.toLowerCase()}» aparece en ${(L.excuse||{}).l} derrotas. En esta liga el viento gana más que media tabla.`),
    J_(g.commits&&L.played&&g.commits/L.played>=4,80,"app",`La app se ha actualizado ${g.commits} veces y se han jugado ${L.played} partidos. Aquí se programa más de lo que se juega.`),
    J_(L.votes>0&&L.votes<=10,60,"eurovision",`${L.votes} votos MVP en toda la ida. Ni a Eurovisión le hacemos tan poco caso.`),
    J_(L.predLast&&L.preds>=20&&dayDiff(L.predLast,today())>=21,50,"whatsapp",`${L.preds} pronósticos y, desde el ${fmtDia(L.predLast||today())}, silencio. Como el grupo de WhatsApp al día siguiente de la cena.`),
    J_(true,1,"base",`Lo que pasa fuera de la pista también cuenta.`),
  ]; },
};
/* Frase de entrada de cada jugador: quién es esta temporada (sin broma, para presentar) */
function tagline(x,L){ const R=x.R, id=x.id;
  const c=[
    J_(R.pj>=2&&R.pos===1,90,"t",`Líder de la ida. Que tiemble la tabla.`),
    J_(R.pj>=2&&R.jc<=R.pj*3,85,"t",`${R.pj} partidos y ${R.jc} juegos cedidos. Ni Nadal en la Chatrier.`),
    J_(!R.pj,80,"t",`La primera vuelta, en modo avión.`),
    J_(L.lateKing&&L.lateKing[0]===id,75,"t",`El rey del «esta semana no me va».`),
    J_(R.pj&&R.pg===0,60,"t",`Una ida para olvidar. Por eso vamos a recordarla.`),
    J_(x.votes>=2&&x.votes===x.maxVotes,50,"t",`El favorito de la grada. Los votos no mienten.`),
    J_(x.isOracle,48,"t",`El oráculo de la liga: el que más acierta quién gana.`),
    J_(x.stb>=1&&x.stb===x.maxStb,45,"t",`Si hay super tie-break, ahí estás. El corazón de la liga, a 10 puntos.`),
    J_(R.pj&&R.pos>=2&&R.pos<=3,35,"t",`En la pomada, a la caza del líder.`),
    J_(R.pj&&R.pp>R.pg,30,"t",`Una ida cuesta arriba. Las mejores remontadas empiezan así.`),
    J_(true,10,"t",R.pos<=4?`Zona noble de la tabla. Veamos cómo llegaste.`:`Una ida con mucha vuelta por delante.`),
  ];
  return pickJoke(c,new Set(),x.id); }
/* Bromas de cada jugador, por historia */
function jokesYo(k,x,L){ const R=x.R, late=x.late, op=m=>P[m.a===x.id?m.b:m.a].first, sv=x.sv||{};
  const few=R.pj<=Math.max(1,x.maxPj-3), lossy=R.pj&&R.pp>R.pg;
  const maxLate=x.maxLate||0, topLate=late>=3&&late===maxLate, hadPaliza=R.res.some(m=>isPaliza(m,x.id));
  if(k==="nums") return [
    J_(topLate,85,"renfe",`Has aplazado tantos partidos que ya no sabemos si juegas al tenis o trabajas en Renfe.`),
    J_(topLate,85,"netflix",`Tienes más partidos a medias que series empezadas en Netflix.`),
    J_(topLate,85,"opositor",`Aplazas más que un opositor que empieza a estudiar «el lunes».`),
    J_(late>=2&&!topLate,50,"cena",`Cuadrar un partido contigo es como cuadrar la cena de antiguos alumnos: todos dicen que sí, nadie pone fecha.`),
    J_(few,84,"hazard",`${pl(R.pj,"partido","partidos")} en toda la ida. Has jugado menos que Hazard en el Madrid.`),
    J_(R.pp>=1&&(sv.noRefleja||0)>=1,88,"pedrerol",`Pierdes un partido y ya tienes más explicaciones que Pedrerol un lunes.`),
    J_(R.pp>=1&&sv.derecha,87,"derecha",`Tu derecha tiene más peligro para el público que para el rival.`),
    J_(hadPaliza,76,"torrente",`Hubo un día en que tuviste menos elegancia que Torrente jugando en Wimbledon.`),
    J_(R.pj&&R.pg===0,75,"relacion",`Tu relación con ganar es complicada: tú quieres, pero ella no.`),
    J_(lossy&&R.pg>0,55,"distancia",`La victoria y tú tenéis una relación a distancia.`),
    J_(R.pg>=3&&R.pp===0,70,"hacienda",`Invicto. A ti no te ha pillado ni Hacienda.`),
    J_(R.pj>=2&&R.pos===1,65,"prismaticos",`Vas tan primero que el segundo te mira con prismáticos.`),
    J_(R.pj&&R.pj===x.maxPj&&R.pj>=4,50,"ibi",`Pisas tanto la pista que el club te va a cobrar el IBI.`),
    J_(R.pj&&R.pos===PLAYERS.length,45,"tabla",`Desde donde estás en la tabla solo se puede mirar hacia arriba. Algo es algo.`),
    J_(R.pj&&R.pg===R.pp,40,"antena3",`Ni fu ni fa: si tu ida fuera una película, sería la de la sobremesa del domingo.`),
    J_(x.woL>=1,78,"wo",`Perdiste por WO: la única derrota en la que no fallaste ni una bola.`),
  ];
  if(k==="streak") return [
    J_(R.bag>=2,85,"panaderia",`${R.bag} roscos. Repartes más que una panadería un domingo por la mañana.`),
    J_(R.bag>=1&&x.easy>=2,70,"reclamaciones",`Tus rivales salen de la pista pidiendo la hoja de reclamaciones.`),
    J_(x.easy>=2,55,"parking",`Ganas tan rápido que el parking te sale gratis.`),
    J_(R.bagL>=1,74,"albanil",`Te han endosado un 6-0. Ese día tuviste menos toque que un albañil con guantes de boxeo.`),
    J_(x.stb>=2,80,"ambulancia",`Tus partidos deberían incluir ambulancia y seguro médico.`),
    J_(x.stb===1,50,"cardiologo",`Un super tie-break y tu cardiólogo ya tiene la app instalada.`),
    J_(R.rem>=1,75,"champions",`Remontas más que el Madrid en Champions.`),
    J_(x.tight>=2,60,"perdon",`Pierdes por tan poco que el rival debería pedirte perdón.`),
    J_(R.best>=3,45,"gesta",`${R.best} seguidas. En esta liga, juntar tres partidos ya es una gesta logística.`),
  ];
  if(k==="match"&&x.match){ const r=result(x.match.m), m=x.match.m, won=x.match.won, paliza=!won&&isPaliza(m,x.id), o=op(m);
    return [
      J_(paliza,85,"torrente",`Ese día tuviste menos elegancia que Torrente jugando en Wimbledon.`),
      J_(!won&&(sv.noRefleja||0)>=1,90,"pedrerol",`Pierdes un partido y ya tienes más explicaciones que Pedrerol un lunes.`),
      J_(!won&&sv.derecha,80,"derecha",`Tu derecha tiene más peligro para el público que para el rival.`),
      J_(r.sets.some(z=>z.st),65,"ambulancia",`A super tie-break. Ese partido debería haber incluido ambulancia y seguro médico.`),
      J_(won&&r.sets.every(z=>!z.st&&Math.min(z.a,z.b)<=1),80,"chatrier",`Ese día ${o} solo pudo mirar. Ni Nadal en la Chatrier.`),
      J_(won&&x.upset&&x.upset.m.id===m.id&&x.upset.pe<.35,70,"leicester",`Nadie daba un duro por ti. Lo tuyo fue el Leicester ganando la Premier.`),
      J_(won,30,"selfie",`${o} todavía no ha subido ninguna foto de ese partido. Por algo será.`),
      J_(won,30,"cena2",`Ese día la cena la pagó ${o}. Y lo sabes.`),
      J_(!won,30,"ducha",`Ese partido todavía lo repasas en la ducha.`),
    ]; }
  if(k==="rivals") return [
    J_(x.nemesis,60,"pesadilla",`Contra ${x.nemesis?P[x.nemesis].first:""} juegas como en las pesadillas: corres, pero no avanzas.`),
    J_(x.nemesis,60,"jefe",`${x.nemesis?P[x.nemesis].first:""} es tu jefe final: cada vez que te lo cruzas, pierdes una vida.`),
    J_(x.nemesis,60,"examen",`Contra ${x.nemesis?P[x.nemesis].first:""} vas como a un examen de recuperación: sabes que vas a sufrir.`),
    J_(x.fetiche&&!x.nemesis,55,"bolsillo",`A ${x.fetiche?P[x.fetiche].first:""} ya le podrías cobrar alquiler: vive en tu bolsillo.`),
    J_(x.fetiche&&!x.nemesis,55,"cliente",`${x.fetiche?P[x.fetiche].first:""} ya es cliente fijo: viene, paga y se va.`),
  ];
  if(k==="crowd"){ const acc=x.pred.n?x.pred.hits/x.pred.n:0; return [
    J_(x.pred.n>=4&&acc>=.75,70,"apuestas",`Aciertas el ${Math.round(acc*100)}%. Con ese ojo, deja el tenis y monta una casa de apuestas.`),
    J_(x.pred.n>=4&&acc<=.4,70,"moneda",`Aciertas el ${Math.round(acc*100)}%. Tirando una moneda irías mejor.`),
  ]; }
  return [];
}
/* La de más peso que no repita referencia; a igualdad, una distinta para cada jugador */
function pickJoke(c,used,seed){ const ok=c.filter(Boolean).filter(j=>!used.has(j.tag)).sort((a,b)=>(b.score+(hashStr(seed+b.tag)%7)/10)-(a.score+(hashStr(seed+a.tag)%7)/10)); if(!ok.length) return ""; if(ok[0].tag!=="base"&&ok[0].tag!=="t") used.add(ok[0].tag); return ok[0].text; }
const quipHTML=t=>t?`<p class="rc-quip">${esc(t)}</p>`:"";

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
  const USED=new Set(), lj=k=>quipHTML(pickJoke(jokesLiga[k](L),USED,id)), yq=k=>quipHTML(pickJoke(jokesYo(k,x,L),USED,id));
  /* 1-5 · La liga */
  add("liga",9000,`<div class="rc-kick">Seniors, Juniors:</div>
    <h1 class="rc-big">Empezó como una idea entre ${PLAYERS.length} amigos.</h1>
    <p class="rc-lead">Todo arrancó el 28 de septiembre. Primera vuelta: <b>${fmtN(L.played)}</b> de ${L.total} partidos jugados, <b>${fmtN(L.games)}</b> juegos y <b>${fmtN(L.stb)}</b> super tie-breaks. Esto ya no es una pachanga: es una liga. Con sus cosas.</p>`);
  const big=[[L.played,`de ${L.total} partidos jugados`],[L.games,"juegos disputados"],[L.hoursOnCourt,"horas en pista (a ojo)"],[L.bags,L.bags===1?"rosco (6-0)":"roscos (6-0)"],[L.stb,"super tie-breaks"],[L.preds,"pronósticos"]].filter(([v])=>v>0).slice(0,6);
  add("cifras",9000,`<h2 class="rc-h">La ida en cifras</h2><div class="rc-grid rc-grid3">${big.map(([v,l])=>`<div><b data-count="${v}">0</b><small>${l}</small></div>`).join("")}</div>
    ${L.day?`<p class="rc-lead">Día favorito: los <b>${WD[L.day[0]]}</b>${L.hour?`, sobre las <b>${+L.hour[0]}:00</b>`:""}${L.court&&L.court[1]>=3?`. Y la pista ${esc(L.court[0])}, vuestra segunda casa (${L.court[1]} partidos)`:""}.</p>`:""}`);
  add("plazos",10000,`<h2 class="rc-h">Puntualidad</h2>
    <div class="rc-num"><span data-count="${L.onTime}">0</span><small>de ${L.played} partidos, jugados dentro de su jornada</small></div>
    <div class="rc-row">${L.avgLate?`<div><b data-count="${L.avgLate}">0</b><small>días de retraso medio</small></div>`:""}<div><b data-count="${L.latePending}">0</b><small>partidos fuera de plazo y aún por jugar</small></div></div>
    ${lj("plazos")}`);
  const aw=[];
  if(L.lateKing) aw.push(`<li>${face(L.lateKing[0],"sm")}<span><small>Rey del aplazamiento</small><b>${nm(L.lateKing[0])}</b> · ${L.lateKing[1]} partidos fuera de plazo</span></li>`);
  if(L.mostFixed) aw.push(`<li><span class="rc-face sm rc-face-x">📅</span><span><small>El partido más refijado</small><b>${nm(L.mostFixed.m.a)} – ${nm(L.mostFixed.m.b)}</b> · ${L.mostFixed.n} fechas${L.mostFixed.played?"":" y sin jugar"}</span></li>`);
  if(L.longest) aw.push(`<li><span class="rc-face sm rc-face-x">⏱</span><span><small>El partido más largo</small><b>${nm(L.longest.m.a)} – ${nm(L.longest.m.b)}</b> · ${L.longest.g} juegos</span></li>`);
  add("honores",10000,`<h2 class="rc-h">Méritos, honores y deshonores</h2>
    <ul class="rc-awards">${aw.join("")}</ul>${lj("honores")}`);
  const g=L.X.github||{}, ph=L.X.posthog||{}, ve=L.X.vercel||{};
  const off=[];
  if(g.commits) off.push(`<div><b data-count="${g.commits}">0</b><small>actualizaciones de la app</small></div>`);
  off.push(`<div><b data-count="${L.preds}">0</b><small>pronósticos${L.predLast?` · el último, el ${fmtDia(L.predLast)}`:""}</small></div>`);
  off.push(`<div><b data-count="${L.votes}">0</b><small>votos MVP${L.voteLast?` · el último, el ${fmtDia(L.voteLast)}`:""}</small></div>`);
  if(ve.iosShare) off.push(`<div><b data-count="${Math.round(ve.iosShare*100)}">0</b><small>% de las visitas, desde iPhone</small></div>`);
  add("fuera",10000,`<h2 class="rc-h">Fuera de la pista</h2><div class="rc-grid">${off.slice(0,4).join("")}</div>${lj("fuera")}`);
  /* 4+ · Tu ida */
  add("intro",7500,`<div class="rc-kick">Y ahora, tú</div><h1 class="rc-big">${esc(p.first)}</h1>
    <div class="rc-hero">${face(id,"xl")}</div>
    <p class="rc-lead">${esc(tagline(x,L))}</p>`);
  if(!R.pj){
    add("none",7000,`<h2 class="rc-h">La ida, desde la grada</h2><div class="rc-num"><span data-count="0">0</span><small>partidos</small></div><p class="rc-lead">Te guardamos el sitio en la segunda vuelta.</p>${yq("nums")}`);
  } else {
    add("nums",8000,`<h2 class="rc-h">Tus números</h2>
      <div class="rc-num"><span data-count="${R.pj}">0</span><small>partidos</small></div>
      <div class="rc-row"><div><b class="rc-w" data-count="${R.pg}">0</b><small>victorias</small></div><div><b data-count="${R.pp}">0</b><small>derrotas</small></div><div><b data-count="${R.jf}">0</b><small>juegos ganados</small></div></div>
      <p class="rc-lead">${pct>=100?`<b>Nadie</b> ha ganado más juegos que tú.`:pct<=0?`De momento, a la cola en juegos ganados. Margen hay.`:`Has ganado más juegos que el <b>${pct}%</b> de la liga.`}</p>${yq("nums")}`);
    add("pos",7500,`<h2 class="rc-h">Cierras la ida</h2>
      <div class="rc-num rc-posn"><span data-count="${R.pos}">0</span><sup>º</sup></div>
      <div class="rc-row"><div><b data-count="${R.pts}">0</b><small>puntos</small></div><div><b data-count="${x.elo}">0</b><small>índice Elo · ${x.eloPos}º</small></div></div>
      <p class="rc-lead">${R.pos<=4?"Hoy estarías en playoffs. Que no se escape.":R.pos<=7?"A tiro de los playoffs. La vuelta decide.":"La tabla da muchas vueltas. Y queda la segunda."}</p>`);
    const stk=[]; if(R.best) stk.push(`<div><b data-count="${R.best}">0</b><small>mejor racha de victorias</small></div>`);
    if(R.rem) stk.push(`<div><b data-count="${R.rem}">0</b><small>${R.rem===1?"remontada":"remontadas"}</small></div>`);
    if(x.stb) stk.push(`<div><b data-count="${R.stW}">0</b><small>super tie-breaks ganados de ${x.stb}</small></div>`);
    if(R.bag) stk.push(`<div><b data-count="${R.bag}">0</b><small>${R.bag===1?"rosco":"roscos"} (6-0)</small></div>`);
    if(stk.length) add("streak",8000,`<h2 class="rc-h">Tu carácter en pista</h2><div class="rc-grid">${stk.join("")}</div>
      <p class="rc-lead">Forma: <span class="rc-form">${R.form.map(f=>`<i class="${f==="W"?"w":"l"}">${f==="W"?"V":"D"}</i>`).join("")}</span></p>${yq("streak")}`);
    if(x.fetiche||x.nemesis) add("rivals",8000,`<h2 class="rc-h">Tus rivales</h2><div class="rc-duo">
      ${x.fetiche?`<div class="rc-riv">${face(x.fetiche)}<small>Rival fetiche</small><b>${nm(x.fetiche)}</b><span>${R.h2h[x.fetiche].w}–${R.h2h[x.fetiche].l}</span></div>`:""}
      ${x.nemesis?`<div class="rc-riv bad">${face(x.nemesis)}<small>Tu némesis</small><b>${nm(x.nemesis)}</b><span>${R.h2h[x.nemesis].w}–${R.h2h[x.nemesis].l}</span></div>`:""}
      </div>${yq("rivals")||`<p class="rc-lead">${x.nemesis&&x.fetiche?"A uno ya le tienes cogida la medida. Con el otro hay cuentas pendientes.":x.fetiche?"Nadie te ha cogido la medida. De momento.":"La vuelta es para ajustar cuentas."}</p>`}`);
    if(x.match){ const ml=matchLine(x.match.m,id); add("match",8000,`<h2 class="rc-h">${x.match.won?"El partido de tu ida":"El que más dolió"}</h2>
      <div class="rc-vs">${face(id)}<em>vs</em>${face(ml.op)}</div>
      <div class="rc-score">${esc(ml.sets)}</div><p class="rc-lead">Jornada ${ml.j} contra ${nm(ml.op)}. ${x.match.won?(x.upset&&x.upset.m.id===x.match.m.id&&x.upset.pe<.35?`Nadie daba un duro por ti (${Math.round(x.upset.pe*100)}% de opciones). Y ganaste.`:"Ese día fuiste leyenda."):(isPaliza(x.match.m,id)?"Ese día te pintaron pajaritos.":"Ese se queda en la memoria. Para mal.")}</p>${yq("match")}`); }
  }
  if(x.votes>=1||x.pred.n>=3){ const acc=x.pred.n?x.pred.hits/x.pred.n:0;
    add("crowd",7500,`<h2 class="rc-h">La grada</h2>${x.votes?`<div class="rc-row"><div><b data-count="${x.votes}">0</b><small>votos MVP recibidos</small></div><div><b data-count="${x.mvpJ}">0</b><small>${x.mvpJ===1?"jornada como MVP":"jornadas como MVP"}</small></div></div>`:""}
    ${x.pred.n?`<div class="rc-row"><div><b data-count="${x.pred.hits}">0</b><small>pronósticos acertados de ${x.pred.n}</small></div><div><b data-count="${x.pred.exact}">0</b><small>clavados al set</small></div></div>`:""}${yq("crowd")}`); }
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
    <p class="rc-lead">La vuelta arranca el <b>1 de febrero</b>. Propósito de año nuevo: cada partido, en su jornada. Sin prórrogas.</p>
    <button class="btn ghost" data-rc-close data-nostep>Volver a la app</button>`);
  return {list:out, x, song:S2};
}

/* ---------- Reproductor de historias ---------- */
let RC=null;
/* Encuestas de después del partido (solo cifras agregadas): para las «excusas» de la liga */
async function loadSurveys(){
  if(!Store.db){ Store.recapSurveys={}; return; }
  try{ const q=await Store.db.collection("survey_stats").get(); Store.recapSurveys={}; q.forEach(d=>Store.recapSurveys[d.id]=d.data()); VERSION++; }catch(e){ Store.recapSurveys={}; }
}
const trackIds=d=>[...new Set(d.list.flatMap(s=>[s.track,...(s.alts||[]).slice(0,1)]).filter(Boolean))];
/* Rótulo gigante que cruza el fondo de cada historia */
function tickerFor(k,id,x,song){
  const R=x.R, T={liga:"PRIMERA VUELTA",cifras:"LA IDA EN CIFRAS",plazos:"PUNTUALIDAD",honores:"DESHONORES",fuera:"FUERA DE PISTA",intro:P[id].first.toUpperCase(),nums:"TUS NÚMEROS",none:"DESDE LA GRADA",
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
const FXT=["fx-circle","fx-wipe","fx-zoom","fx-diag","fx-circle","fx-slide"];
async function openRecap(id){
  /* Cada uno solo ve el suyo (en modo prueba local se puede pedir otro para revisar) */
  id=(Store.local&&id)||Store.myPlayer||S.me; if(!P[id]) return;
  if(!available()&&!Store.local) return;   // antes del 26/12 solo los testers
  if(!Store.recapSurveys) await loadSurveys();
  closeRecap(true);
  const data=slides(id);
  const el=document.createElement("div"); el.id="recap"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Resumen de la primera vuelta");
  el.style.setProperty("--c",P[id].color);
  el.innerHTML=`<div class="rc-bars">${data.list.map(()=>`<i><b></b></i>`).join("")}</div>
    <button class="rc-x" data-rc-close aria-label="Cerrar">×</button><button class="rc-mute" data-rc-mute aria-label="Silenciar">${muted?"🔇":"🔊"}</button>
    <div class="rc-stage">${data.list.map((s,i)=>`<section class="rc-s rc-k-${s.k} ${FXT[i%FXT.length]}" data-i="${i}"><div class="rc-blob a"></div><div class="rc-blob b"></div><div class="rc-shape s1"></div><div class="rc-shape s2"></div>${tickerFor(s.k,id,data.x,data.song)}<div class="rc-in">${s.h}</div></section>`).join("")}</div>
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
const iv=setInterval(()=>{ if(maybeAuto()){ clearInterval(iv); if(available()) previews().then(()=>{ try{ const me=Store.myPlayer||S.me; if(P[me]) prefetch(slides(me).list.map(z=>z.track).slice(0,4)); }catch(e){} }); } },800);
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
window.recapLiga=()=>{ const L=leagueStats(); return {played:L.played,onTime:L.onTime,avgLate:L.avgLate,worst:L.worst&&[L.worst.m.id,L.worst.d],oldest:L.oldest&&[L.oldest.m.id,L.oldest.d],mostFixed:L.mostFixed&&[L.mostFixed.m.id,L.mostFixed.n],lateKing:L.lateKing,excuse:L.excuse,preds:L.preds,predLast:L.predLast,votes:L.votes,fixed:L.fixed}; };
window.recapSongs=()=>{ const X=idaStats(); return PLAYERS.map(p=>[p.first,SONGS[X[p.id].song].t]); };
})();
