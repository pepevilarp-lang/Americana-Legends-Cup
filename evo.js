/* =====================================================================
   TU EVOLUCIÓN · pantalla privada (solo tus datos)
   Rating y resultados del último mes + lo que dicen tus encuestas recientes frente a las anteriores.
   Se abre desde tu ficha («📈 Mi evolución») y desde el aviso mensual (#evolucion).
   ===================================================================== */
(function(){
  const ymd=t=>{ const d=new Date(t); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  function monthStats(me){
    try{ const E=elo(), from=ymd(Date.now()-30*864e5);
      const mine=E.deltas.filter(x=>x.id===me), recent=mine.filter(x=>ymd(x.m.updated||0)>=from);
      return { rating:Math.round(E.R[me]), d:Math.round(recent.reduce((s,x)=>s+x.d,0)), w:recent.filter(x=>x.d>0).length, l:recent.filter(x=>x.d<=0).length };
    }catch(_){ return null; } }
  const arrow=(x)=>x.now==null||x.was==null?"":x.now-x.was>=0.5?"▲":x.now-x.was<=-0.5?"▼":"=";
  const lbl=(v,scale)=>v==null?"–":scale[Math.max(0,Math.min(4,Math.round(v)-1))];
  const PERF=["Muy malo","Malo","Normal","Bueno","Muy bueno"], FIS=["Muy mal","Mal","Normal","Bien","Muy bien"];

  function html(me,list){
    const M=monthStats(me), sum=EvoCore.summarize(list);
    let h=`<div class="sheet-body ev"><div class="ev-k">📈 Solo lo ves tú</div><h2 class="ev-t">Tu evolución</h2>`;
    if(M) h+=`<div class="ev-row"><div class="ev-c"><b>${M.rating}</b><small>Rating actual</small></div>
      <div class="ev-c ${M.d>0?"up":M.d<0?"down":""}"><b>${M.d>0?"+":""}${M.d}</b><small>Rating en 30 días</small></div>
      <div class="ev-c"><b>${M.w}–${M.l}</b><small>Últimos 30 días</small></div></div>`;
    if(!sum.ready){
      h+=`<div class="ev-empty"><b>${sum.n?`Llevas ${sum.n} encuesta. Con una más ya vemos tu evolución.`:"Aún no has contestado encuestas."}</b>
        <p>Después de cada partido te llega una encuesta de 30 segundos. Contéstala y aquí verás qué golpe mejora, cuál flojea y cómo llegas físicamente.</p></div></div>`;
      return h; }
    h+=`<p class="ev-sub">Tus últimas ${sum.k} encuestas frente a ${sum.n-sum.k===1?"la anterior":`las ${sum.n-sum.k} anteriores`}.</p><div class="ev-grid">`;
    h+=`<div class="ev-card good"><small>Golpe que más mejora</small><b>${sum.riser?esc(sum.riser.s):"–"}</b><span>${sum.riser?(sum.riser.was<0?"De golpe flojo a golpe de confianza":"Gana confianza"):"Ningún golpe ha dado el salto todavía"}</span></div>`;
    h+=`<div class="ev-card bad"><small>Golpe que pierde confianza</small><b>${sum.faller?esc(sum.faller.s):"–"}</b><span>${sum.faller?"Te fías menos que antes":"Ninguno ha ido a peor"}</span></div>`;
    h+=`<div class="ev-card"><small>Cómo te ves en pista</small><b>${lbl(sum.self.now,PERF)} <i>${arrow(sum.self)}</i></b><span>Antes: ${lbl(sum.self.was,PERF).toLowerCase()}</span></div>`;
    h+=`<div class="ev-card"><small>Cómo llegas físicamente</small><b>${lbl(sum.fis.now,FIS)} <i>${arrow(sum.fis)}</i></b><span>Antes: ${lbl(sum.fis.was,FIS).toLowerCase()}</span></div></div>`;
    const ln=EvoCore.line(sum); if(ln) h+=`<p class="ev-line">${esc(ln)}</p>`;
    if(sum.goal) h+=`<div class="ev-goal">🎯 ${esc(sum.goal)}</div>`;
    return h+`</div>`;
  }
  async function open(){
    const me=S.me||Store.myPlayer; if(!me){ toast("Elige primero quién eres"); return; }
    S.modal=open;
    showModal(`<div class="sheet-body ev"><div class="ev-k">📈 Solo lo ves tú</div><h2 class="ev-t">Tu evolución</h2><p class="ev-sub">Cargando tus encuestas…</p></div>`);
    let list=[];
    if(Store.db){ try{ const q=await Store.db.collection("surveys").where("playerId","==",me).where("status","==","completed").get(); q.forEach(d=>list.push(d.data())); }catch(e){ console.error(e); } }
    const box=document.querySelector(".sheet-body.ev"); if(box) box.outerHTML=html(me,list);
    try{ window.dxTrack&&dxTrack("evolucion_abierta",{encuestas:list.length}); }catch(_){}
  }
  document.addEventListener("click",ev=>{ if(ev.target.closest('[data-x="evo"]')) open(); });
  function route(){ if(location.hash!=="#evolucion") return;
    const go=()=>{ if(!(Store.member||Store.local)||document.getElementById("gate")||!(S.me||Store.myPlayer)) return false;
      history.replaceState(null,"",location.pathname+location.search+"#hoy"); open(); return true; };
    if(!go()){ const iv=setInterval(()=>{ if(go()) clearInterval(iv); },600); setTimeout(()=>clearInterval(iv),20000); } }
  window.addEventListener("hashchange",route); route();
  window.Evo={open,html};
})();
