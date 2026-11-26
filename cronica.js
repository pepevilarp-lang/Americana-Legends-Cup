/* =====================================================================
   CRÓNICA DEL PARTIDO
   Al apuntar un resultado, la app escribe una crónica corta estilo diario deportivo
   con lo que dicen los datos: sorpresa según el rating, remontada, super tie-break,
   paliza, retraso, fechas fijadas, revancha, rachas y posición.
   - Se ve en la ficha del partido y en Inicio («Últimas crónicas»)
   - El aviso de resultado a todo el grupo lleva su titular y abre la crónica (#cronica-<partido>)
   - Se comparte por WhatsApp con un toque
   Solo usa datos de la liga; nunca respuestas sueltas de las encuestas.
   ===================================================================== */
(function(){
  const pick=(arr,seed)=>arr[Math.abs([...String(seed)].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,7))%arr.length];
  const ymd=t=>{ const d=new Date(t); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const days=(a,b)=>{ const P_=s=>{ const[y,m,d]=s.split("-").map(Number); return Date.UTC(y,m-1,d); }; return Math.round((P_(b)-P_(a))/864e5); };
  const playedOn=m=>{ const u=m.updated?ymd(m.updated):null; return (m.date&&(!u||m.date<=u))?m.date:(u||m.date||null); };
  const court=m=>{ const c=String(m.court||"").trim(); if(!c) return ""; return /^pista/i.test(c)?` en la ${c.charAt(0).toLowerCase()+c.slice(1)}`:/^\d+$/.test(c)?` en la pista ${c}`:` en ${c}`; };

  /* Bromas de cierre, por tipo de partido (varían con el partido) */
  const KICK={
    wo:[w=>`${w.L}, te esperamos en la pista. Literalmente.`, w=>`La victoria más cómoda de la temporada: ${w.W} ni se cambió de zapatillas.`],
    upset:[w=>`Nadie daba un duro por ${w.W}. Que paguen los que apostaron en contra.`, w=>`Las casas de apuestas de la liga han quebrado esta tarde.`, w=>`${w.L} salió a pasear y se encontró un partido.`],
    remontada:[w=>`Perder el primer set es de humanos; remontarlo, de ${w.W}.`, w=>`${w.L} ya se veía en la ducha después del primer set. Error.`],
    stb:[w=>`Diez puntos de infarto: el cardiólogo de la liga ya está avisado.`, w=>`Super tie-break: lo más parecido a unos penaltis que tenemos.`, w=>`${w.L} se va a casa con la miel en los labios y la birra pendiente.`],
    paliza:[w=>`${w.L} pidió la hora en el segundo set.`, w=>`A ${w.L} le cobraron hasta la pista.`, w=>`Hay derrotas que se superan con terapia. Esta, con dos birras.`],
    tight:[w=>`Se decidió en un par de bolas. Ni el VAR habría sabido a quién dárselo.`, w=>`${w.L} vuelve a casa repasando esa bola que se fue por un dedo.`],
    late:[w=>`Más vale tarde que nunca. Aunque haya sido muy tarde.`, w=>`Si fuera un tren, Renfe os devolvería el billete.`],
    under:[w=>`Se notó quién tenía más hambre.`, w=>`${w.L} llegaba un pelín por delante en las apuestas. Llegaba.`],
    base:[w=>`Partido serio, sin dramas. Así da gusto.`, w=>`Trámite cumplido. Siguiente.`, w=>`${w.W} hizo lo que tenía que hacer. Ni más ni menos.`],
  };

  function build(id){
    const m=getMatch(id), r=result(m); if(!r||!m.a||!m.b) return null;
    const Wid=r.w==="a"?m.a:m.b, Lid=r.w==="a"?m.b:m.a, W=nm(Wid), L=nm(Lid), meA=r.w==="a";
    const sets=(m.sets||[]).filter(s=>setDone?setDone(s):true);
    const mine=s=>meA?s.a:s.b, his=s=>meA?s.b:s.a;
    const sc=r.wo?"WO":sets.map(s=>meA?`${s.a}-${s.b}`:`${s.b}-${s.a}`).join(" · ");
    const stb=sets.some(s=>s.st), remontada=sets.length>=2&&mine(sets[0])<his(sets[0]);
    const lostGames=sets.filter(s=>!s.st).reduce((t,s)=>t+his(s),0), wonSets=sets.filter(s=>mine(s)>his(s)).length;
    const paliza=!r.wo&&!stb&&sets.length===2&&lostGames<=3, rosco=sets.some(s=>!s.st&&mine(s)===6&&his(s)===0);
    const tight=!r.wo&&!paliza&&sets.filter(s=>!s.st).every(s=>Math.abs(s.a-s.b)<=2);
    // Rating: probabilidad previa del ganador y puntos ganados
    let ea=null, dR=null, sW=0, sL=0;
    try{ const E=elo(), D=E.deltas, d=D.find(x=>x.m.id===id&&x.id===Wid); if(d){ ea=d.ea; dR=Math.round(d.d); }
      // Rachas en ese momento (no las de hoy): resultados de cada uno hasta este partido, en orden
      const end=D.reduce((k,x,j)=>x.m.id===id?j:k,-1);
      const runTo=pid=>D.slice(0,end+1).filter(x=>x.id===pid).reduce((k,x)=>x.d>0?(k>0?k+1:1):(k<0?k-1:-1),0);
      if(end>=0){ sW=runTo(Wid); sL=runTo(Lid); } }catch(_){}
    // ¿Es el último partido de los dos? Solo entonces la tabla de hoy describe lo que pasó
    const latest=![...FIXTURE.map(x=>getMatch(x.id))].some(x=>x.id!==id&&result(x)&&(x.updated||0)>(m.updated||0)&&[x.a,x.b].some(p=>p===Wid||p===Lid));
    const upset=!r.wo&&ea!=null&&ea<0.38;
    // Plazo, fechas fijadas y precedentes
    const f=(typeof FX!=="undefined"&&FX[id])||null, end=f&&JORNADAS[f.j-1]?JORNADAS[f.j-1][1]:null, pd=playedOn(m);
    const late=end&&pd&&pd>end?days(end,pd):0;
    const fixes=Object.values(Store.log||{}).filter(e=>e&&e.m===id&&(e.k==="date"||/^fijó /.test(e.txt||""))).length;
    const prev=FIXTURE.filter(x=>x.id!==id&&((x.a===m.a&&x.b===m.b)||(x.a===m.b&&x.b===m.a))).map(x=>getMatch(x.id)).filter(x=>result(x)&&(x.updated||0)<(m.updated||Infinity));
    const prevW=prev.length?(result(prev[prev.length-1]).w==="a"?prev[prev.length-1].a:prev[prev.length-1].b):null;
    let st=null; try{ st=standings().byId; }catch(_){}
    const Rw=st&&st[Wid], Rl=st&&st[Lid];
    const jl=m.playoff?(PO_LABEL&&PO_LABEL[id]||"los playoffs"):`la jornada ${m.j}`;

    // Titular
    let type="base", title;
    if(r.wo){ type="wo"; title=`${W} gana sin jugar: ${L} no se presentó`; }
    else if(upset){ type="upset"; title=pick([`Campanada: ${W} tumba a ${L}`,`${W} da la sorpresa ante ${L}`],id); }
    else if(remontada){ type="remontada"; title=`${W} remonta a ${L}`; }
    else if(stb){ type="stb"; title=`${W} se lo lleva en el super tie-break`; }
    else if(paliza){ type="paliza"; title=rosco?`${W} reparte roscos ante ${L}`:`${W} arrasa a ${L}`; }
    else if(tight){ type="tight"; title=`${W} gana por la mínima a ${L}`; }
    else title=`${W} se impone a ${L}`;
    if(latest&&Rw&&Rw.pos===1&&Rw.pj>=2&&!/líder/.test(title)) title+=` y es líder`;
    if(type==="base"&&late>=14) type="late";
    else if(type==="base"&&ea!=null&&ea<0.45) type="under";

    // Entradilla
    const lead=r.wo
      ? `${W} se lleva los puntos de ${jl} por incomparecencia de ${L}${late>=7?`, ${late} días después de que acabara la jornada`:""}.`
      : `${W} venció a ${L} por ${sc} en ${jl}${court(m)}${late>=7?`, ${late} días después de lo previsto`:""}.`;
    // Contexto: hasta dos datos, del más llamativo al menos
    const ctx=[];
    if(!r.wo&&ea!=null){ const p=Math.round(ea*100);
      if(upset) ctx.push(`Partía con solo un ${p}% de opciones según el rating, y se lleva ${dR>0?`+${dR} puntos`:"el premio"}.`);
      else if(dR!=null&&p>=70) ctx.push(`Era favorito (${p}% de opciones) y cumplió: +${dR} de rating.`);
      else if(dR!=null&&p<45) ctx.push(`No partía como favorito (${p}% de opciones): +${dR} de rating.`);
      else if(dR!=null&&p>55) ctx.push(`Partía algo por delante (${p}% de opciones) y suma +${dR} de rating.`);
      else if(dR!=null) ctx.push(`Partido igualado sobre el papel; ${W} suma +${dR} de rating.`); }
    if(fixes>=3) ctx.push(`Antes de jugarse, el partido se fijó ${fixes} veces.`);
    if(prevW) ctx.push(prevW===Wid?`${W} repite victoria sobre ${L}.`:`Revancha servida: la última vez había ganado ${L}.`);
    if(sW>=3) ctx.push(`Encadena ${sW} victorias seguidas.`);
    if(sL<=-3) ctx.push(`${L} suma ${-sL} derrotas seguidas.`);
    if(latest&&Rw&&Rw.pos!==1) ctx.push(`${W} queda ${Rw.pos}.º con ${Rw.pts} puntos.`);
    const k=KICK[type]||KICK.base, kicker=pick(k,id+"k")({W,L});
    return { id, title, lead, ctx:ctx.slice(0,2), kicker, type, W:Wid, L:Lid };
  }

  function html(id){
    const c=build(id); if(!c) return "";
    return `<section class="cr" id="cr-${id}"><div class="cr-k">📰 Crónica</div><h3 class="cr-t">${esc(c.title)}</h3>
      <p class="cr-p">${esc(c.lead)} ${c.ctx.map(esc).join(" ")}</p><p class="cr-kick">${esc(c.kicker)}</p>
      <button class="btn ghost cr-share" data-cr-share="${id}">Compartir en el grupo</button></section>`;
  }
  /* Inicio: las 3 últimas crónicas */
  function feedHTML(){
    const done=[...FIXTURE.map(f=>getMatch(f.id)),...(typeof PLAYOFF_IDS!=="undefined"?PLAYOFF_IDS.map(getMatch):[])].filter(m=>m&&m.a&&m.b&&result(m)&&m.updated)
      .sort((a,b)=>b.updated-a.updated).slice(0,3);
    if(!done.length) return "";
    return `<h2>Últimas crónicas</h2><div class="cr-feed">${done.map(m=>{ const c=build(m.id); if(!c) return "";
      return `<button class="cr-item" data-cr-open="${m.id}"><span class="cr-faces">${av(c.W,"sm")}${av(c.L,"sm")}</span><span class="cr-txt"><b>${esc(c.title)}</b><small>${esc(c.lead)}</small></span></button>`; }).join("")}</div>`;
  }
  function text(id){ const c=build(id); if(!c) return "";
    const url=location.origin+location.pathname+"#cronica-"+id;
    return `📰 ${c.title}\n\n${c.lead} ${c.ctx.join(" ")}\n${c.kicker}\n\n${url}`; }
  async function share(id){ const t=text(id); if(!t) return;
    try{ if(navigator.share){ await navigator.share({text:t}); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
    try{ await navigator.clipboard.writeText(t); toast("Crónica copiada: pégala en el grupo"); }
    catch(_){ location.href="https://wa.me/?text="+encodeURIComponent(t); } }

  document.addEventListener("click",ev=>{
    const s=ev.target.closest("[data-cr-share]"); if(s){ share(s.dataset.crShare); try{ window.dxTrack&&dxTrack("cronica_compartida",{partido:s.dataset.crShare}); }catch(_){} return; }
    const o=ev.target.closest("[data-cr-open]"); if(o){ openMatch(o.dataset.crOpen); setTimeout(()=>{ const el=document.getElementById("cr-"+o.dataset.crOpen); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); },350); }
  });
  /* Enlace del aviso: #cronica-<partido> */
  function route(){ const mm=/^#cronica-(.+)$/.exec(location.hash||""); if(!mm) return; const id=decodeURIComponent(mm[1]);
    const go=()=>{ if(!(Store.member||Store.local)||document.getElementById("gate")) return false; if(!getMatch(id)||!result(getMatch(id))) return false;
      history.replaceState(null,"",location.pathname+location.search+"#hoy"); openMatch(id);
      setTimeout(()=>{ const el=document.getElementById("cr-"+id); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); },400); return true; };
    if(!go()){ const iv=setInterval(()=>{ if(go()) clearInterval(iv); },600); setTimeout(()=>clearInterval(iv),20000); } }
  window.addEventListener("hashchange",route); route();

  window.Cronica={build,html,feedHTML,text,share};
})();
