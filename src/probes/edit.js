/* PROBE1: Track-editor probes: solo editing, several notes, paste, quantise, degrees, bend curve and shapes, track into another mode, volume bars. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { timbresOf } from '../audio.js';
import { bendPlan, BEND_GLIDE_TC, BEND_GLIDE_STEP_S, bendAt, curveU } from '../config.js';
import { t, L } from '../i18n.js';
import { KEEP_MAX, PRINT_MAX, SCALES } from '../probedata.js';
import { songNotes, events, tiePartners, songSegs, freezeState, editIsOpen, recording, editSetLayer, editOpen, editUndo, editRedo, freezeTicket, laneEditVerOf, editMoveSeg, editResizeSeg, editDeleteSeg, editInsertLead, editClose, loop, songBeats, seedTake, laneDelTap, laneOrder, laneRoleOf, editCanUndo, editMoveSel, editDeleteSel, evHz, editCopySel, editPaste, editDuplicateSel, laneTimbreOf, editSetTimbre, editHistPeek, editQuantSel, editDegreeSel, editDegreeWhy, editBendPoint, bendDbg, histReset, laneVerKeep, takeFxDump, chaseFor, chaseNote, histLen, editBendShape, histUndo, autAddrs, autAddPoint, autPoints, fxLaneMerge, fxLaneExpand, autCurvePoint, histRedo, trackViewOfLayer, editTrackModeWhy, editTrackMode, pnBars, editVolSel, autMovePoint } from '../recorder.js';
import { tuningOf, tuningIndexOf, shiftDegrees, REG_N, modeSlotOfTi, modesLikeView, mapDegrees, scaleView } from '../scales.js';
import { FX_VOL } from '../state.js';
import { row } from './rows.js';
import { SEED_REC } from './seed.js';
/* ═══ S4: ПРАВКА СОЛО — P.checkSoloEdit ═══
   Соло правится ТОЙ ЖЕ машинерией, что бас (бас и соло — один инструмент). Проба держит три вещи, все — на загруженной песне:
     1) ИНВАРИАНТЫ ПЕСНИ: сирот нет (ведение или «выкл» без своей ноты); каждая нота соло кончается СВОИМ «выкл» (пары «вкл/выкл» сходятся);
        у каждого высотного «вкл»/ведения есть громкость (правило #30); каждая половина ПАРЫ СВЯЗКИ («выкл» с tie / «вкл» с tie) имеет
        партнёра — противоположное событие того же взятого на той же доле в ДРУГОЙ дорожке; точки кривой бенда лежат внутри своей ноты.
     2) ⛳ S6: ПАРТНЁР ПАРЫ СВЯЗКИ — recorder.tiePartners (то, чем развязывает правка) находит у каждой половины ровно ту, что видит
        инвариант 1. (S4–S5 здесь сверялись отказы soloEditBlock; с S6 отказов нет — предикат снят.)
     3) КРУГ «ПРАВКА → ↶ → ↷ → ↶»: после ↶ события песни ПОБИТНО прежние (те же объекты; доля, слой, функция, взятое, вид, септаккорд и
        нагрузка — по значению), после ↷ — побитно как после правки; правки: перенос одиночной ноты, её длина, высота и удаление; отделение
        и удаление сегмента ведущей линии; высота «вкл» пары связки; перенос с транспонированием терменвокса (кривая та же); вставка.
        Отказанная правка песню не трогает. Редактор открывается и закрывается самой пробой; песня после неё — та же.
        ⛳ S5: ДЛИНА ТЕРМЕНВОКСА — укорочение (кривая обрезана: точки ≤ новой длины прежние и по порядку, последняя — на новом конце со
        значением кривой там; прежний массив НЕ тронут) и удлинение (кривая — тот же массив); ↶ возвращает кривую побитно (круг).
        ⛳ S6: КРАЙ ПАРЫ СВЯЗКИ — перенос ноты с привязанным «выкл», её укорочение, удаление каждой половины, перенос «вкл»: после правки
        tie нет НИ у правленого края, НИ у партнёра; версия правок дорожки партнёра растёт (и подпись его заморозки меняется — замороженный
        партнёр устарел) на правке, на ↶ и на ↷; ↶ возвращает пару побитно. Смена одной высоты и длина ноты с привязанным «вкл» (двигается
        её собственный «выкл») связку ХРАНЯТ. Удаление СТРОКИ дорожки (необратимо) — на ВРЕМЕННОЙ паре, записанной самой пробой в конец
        песни (recorder.seedTake), в обе стороны: выжившая половина развязана, её версия выросла, подпись сменилась; затем обе временные
        дорожки удаляются, и песня — побитно прежняя (продвинутые счётчики дорожек и взятых — монотонны по замыслу).
     4) ⛳ S5: ГОЛОС ПОСЛЕ ИЗОГНУТОЙ НОТЫ НАЧИНАЕТ БЕЗ ЕЁ КРИВОЙ — на ЗВУКЕ, офлайн-рендером (render.reuseCheck): высота второй ноты на
        том же голосе — её собственная, а оба контроля мерой видны: своя кривая второй ноты читается как изгиб, а смоделированная чужая
        кривая — как наследство (мера оценивает ИЗВЕСТНЫХ кандидатов на их периодах, субгармонику не берёт). Поэтому проба асинхронна:
        await P.checkSoloEdit().
   У P.seed материал обязателен (его нет — расхождение); у демо-пьесы (P.song) отсутствующий случай лишь называется.
   ⚠️ Круг правит только НЕЗАМОРОЖЕННЫЕ дорожки: правка поднимает версию правок дорожки, и замороженная устарела бы. */
export async function checkSoloEdit(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed'), absent=[];
  const lack=what=>{ if(isSeed) miss(`the seed lacks ${what}`); else absent.push(what); };
  const beat=t=>Math.round(t*1000)/1000;
  // ---- 1) инварианты песни ----
  const V=songNotes();
  cases++; if(V.orphans.length){ const o=V.orphans[0]; miss(`${V.orphans.length} orphan events (a change or release without its note) — first L${o.layer+1} beat ${beat(o.t)} ${o.fn}`); }
  for(const n of V.notes){ if(n.role!=='ld') continue; cases++; song++;
    const at=`L${n.layer+1} solo note at beat ${beat(n.start)}`;
    if(n.endBy!=='off') miss(`${at}: ends by '${n.endBy}', not by its own note-off`);
    const B=n.head.a&&n.head.a.bend;
    if(B&&B.length&&n.end!=null){ const top=Math.max(...B.map(p=>p.dt)); if(top>n.end-n.start+1e-9) miss(`${at}: its bend reaches ${beat(top)} beats, beyond the note's length ${beat(n.end-n.start)}`); }
  }
  for(const e of events){ if(!/^(lead|bass|ch)/.test(e.fn) || !/On$|Set$/.test(e.fn)) continue; cases++;
    if(!(e.a && typeof e.a.vol==='number')) miss(`L${e.layer+1} beat ${beat(e.t)} ${e.fn}: no volume (rule #30)`); }
  const ties=events.filter(e=>e.fn.startsWith('lead')&&e.a&&e.a.tie); let nPairs=0;
  for(const e of ties){ cases++;
    const want= e.fn==='leadOff' ? 'leadOn' : e.fn==='leadOn' ? 'leadOff' : null, at=`L${e.layer+1} beat ${beat(e.t)} ${e.fn} with a tie`;
    if(!want){ miss(`${at}: only a note-on or a note-off may carry a tie`); continue; }
    const p=ties.filter(x=>x.fn===want && x.tk===e.tk && x.layer!==e.layer && Math.abs(x.t-e.t)<1e-9);
    if(!p.length) miss(`${at}: no partner (a ${want} with a tie in the same take, at the same beat, in another track)`);
    else if(e.fn==='leadOff') nPairs++;
  }
  if(!nPairs) lack('a linked pair (a solo note continued across a timbre switch)');
  // ---- 2) ⛳ S6: партнёр — тем же, чем развязывает правка ----
  for(const e of ties){ const want= e.fn==='leadOff' ? 'leadOn' : e.fn==='leadOn' ? 'leadOff' : null; if(!want) continue; cases++;
    const inv=ties.filter(x=>x.fn===want && x.tk===e.tk && x.layer!==e.layer && Math.abs(x.t-e.t)<1e-9), got=tiePartners(e);
    if(!got.length || got.some(p=>!inv.includes(p)) || (inv.length===1 && got[0]!==inv[0])) miss(`L${e.layer+1} beat ${beat(e.t)} ${e.fn} with a tie: recorder.tiePartners finds ${got.length} partner(s), the invariant ${inv.length}`); }
  // ---- P.seed: терменвокс после правки — там, куда его перенесли, с той же кривой ----
  if(isSeed){ cases++; const T=SEED_REC.solo&&SEED_REC.solo.therm;
    if(!T) miss('the solo section of the seed did not run (no record of its theremin edit)');
    else { const h=events.find(e=>e.fn==='leadOn'&&Math.abs(e.t-T.t)<1e-9&&e.a&&e.a.bend&&e.a.bend.length);
      if(!h) miss(`the seed's theremin note is not at beat ${T.t}`);
      else { if(h.a.ti!==T.ti||h.a.oct!==T.oct) miss(`the seed's theremin note: ti/reg ${h.a.ti}/${h.a.oct}, intended ${T.ti}/${T.oct}`);
             if(JSON.stringify(h.a.bend)!==JSON.stringify(T.bend)) miss(`the seed's theremin note: the move changed its bend to ${JSON.stringify(h.a.bend)} (intended ${JSON.stringify(T.bend)})`); } } }
  const segs=()=>songSegs().segs.filter(g=>g.role==='ld' && !g.ev.jam && freezeState(g.layer)==='none');
  const isTherm=g=>!!(g.note.head.a&&g.note.head.a.bend&&g.note.head.a.bend.length);
  const offTie=g=>!!(g.endEv && g.endEv.fn==='leadOff' && g.endEv.a && g.endEv.a.tie);
  const headTie=g=>!!(g.first && g.note.head.a && g.note.head.a.tie);
  const single=g=>!!(g.first && g.endEv && g.endEv.fn==='leadOff');
  const plain=g=>single(g) && !isTherm(g) && !offTie(g) && !headTie(g);
  const find=(what,pred)=>{ const g=segs().find(pred); if(!g) lack(what); return g||null; };
  // ---- 3) круг правки ----
  if(editIsOpen()) miss('the track editor is open — close it: the round trip opens it itself');
  else if(recording) miss('recording — stop it first');
  else {
    const snap=()=>new Map(events.map(e=>[e,[e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]]));
    const FIELD=['t','layer','fn','tk','sc','sev','jam','a'];
    const same=(A,B)=>{ if(A.size!==B.size) return `${A.size} events instead of ${B.size}`;
      for(const [e,x] of B){ const y=A.get(e); if(!y) return `the ${x[2]} at beat ${beat(x[0])} is gone`;
        for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return `the ${x[2]} at beat ${beat(x[0])} differs (field ${FIELD[i]})`; }
      return null; };
    const open=ly=> editIsOpen() ? editSetLayer(ly) : editOpen(ly);
    const rt=(label,g,op)=>{ if(!g) return; cases++;
      if(!open(g.layer)){ miss(`${label}: the editor would not open L${g.layer+1}`); return; }
      const S0=snap(), r=op(g);
      if(!r){ miss(`${label}: the edit was refused`); return; }
      const S1=snap(); let d;
      if(!same(S1,S0)) miss(`${label}: the edit changed nothing`);
      if(r.check && (d=r.check())) miss(`${label}: ${d}`);
      if(!editUndo()){ miss(`${label}: undo refused`); return; }
      if((d=same(snap(),S0))) miss(`${label}: undo does not restore the song — ${d}`);
      if(!editRedo()){ miss(`${label}: redo refused`); return; }
      if((d=same(snap(),S1))) miss(`${label}: redo does not repeat the edit — ${d}`);
      if(!editUndo()){ miss(`${label}: the second undo refused`); return; }
      if((d=same(snap(),S0))) miss(`${label}: the second undo does not restore the song — ${d}`);
    };
    const at=e=>`L${e.layer+1} beat ${beat(e.t)}`;
    const verSig=ly=>{ const k=freezeTicket(ly); return { v:laneEditVerOf(ly), s:k&&k.sig }; };
    /* ⛳ S6: КРУГ ПРАВКИ КРАЯ ПАРЫ. edgeOf(g) — привязанное событие правленой ноты («вкл» или «выкл» с tie); партнёр берётся ДО правки. После
       правки tie нет ни у края (если край ещё в песне), ни у партнёра; версия правок дорожки партнёра выросла, подпись заморозки сменилась;
       ↶ — песня побитно прежняя (пара цела) и версия выросла снова (замороженный партнёр устарел и на ↶), ↷ — побитно как после правки и
       версия снова выросла, второй ↶ — побитно прежняя. */
    const pairRt=(label,g,edgeOf,op)=>{ if(!g) return; cases++;
      if(!open(g.layer)){ miss(`${label}: the editor would not open L${g.layer+1}`); return; }
      const E=edgeOf(g), Ps=tiePartners(E);
      if(Ps.length!==1){ miss(`${label}: ${Ps.length} partners found for the tied edge at ${at(E)} (expected 1)`); return; }
      const P=Ps[0], S0=snap(), A=verSig(P.layer), r=op(g);
      if(!r){ miss(`${label}: the edit was refused`); return; }
      const S1=snap(), B=verSig(P.layer); let d;
      if(!same(S1,S0)) miss(`${label}: the edit changed nothing`);
      if(P.a&&P.a.tie) miss(`${label}: the partner at ${at(P)} keeps its tie`);
      if(events.includes(E) && E.a && E.a.tie) miss(`${label}: the edited edge at ${at(E)} keeps its tie`);
      if(!(B.v>A.v)) miss(`${label}: the partner track's edit version did not rise (${A.v} → ${B.v}) — its frozen buffer would not go stale`);
      if(B.s===A.s) miss(`${label}: the partner track's freeze signature did not change`);
      if(!editUndo()){ miss(`${label}: undo refused`); return; }
      const C=verSig(P.layer);
      if((d=same(snap(),S0))) miss(`${label}: undo does not restore the pair — ${d}`);
      if(!(C.v>B.v)) miss(`${label}: undo did not raise the partner's edit version — a buffer frozen after the edit would stay fresh`);
      if(!editRedo()){ miss(`${label}: redo refused`); return; }
      if((d=same(snap(),S1))) miss(`${label}: redo does not repeat the edit — ${d}`);
      if(!(verSig(P.layer).v>C.v)) miss(`${label}: redo did not raise the partner's edit version`);
      if(!editUndo()){ miss(`${label}: the second undo refused`); return; }
      if((d=same(snap(),S0))) miss(`${label}: the second undo does not restore the pair — ${d}`);
    };
    /* Правка, НЕ трогающая время края, связку ХРАНИТ: партнёр с tie, его версия правок не меняется (обычный круг ниже — побитно). */
    const keepCheck=(g,edgeOf)=>{ const E=edgeOf(g), P=tiePartners(E)[0], v0=P?laneEditVerOf(P.layer):0;
      return ()=> !P ? 'no partner before the edit' : !(P.a&&P.a.tie) ? `the partner at ${at(P)} lost its tie` : laneEditVerOf(P.layer)!==v0 ? 'the partner track’s edit version changed' : null; };
    /* Цель каждой правки ищется ЗАНОВО (find после ↶ — та же песня, тот же ответ): объекты сегментов пересобираются после каждой правки. */
    try{
      const P1=()=>find('a plain solo note (its own note-off, no bend, no tie)',plain);
      rt('move a solo note half a beat later',P1(),g=>editMoveSeg(g.ev,g.ev.t+0.5,g.ti,g.oct));
      rt('lengthen a solo note',P1(),g=>editResizeSeg(g.ev,g.end+0.5));
      rt('shorten a solo note',P1(),g=>editResizeSeg(g.ev,g.start+(g.end-g.start)/2));
      rt('change the pitch of a solo note',P1(),g=>editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct));
      rt('delete a solo note',P1(),g=>editDeleteSeg(g.ev));
      rt('insert a solo note',P1(),g=>{ const ev=editInsertLead(g.start+0.25,g.ti+2,g.oct,g.sc,g.sev,1);
        return ev && { check:()=> (ev.a.bend||ev.a.tie||ev.a.hold) ? 'the inserted note carries a bend, a tie or hold' : typeof ev.a.vol!=='number' ? 'the inserted note has no volume' : null }; });
      const M=()=>find('a middle segment of a lead-mode line (a pitch change on each side)',g=>!g.first && g.endEv && g.endEv.fn==='leadSet');
      rt('move a middle segment of a lead line (it detaches)',M(),g=>editMoveSeg(g.ev,g.ev.t+0.25,g.ti,g.oct));
      rt('lengthen a middle segment of a lead line (it detaches)',M(),g=>editResizeSeg(g.ev,g.end+0.25));
      rt('delete a middle segment of a lead line (silence in its place)',M(),g=>editDeleteSeg(g.ev));
      rt('change the pitch of a middle segment (the glide is kept)',M(),g=>editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct));
      const TH=()=>find('a single theremin note with a bend',g=>single(g)&&isTherm(g)&&!offTie(g)&&!headTie(g));
      rt('move and transpose a theremin note (its bend keeps its shape)',TH(),g=>{ const B=JSON.stringify(g.note.head.a.bend), ev=editMoveSeg(g.ev,g.ev.t+0.5,g.ti+1,g.oct);
        return ev && { check:()=> JSON.stringify(ev.a.bend)!==B ? `the bend changed: ${JSON.stringify(ev.a.bend)} (was ${B})` : ev.a.ti!==g.ti+1 ? `ti ${ev.a.ti}, intended ${g.ti+1}` : null }; });
      rt('delete a theremin note',TH(),g=>editDeleteSeg(g.ev));
      /* ⛳ S5: ДЛИНА ТЕРМЕНВОКСА. Ожидаемая кривая укорочения считается ЗДЕСЬ, независимо от recorder.bendTrim: точки с dt ≤ L — те же и
         по порядку, конечная точка {L, c последней оставшейся} — если что-то ушло; прежний массив не тронут (его JSON до и после). */
      /* ⚠️ ПОЧИНКА (после S5): кривую и её JSON берём ДО правки. Правка ставит голове НОВУЮ нагрузку (ход 'move'), и прежде проба читала
         g.note.head.a.bend ПОСЛЕ неё — то есть уже обрезанную кривую: «хвоста за половиной» не находилось (ложное «в песне нет материала»),
         а сверка обрезки сравнивала обрезанное с самим собой и проходила вхолостую. B — массив головы до правки, B0 — его JSON до правки. */
      const bendCheck=(B,B0,ev,L)=>{ const nb=ev&&ev.a&&ev.a.bend;
        return ()=>{ if(JSON.stringify(B)!==B0) return 'the edit mutated the original bend array';
          if(!Array.isArray(nb)||!nb.length) return 'the edited note lost its bend';
          if(nb.some(p=>p.dt>L+1e-9)) return `a bend point at ${Math.max(...nb.map(p=>p.dt))} lies beyond the new length ${L}`;
          const keep=B.filter(p=>p.dt<=L+1e-9), cut=keep.length<B.length, last=keep[keep.length-1];
          if(!cut) return nb===B ? null : 'nothing was cut, yet the bend is a new array';
          const want=(last&&Math.abs(last.dt-L)<=1e-9) ? keep : [...keep, { dt:L, c:last?last.c:0 }];
          return JSON.stringify(nb)===JSON.stringify(want) ? null : `trimmed bend ${JSON.stringify(nb)}, expected ${JSON.stringify(want)}`; }; };
      rt('shorten a theremin note (its bend is trimmed)',TH(),g=>{ const L=(g.end-g.start)/2, B=g.note.head.a.bend, B0=JSON.stringify(B);
        if(!B.some(p=>p.dt>L+1e-9)) lack('a theremin note whose bend reaches past half its length');
        const ev=editResizeSeg(g.ev,g.start+L);
        return ev && { check:bendCheck(B,B0,ev,L) }; });
      rt('lengthen a theremin note (its bend is kept, the last value holds)',TH(),g=>{ const L=g.end-g.start+1, B=g.note.head.a.bend, B0=JSON.stringify(B);
        const ev=editResizeSeg(g.ev,g.start+L);
        return ev && { check:bendCheck(B,B0,ev,L) }; });
      const HT=()=>find('a solo note continuing another track (a tie on its note-on)',g=>headTie(g)&&single(g)&&!offTie(g));
      const OT=()=>find('a solo note continued in another track (a tie on its note-off)',g=>offTie(g)&&g.first&&!headTie(g));
      const onE=g=>g.ev, offE=g=>g.endEv;
      // связка ХРАНИТСЯ: время края не меняется
      { const g=HT(); rt('change the pitch of a tied note-on (the tie is kept)',g,g=>{ const k=keepCheck(g,onE), ev=editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct); return ev && { check:k }; }); }
      { const g=HT(); rt('lengthen a note whose note-on is tied (its own note-off moves; the tie is kept)',g,g=>{ const k=keepCheck(g,onE), ev=editResizeSeg(g.ev,g.end+0.5); return ev && { check:k }; }); }
      { const g=OT(); rt('change the pitch of a note whose note-off is tied (the tie is kept)',g,g=>{ const k=keepCheck(g,offE), ev=editMoveSeg(g.ev,g.ev.t,g.ti+1,g.oct); return ev && { check:k }; }); }
      // ⛳ S6: край двигается или уходит — обе половины развязаны
      pairRt('move a note whose note-off is tied (the edge moves)',OT(),offE,g=>editMoveSeg(g.ev,g.ev.t+0.5,g.ti,g.oct));
      pairRt('shorten a note across its tied note-off',OT(),offE,g=>editResizeSeg(g.ev,g.start+(g.end-g.start)/2));
      pairRt('lengthen a note past its tied note-off',OT(),offE,g=>editResizeSeg(g.ev,g.end+0.5));
      pairRt('delete the half whose note-off is tied',OT(),offE,g=>editDeleteSeg(g.ev));
      pairRt('move the tied note-on in time',HT(),onE,g=>editMoveSeg(g.ev,g.ev.t+0.5,g.ti,g.oct));
      pairRt('delete the half whose note-on is tied',HT(),onE,g=>editDeleteSeg(g.ev));
    } finally { if(editIsOpen()) editClose(); }
    /* ⛳ S6: УДАЛЕНИЕ СТРОКИ ДОРОЖКИ (✕, необратимо) — на ВРЕМЕННОЙ паре в конце песни, в обе стороны. Запись — recorder.seedTake (та же
       воронка, что P.seed); удаление — двойной тап laneDelTap (тот же путь, что у ✕ на полосе). После — песня побитно прежняя. */
    if(!loop.on){
      const S0=snap();
      const tmpPair=()=>{ const T=Math.ceil(songBeats())+8;
        const r=seedTake([{fn:'leadOn',a:{deg:0,oct:1,vol:.8,inst:0,v:0},t:T,id:1}, {fn:'leadOff',a:{v:0,tie:true},t:T+1,id:1},
                          {fn:'leadOn',a:{deg:0,oct:1,vol:.8,inst:1,tie:true,v:0},t:T+1,id:2}, {fn:'leadOff',a:{v:0},t:T+2,id:2}]);
        if(!r) return null;
        const off=events.find(e=>e.tk===r.take&&e.fn==='leadOff'&&e.a&&e.a.tie), on=events.find(e=>e.tk===r.take&&e.fn==='leadOn'&&e.a&&e.a.tie);
        return off&&on&&off.layer!==on.layer ? { off, on } : null; };
      const del=ly=>{ laneDelTap(ly); return laneDelTap(ly); };
      for(const [label,gone,keep] of [['delete the track row holding the tied note-off','off','on'],['delete the track row holding the tied note-on','on','off']]){ cases++;
        const pr=tmpPair(); if(!pr){ miss(`${label}: the temporary linked pair could not be recorded`); continue; }
        const G=pr[gone], K=pr[keep], A=verSig(K.layer);
        if(!del(G.layer)) miss(`${label}: the row delete was refused`);
        else { const B=verSig(K.layer);
          if(K.a&&K.a.tie) miss(`${label}: the surviving half at ${at(K)} keeps its tie`);
          if(!(B.v>A.v)) miss(`${label}: the surviving track's edit version did not rise — its frozen buffer would not go stale`);
          if(B.s===A.s) miss(`${label}: the surviving track's freeze signature did not change`); }
        if(events.includes(K) && !del(K.layer)) miss(`${label}: the temporary surviving track could not be removed`);
      }
      const d=same(snap(),S0); if(d) miss(`row delete: the song is not back as it was — ${d}`);
    } else miss('row delete: the transport is playing — stop it first');
  }
  // ---- 4) голос после изогнутой ноты — на звуке ----
  cases++; let RU=null;
  try{ const R=await import('../render.js'); RU=await R.reuseCheck(); }
  catch(err){ RU={ ok:false, why:'the offline render failed: '+(err&&err.message) }; }
  if(!RU.ok) miss(`voice reuse after a bent note: ${RU.why}`);
  else console.log(`[scaleprobe solo-edit] voice reuse: the second note on the bent note's voice sounds ${RU.f} Hz (its own ${RU.want}); the control's own bend reads ${RU.fControl} Hz (${RU.wantControl}); a simulated inherited curve reads as inherited`);
  if(RU.detail) console.log('[scaleprobe solo-edit] voice reuse, candidate correlations and window energy — '+RU.detail);
  console.log(`[scaleprobe solo-edit] solo notes ${song} · cases ${cases} · linked pairs ${nPairs} · differences ${nBad}`);
  if(absent.length) console.log('[scaleprobe solo-edit] not in this song (not checked): '+[...new Set(absent)].join('; '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe solo-edit] '+m));
  if(!nBad) console.log('[scaleprobe solo-edit] no orphans; every solo note ends by its own note-off; every pitched event has a volume; every linked half has its partner, found by recorder.tiePartners; every bend lies within its note; editing a tied edge unties both halves, stales the partner and round-trips bit for bit; a row delete unties the surviving half; every edit round-trips bit for bit; a theremin note’s length trims its bend exactly; a voice reused after a bent note starts unbent');
  return { cases, song, total:nBad, differences:bad };
}
/* ═══ ED1: SEVERAL NOTES AT ONCE — P.checkSelect ═══
   On every role's first unfrozen, non-backing track of the loaded song (the editor opened and closed by the probe): group move and group
   delete go through recorder.editMoveSel / editDeleteSel and each is ONE history entry — after the edit every selected note sits where
   intended (start + dt, pitch index as asked, drum row + dr), the song has no orphans and the intended number of notes (a fully selected
   glide stays ONE note with all its segments); one undo restores the song bit for bit (same objects, same fields), redo repeats the edit
   bit for bit, a second undo restores it again. A tied edge in the group unties its partner (S6, same funnel); a group with one note that
   cannot go (a non-integer pitch index) changes NOTHING — the notes before it are rolled back, history stays as it was. */
export function checkSelect(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed'), absent=[];
  const lack=what=>{ if(isSeed) miss(`the seed lacks ${what}`); else absent.push(what); };
  const beat=t=>Math.round(t*1000)/1000;
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return { cases, song, total:nBad, differences:bad }; }
  if(recording){ miss('recording — stop it first'); return { cases, song, total:nBad, differences:bad }; }
  const snap=()=>new Map(events.map(e=>[e,[e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]]));
  const FIELD=['t','layer','fn','tk','sc','sev','jam','a'];
  const same=(A,B)=>{ if(A.size!==B.size) return `${A.size} events instead of ${B.size}`;
    for(const [e,x] of B){ const y=A.get(e); if(!y) return `the ${x[2]} at beat ${beat(x[0])} is gone`;
      for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return `the ${x[2]} at beat ${beat(x[0])} differs (field ${FIELD[i]})`; }
    return null; };
  const open=ly=> editIsOpen() ? editSetLayer(ly) : editOpen(ly);
  const okLayer=ly=> ly!=null && freezeState(ly)==='none' && !events.some(e=>e.layer===ly&&e.jam);
  const layersOf=role=>laneOrder().filter(ly=>laneRoleOf(ly)===role && okLayer(ly));
  const layerOf=role=>layersOf(role)[0] ?? null;
  const findIn=(role,pred)=>{ for(const ly of layersOf(role)){ const g=segsOf(ly).find(pred); if(g) return g; } return null; };   // material on any track of the role
  const segsOf=ly=>songSegs().segs.filter(g=>g.layer===ly && g.end!=null).sort((a,b)=>a.start-b.start);
  const nSegs=g=>songSegs().segs.filter(x=>x.note===g.note).length;
  const single=g=>g.first && g.endEv && /Off$/.test(g.endEv.fn);
  const notesOf=ly=>songNotes().notes.filter(n=>n.layer===ly).length;
  /* One round trip: op() → { r, dn?, notes?, check? } or false; refuse — a refusal expected, leaving song and history as they were. */
  const rt=(label,ly,op,refuse)=>{ cases++;
    if(!open(ly)){ miss(`${label}: the editor would not open L${ly+1}`); return; }
    const S0=snap(), O0=events.slice(), u0=editCanUndo(), n0=notesOf(ly), res=op();
    if(refuse){ let d; if(res) miss(`${label}: the edit was accepted`);
      if((d=same(snap(),S0))) miss(`${label}: the refused group changed the song — ${d}`);
      if(editCanUndo()!==u0) miss(`${label}: the refused group changed the history`);
      return; }
    if(!res){ miss(`${label}: the edit was refused`); return; }
    const S1=snap(); let d;
    if(!same(S1,S0)) miss(`${label}: the edit changed nothing`);
    { const O=songNotes().orphans; if(O.length){ const o=O[0], near=events.filter(e=>e.layer===o.layer&&Math.abs(e.t-o.t)<=1.01).map(e=>`${beat(e.t)} ${e.fn}${JSON.stringify({k:e.a&&e.a.k,v:e.a&&e.a.v,ti:e.a&&e.a.ti})}`).join(' | ');
      miss(`${label}: ${O.length} orphan events after the edit — first L${o.layer+1} beat ${beat(o.t)} ${o.fn} ${JSON.stringify(o.a)}; near: ${near}`); } }
    if(res.notes!==false && notesOf(ly)!==n0+(res.dn||0)) miss(`${label}: L${ly+1} has ${notesOf(ly)} notes after the edit, ${n0+(res.dn||0)} intended`);
    if(res.check && (d=res.check())) miss(`${label}: ${d}`);
    if(!editUndo()){ miss(`${label}: undo refused`); return; }
    if((d=same(snap(),S0))) miss(`${label}: one undo does not restore the song — ${d}`);
    { const i=events.findIndex((e,j)=>e!==O0[j]); if(i>=0) miss(`${label}: undo restores the events but not their order (first at #${i}, beat ${beat(events[i].t)} ${events[i].fn}) — notes at one beat would pair differently`); }
    if(editCanUndo()!==u0) miss(`${label}: the group left more than one history entry`);
    if(!editRedo()){ miss(`${label}: redo refused`); return; }
    if((d=same(snap(),S1))) miss(`${label}: redo does not repeat the edit — ${d}`);
    if(!editUndo()){ miss(`${label}: the second undo refused`); return; }
    if((d=same(snap(),S0))) miss(`${label}: the second undo does not restore the song — ${d}`);
  };
  /* After a move: every returned defining event starts at its intended beat with the asked pitch index. */
  const placed=(r,want)=>()=>{ if(!Array.isArray(r)) return 'the group move returned no selection';
    const SV=songSegs();
    for(const w of want){ const g=r.map(e=>SV.byEv.get(e)).find(x=>x && Math.abs(x.start-w.t)<1e-9 && x.layer===w.layer && x.ti===w.ti && x.oct===w.oct);
      if(!g) return `no selected note at beat ${beat(w.t)} with ti ${w.ti}/${w.oct} after the move`; }
    return r.length===want.length ? null : `${r.length} notes selected after the move, ${want.length} intended`; };
  try{
    for(const role of ['bs','ch','ld']){
      const ly=layerOf(role); if(ly==null){ lack(`an unfrozen ${role} track`); continue; }
      song++;
      const G=segsOf(ly), singles=G.filter(single), dp= role==='ch' ? 0 : 1;
      // whole notes: later (and a tuning step up for bass and solo)
      const W=singles.slice(0,3);
      if(W.length<2) lack(`two single ${role} notes in one track`);
      else rt(`${role}: move ${W.length} notes ½ beat later${dp?' and a step up':''}`, ly, ()=>{
        const r=editMoveSel(W.map(g=>dp ? { ev:g.ev, ti:g.ti+dp, oct:g.oct } : { ev:g.ev }),0.5);
        return r && { r, check:placed(r, W.map(g=>({ t:g.start+0.5, layer:ly, ti:g.ti+dp, oct:g.oct }))) }; });
      // a fully selected glide moves whole and stays one note
      const glide=findIn(role,g=>g.first && nSegs(g)>=2 && g.note.end!=null);
      if(!glide) lack(`a ${role} glide (one note, two pitches or more)`);
      else rt(`${role}: move a whole glide (every segment) 1 beat later`, glide.layer, ()=>{
        const all=songSegs().segs.filter(x=>x.note===glide.note), k=all.length, r=editMoveSel(all.map(x=>({ ev:x.ev })),1);
        return r && { r, check:()=>{ const n=songSegs().byEv.get(glide.ev); if(!n) return 'the glide head is gone';
          const m=songSegs().segs.filter(x=>x.note===n.note).length;
          return m!==k ? `the glide has ${m} segments after the move, ${k} before (it fell apart)` : Math.abs(n.start-(glide.start+1))>1e-9 ? `the glide starts at ${beat(n.start)}, intended ${beat(glide.start+1)}` : null; } }; });
      // a part of a line with a single note: the part detaches (as a single edit would) — left part, the part, right part
      const mid=findIn(role,g=>!g.first && g.endEv && segsOf(g.layer).some(x=>single(x)));   // a later segment of a glide (it detaches)
      const one=mid && segsOf(mid.layer).find(g=>single(g) && g.note!==mid.note);
      if(!mid||!one) lack(`a later segment of a ${role} glide and a single note in one track`);
      else rt(`${role}: move a segment of a glide and a single note ¼ beat later`, mid.layer, ()=>{
        const r=editMoveSel([{ ev:mid.ev }, { ev:one.ev }],0.25);
        return r && { r, dn: /Off$/.test(mid.endEv.fn) ? 1 : 2, check:placed(r,[{ t:mid.start+0.25, layer:mid.layer, ti:mid.ti, oct:mid.oct },{ t:one.start+0.25, layer:mid.layer, ti:one.ti, oct:one.oct }]) }; });
      // group delete: whole notes and a part of a line in one entry
      const DL= mid&&one ? mid.layer : ly, D= mid&&one ? [one.ev, mid.ev] : singles.slice(0,2).map(g=>g.ev);
      if(D.length>=2) rt(`${role}: delete ${D.length} selected notes`, DL, ()=>{ const r=editDeleteSel(D);
        return r && { r, notes:false, check:()=> D.some(e=>events.includes(e)) ? 'a deleted note is still in the song' : null }; });
      // refusal: a valid note first, then one that cannot go — nothing changes, history untouched
      if(W.length>=2) rt(`${role}: a group with one impossible pitch is refused whole`, ly, ()=>editMoveSel([{ ev:W[0].ev, ti:W[0].ti+dp, oct:W[0].oct },{ ev:W[1].ev, ti:W[1].ti+0.5, oct:W[1].oct }],0.5), true);
    }
    // a tied edge in the group unties its partner
    { const OT=findIn('ld',g=>g.endEv && g.endEv.fn==='leadOff' && g.endEv.a && g.endEv.a.tie && !(g.note.head.a&&g.note.head.a.tie));
      const P=OT&&tiePartners(OT.endEv)[0], other=OT&&segsOf(OT.layer).find(g=>single(g) && g.note!==OT.note && !(g.endEv.a&&g.endEv.a.tie) && !(g.note.head.a&&g.note.head.a.tie));
      if(!OT||!P||!other) lack('a solo note whose note-off is tied (a timbre switch mid-note) beside a plain note');
      else rt('ld: move a group holding a tied note-off ½ beat later (the partner unties)', OT.layer, ()=>{
        const r=editMoveSel([...songSegs().segs.filter(x=>x.note===OT.note).map(x=>({ ev:x.ev })),{ ev:other.ev }],0.5);
        return r && { r, check:()=> P.a&&P.a.tie ? `the partner at L${P.layer+1} beat ${beat(P.t)} keeps its tie` : null }; }); }
    // drums: three hits ½ beat later and a row up, then deleted — on a TEMPORARY drum take at the song end (the seed's drums are a backing)
    if(editIsOpen()) editClose();
    let tmpLy=null; const S00=snap();
    if(!loop.on){ const T=Math.ceil(songBeats())+8, R=seedTake([0,1,2,3].map(i=>({ fn:'drum', a:{ row:i%3, vol:0.8, kit:0 }, t:T+i })));
      tmpLy= R ? events.find(e=>e.tk===R.take&&e.fn==='drum')?.layer ?? null : null; }
    { const ly=tmpLy;
      if(ly==null) miss('drums: the temporary drum take could not be recorded');
      else { song++; const H=events.filter(e=>e.layer===ly&&e.fn==='drum'&&(e.a.row|0)<5).sort((a,b)=>a.t-b.t).slice(0,3);
        if(H.length<2) lack('two drum hits in one track');
        else { rt(`dr: move ${H.length} hits ½ beat later and a row up`, ly, ()=>{ const want=H.map(e=>({ e, t:e.t+0.5, row:(e.a.row|0)+1 }));
            const r=editMoveSel(H.map(e=>({ ev:e, row:(e.a.row|0)+1 })),0.5);
            return r && { r, check:()=>{ for(const w of want) if(Math.abs(w.e.t-w.t)>1e-9||(w.e.a.row|0)!==w.row) return `a hit at beat ${beat(w.e.t)} row ${w.e.a.row}, intended ${beat(w.t)} row ${w.row}`; return null; } }; });
          rt(`dr: delete ${H.length} hits`, ly, ()=>{ const r=editDeleteSel(H); return r && { r, dn:-H.length }; }); } } }
    if(editIsOpen()) editClose();
    if(tmpLy!=null){ laneDelTap(tmpLy); laneDelTap(tmpLy); }
    { const d=same(snap(),S00); if(d) miss(`drums: the song is not back as it was after the temporary take — ${d}`); }
  } finally { if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe ED1] tracks ${song} · cases ${cases} · differences ${nBad}`);
  if(absent.length) console.log('[scaleprobe ED1] not in this song (not checked): '+[...new Set(absent)].join('; '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED1] '+m));
  if(!nBad) console.log('[scaleprobe ED1] group moves and deletes on every role land where intended, keep glides whole, leave no orphans and are one history entry each; undo and redo round-trip bit for bit; a tied edge unties its partner; an impossible note refuses the whole group and changes nothing');
  return { cases, song, total:nBad, differences:bad };
}
/* ═══ ED2: COPY, PASTE, DUPLICATE — P.checkPaste ═══
   On the loaded song (editor opened and closed by the probe), per role: a selection (whole notes and a later segment of a glide) is
   copied and pasted past the song's end — the pasted notes sound EXACTLY like the originals shifted (recorder.evHz of every pitched
   event equals its source's, drum row/volume/kit equal), sit at source beat + shift, form as many new notes as were copied, every
   pasted event is in ONE fresh take (the session's), carries no tie, a note start carries a volume (rule #30), and no pasted note shares
   an owner key with a note that was already in the track (fresh k / v); no orphans; undo removes the paste bit for bit and in order,
   redo puts it back bit for bit. Duplicate lands at the offset computed HERE independently (span to the snap step; past half a bar, to
   whole bars). Paste into another track of the same role and view takes that track's timbre; into a track of another role it is
   refused and the song does not change. Drums — on a temporary take at the song end (the seed's drums are a backing), removed after. */
export function checkPaste(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed'), absent=[];
  const lack=what=>{ if(isSeed) miss(`the seed lacks ${what}`); else absent.push(what); };
  const beat=t=>Math.round(t*1000)/1000;
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return { cases, song, total:nBad, differences:bad }; }
  if(recording||loop.on){ miss('recording or playing — stop first'); return { cases, song, total:nBad, differences:bad }; }
  const snap=()=>new Map(events.map(e=>[e,[e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]]));
  const FIELD=['t','layer','fn','tk','sc','sev','jam','a'];
  const same=(A,B)=>{ if(A.size!==B.size) return `${A.size} events instead of ${B.size}`;
    for(const [e,x] of B){ const y=A.get(e); if(!y) return `the ${x[2]} at beat ${beat(x[0])} is gone`;
      for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return `the ${x[2]} at beat ${beat(x[0])} differs (field ${FIELD[i]})`; }
    return null; };
  const open=ly=> editIsOpen() ? editSetLayer(ly) : editOpen(ly);
  const okLayer=ly=> ly!=null && freezeState(ly)==='none' && !events.some(e=>e.layer===ly&&e.jam);
  const layersOf=role=>laneOrder().filter(ly=>laneRoleOf(ly)===role && okLayer(ly));
  const segsOf=ly=>songSegs().segs.filter(g=>g.layer===ly && g.end!=null).sort((a,b)=>a.start-b.start);
  const single=g=>g.first && g.endEv && /Off$/.test(g.endEv.fn);
  const keysOf=ly=>new Set(songNotes().notes.filter(n=>n.layer===ly&&n.key!=null).map(n=>n.key));
  const hz=e=>{ const r=chaseRoleOf(e.fn); if(!r||/Off$/.test(e.fn)) return null; const f=evHz(e.a,e,r); return Array.isArray(f) ? f.map(x=>x.toFixed(6)).join(',') : (f==null?null:f.toFixed(6)); };
  const chaseRoleOf=f=> f[0]==='c'?'ch' : f[0]==='b'?'bs' : f[0]==='l'?'ld' : null;
  const END=()=>Math.ceil(songBeats())+4;
  /* A paste round trip on the open track ly. src — the source events (copies' origins, in note order), shift — beat offset; do() pastes. */
  const rt=(label,ly,src,shift,doIt,extra)=>{ cases++;
    const S0=snap(), O0=events.slice(), K0=keysOf(ly), tks=new Set(events.map(e=>e.tk)), n0=songNotes().notes.filter(n=>n.layer===ly).length;
    const heads=doIt();
    if(!heads||!heads.length){ miss(`${label}: the paste was refused`); return; }
    const S1=snap(), added=events.filter(e=>!S0.has(e));
    let d;
    if(added.length!==src.length) miss(`${label}: ${added.length} events pasted, ${src.length} copied`);
    if(songNotes().orphans.length) miss(`${label}: ${songNotes().orphans.length} orphan events after the paste`);
    const n1=songNotes().notes.filter(n=>n.layer===ly).length; if(n1!==n0+heads.length) miss(`${label}: ${n1-n0} new notes, ${heads.length} intended`);
    const tk=new Set(added.map(e=>e.tk)); if(tk.size!==1 || tks.has([...tk][0])) miss(`${label}: the pasted events are not one fresh take (${[...tk].join(',')})`);
    for(const e of added){ if(e.layer!==ly){ miss(`${label}: a pasted event landed in L${e.layer+1}`); break; }
      if(e.a&&e.a.tie){ miss(`${label}: a pasted event carries a tie`); break; }
      if(/On$|^drum$/.test(e.fn) && typeof (e.a&&e.a.vol)!=='number'){ miss(`${label}: a pasted note start has no volume`); break; } }
    for(const n of songNotes().notes) if(n.layer===ly && n.key!=null && heads.includes(n.head) && K0.has(n.key)){ miss(`${label}: a pasted note shares the owner key ${n.key} with a note already in the track`); break; }
    /* every pasted event matches its source: same function, beat + shift, same pitch (evHz) — pairing by order (both sorted by beat) */
    const P=added.slice().sort((a,b)=>a.t-b.t||a.fn.localeCompare(b.fn)), Q=src.slice().sort((a,b)=>a.t-b.t||a.fn.localeCompare(b.fn));
    for(let i=0;i<Math.min(P.length,Q.length);i++){ const p=P[i], q=Q[i];
      if(p.fn!==q.fn || Math.abs(p.t-(q.t+shift))>1e-9){ miss(`${label}: pasted ${p.fn} at ${beat(p.t)}, source ${q.fn} at ${beat(q.t)} + ${beat(shift)}`); break; }
      if(hz(p)!==hz(q)){ miss(`${label}: the pasted ${p.fn} at ${beat(p.t)} sounds ${hz(p)} Hz, its source ${hz(q)} Hz`); break; }
      if(p.fn==='drum' && (p.a.row!==q.a.row || p.a.vol!==q.a.vol)){ miss(`${label}: a pasted hit differs from its source (row/volume)`); break; } }
    if(extra && (d=extra(added))) miss(`${label}: ${d}`);
    if(!editUndo()){ miss(`${label}: undo refused`); return; }
    if((d=same(snap(),S0))) miss(`${label}: undo does not remove the paste — ${d}`);
    { const i=events.findIndex((e,j)=>e!==O0[j]); if(i>=0) miss(`${label}: undo leaves the events in another order (first at #${i})`); }
    if(!editRedo()){ miss(`${label}: redo refused`); return; }
    if((d=same(snap(),S1))) miss(`${label}: redo does not repeat the paste — ${d}`);
    if(!editUndo()){ miss(`${label}: the second undo refused`); return; }
    if((d=same(snap(),S0))) miss(`${label}: the second undo does not remove the paste — ${d}`);
  };
  /* The source events a clip holds for a selection, computed HERE: whole notes as they are; a later glide segment as its own events
     plus its note-off (its own or one at the segment's end — that one has no source event: a stand-in with the segment's pitch-less off). */
  const srcOf=(segs)=>{ const out=[];
    for(const g of segs){ const n=g.note, all=songSegs().segs.filter(x=>x.note===n);
      if(all.every(x=>segs.includes(x))){ if(g===all[0]) out.push(...n.evs); continue; }
      out.push(...n.evs.filter(e=>songSegs().byEv.get(e)===g).map(e=> e===g.ev && !/On$/.test(e.fn) ? { ...e, fn:e.fn.replace(/Set$/,'On') } : e));
      out.push(/Off$/.test(g.endEv.fn) ? g.endEv : { t:g.end, fn:g.ev.fn.replace(/(On|Set)$/,'Off'), a:{}, sc:g.ev.sc, sev:g.ev.sev }); }
    return out; };
  const span=(segs,step)=>{ const t0=Math.min(...segs.map(g=>g.start)), t1=Math.max(...segs.map(g=>g.end)), M=loop.metre, sp=t1-t0;
    return sp>M/2 ? Math.ceil(sp/M-1e-9)*M : step ? Math.ceil(sp/step-1e-9)*step : sp; };
  try{
    for(const role of ['bs','ch','ld']){
      let ly=null, sel=null;
      for(const L of layersOf(role)){ const G=segsOf(L), S=G.filter(single).slice(0,2), part=G.find(g=>!g.first && g.endEv);
        if(S.length>=2){ ly=L; sel= part ? [...S, part] : S; if(part) break; } }
      if(ly==null){ lack(`a ${role} track with two single notes`); continue; }
      song++;
      if(!sel.some(g=>!g.first)) lack(`a ${role} glide whose later segment can be copied`);
      const src=srcOf(sel), t0=Math.min(...sel.map(g=>g.start)), at=END();
      if(!open(ly)){ miss(`${role}: the editor would not open L${ly+1}`); continue; }
      cases++; if(editCopySel(sel.map(g=>g.ev))!==sel.length) miss(`${role}: copy did not take ${sel.length} notes`);
      rt(`${role}: paste ${sel.length} notes past the song end`, ly, src, at-t0, ()=>editPaste(at));
      const off=span(sel,0.25);
      rt(`${role}: duplicate ${sel.length} notes (offset ${beat(off)})`, ly, src, off, ()=>editDuplicateSel(sel.map(g=>g.ev),0.25));
      // into another track of the same role and view: takes that track's timbre
      const sc=sel[0].sc, other=layersOf(role).find(L=>L!==ly && songSegs().segs.some(g=>g.layer===L&&g.sc===sc));
      if(other==null) absent.push(`a second ${role} track in the same view`);
      else { open(other);
        /* the target must have ANOTHER timbre than the source, or the check could not fail: if equal, give it another one for the case
           (a history entry of its own, undone after) */
        const srcTim=laneTimbreOf(ly); let swapped=false;
        if(laneTimbreOf(other)===srcTim){ const alt=timbresOf(role).find(x=>x.id!==srcTim); swapped=!!(alt && editSetTimbre(alt.id)); }
        const tim=laneTimbreOf(other);
        if(tim===srcTim) miss(`${role}: no second timbre to give L${other+1} — the timbre rule cannot be checked`);
        else rt(`${role}: paste into L${other+1} (same role and view, timbre ${tim} vs the source's ${srcTim})`, other, src, END()-t0, ()=>editPaste(END()),
           added=>{ const f=role==='dr'?'kit':'inst', w=added.find(e=>e.a&&e.a[f]!==undefined&&e.a[f]!==tim); return w ? `a pasted note keeps timbre ${w.a[f]}, the track's is ${tim}` : !added.some(e=>e.a&&e.a[f]===tim) ? 'no pasted note carries a timbre at all' : null; });
        if(swapped && !editUndo()) miss(`${role}: the temporary timbre of L${other+1} could not be undone`); }
      // into a track of another role: refused, nothing changes
      const alien=laneOrder().find(L=>okLayer(L) && laneRoleOf(L) && laneRoleOf(L)!==role);
      if(alien!=null){ cases++; open(alien); const S0=snap(), r=editPaste(END()); let d;
        if(r) miss(`${role}: a paste into L${alien+1} (${laneRoleOf(alien)}) was accepted`);
        if((d=same(snap(),S0))) miss(`${role}: the refused paste changed the song — ${d}`); }
    }
    // drums on a temporary take
    if(editIsOpen()) editClose();
    const S00=snap(); let tmp=null;
    { const T=Math.ceil(songBeats())+8, R=seedTake([0,1,2,3].map(i=>({ fn:'drum', a:{ row:i%3, vol:0.8, kit:0 }, t:T+i })));
      tmp= R ? events.find(e=>e.tk===R.take&&e.fn==='drum')?.layer ?? null : null; }
    if(tmp==null) miss('drums: the temporary drum take could not be recorded');
    else { song++; open(tmp);
      const H=events.filter(e=>e.layer===tmp&&e.fn==='drum').sort((a,b)=>a.t-b.t).slice(0,2);
      cases++; if(editCopySel(H)!==2) miss('drums: copy did not take 2 hits');
      rt('dr: paste 2 hits', tmp, H, END()-H[0].t, ()=>editPaste(END()));
      const sp=H[1].t-H[0].t+0.25, off= sp>loop.metre/2 ? Math.ceil(sp/loop.metre-1e-9)*loop.metre : Math.ceil(sp/0.25-1e-9)*0.25;
      rt(`dr: duplicate 2 hits (offset ${beat(off)})`, tmp, H, off, ()=>editDuplicateSel(H,0.25));
      editClose(); laneDelTap(tmp); laneDelTap(tmp); }
    { const d=same(snap(),S00); if(d) miss(`drums: the song is not back as it was after the temporary take — ${d}`); }
  } finally { if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe ED2] tracks ${song} · cases ${cases} · differences ${nBad}`);
  if(absent.length) console.log('[scaleprobe ED2] not in this song (not checked): '+[...new Set(absent)].join('; '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED2] '+m));
  if(!nBad) console.log('[scaleprobe ED2] pasted and duplicated notes sound exactly like their sources shifted, are one fresh take with fresh keys, no ties and a volume on every start; another track keeps its own timbre; another role refuses; undo and redo round-trip bit for bit and in order');
  return { cases, song, total:nBad, differences:bad };
}
/* ═══ ED3/ED4 probe kit — one round trip of an editor edit, shared by P.checkQuant and P.checkDegrees ═══
   rt(label, ly, op, o): o.prep() — a set-up edit (its own history entry, undone at the end); op() → { r, check?, dn?, pitch? } or false;
   o.refuse — a refusal expected (song and history untouched). After the edit: no orphans, notes count n0+dn, every pitch-carrying event
   that stayed sounds as before (unless pitch:false), check() → null or the defect; exactly ONE history entry; undo restores the song bit
   for bit and in order, redo repeats it, a second undo restores it; the set-up is undone and the song is as before the case. */
export function edKit(miss,tick){
  const beat=t=>Math.round(t*1000)/1000;
  const snap=()=>new Map(events.map(e=>[e,[e.t,e.layer,e.fn,e.tk,e.sc,e.sev,!!e.jam,JSON.stringify(e.a)]]));
  const FIELD=['t','layer','fn','tk','sc','sev','jam','a'];
  const same=(A,B)=>{ if(A.size!==B.size) return `${A.size} events instead of ${B.size}`;
    for(const [e,x] of B){ const y=A.get(e); if(!y) return `the ${x[2]} at beat ${beat(x[0])} is gone`;
      for(let i=0;i<x.length;i++) if(x[i]!==y[i]) return `the ${x[2]} at beat ${beat(x[0])} differs (field ${FIELD[i]})`; }
    return null; };
  const order=O=>{ const i=events.findIndex((e,j)=>e!==O[j]); return i<0 ? null : `first at #${i}, beat ${beat(events[i].t)} ${events[i].fn}`; };
  const open=ly=> editIsOpen() ? editSetLayer(ly) : editOpen(ly);
  const okLayer=ly=> ly!=null && freezeState(ly)==='none' && !events.some(e=>e.layer===ly&&e.jam);
  const layersOf=role=>laneOrder().filter(ly=>laneRoleOf(ly)===role && okLayer(ly));
  const segsOf=ly=>songSegs().segs.filter(g=>g.layer===ly && g.end!=null).sort((a,b)=>a.start-b.start);
  const findIn=(role,pred)=>{ for(const ly of layersOf(role)){ const g=segsOf(ly).find(pred); if(g) return g; } return null; };
  const single=g=>g.first && g.endEv && /Off$/.test(g.endEv.fn);
  const notesOf=ly=>songNotes().notes.filter(n=>n.layer===ly).length;
  const roleOfFn=f=> f[0]==='c'?'ch' : f[0]==='b'?'bs' : f[0]==='l'?'ld' : null;
  const hz=e=>{ const r=roleOfFn(e.fn); if(!r||/Off$/.test(e.fn)) return null; const f=evHz(e.a,e,r); return Array.isArray(f) ? f.map(x=>x.toFixed(6)).join(',') : (f==null?null:f.toFixed(6)); };
  const segOf=ev=>songSegs().byEv.get(ev);
  const nh=()=>editHistPeek().length;
  const rt=(label,ly,op,o={})=>{ tick();
    if(!open(ly)){ miss(`${label}: the editor would not open L${ly+1}`); return; }
    const SA=snap(), OA=events.slice();
    if(o.prep && !o.prep()){ miss(`${label}: the set-up edit was refused`); return; }
    const S0=snap(), O0=events.slice(), H0=new Map(events.map(e=>[e,hz(e)])), h0=nh(), n0=notesOf(ly);
    let d;
    const res=op();
    if(o.refuse){ if(res) miss(`${label}: the edit was accepted`);
      if((d=same(snap(),S0))) miss(`${label}: the refused edit changed the song — ${d}`);
      if(nh()!==h0) miss(`${label}: the refused edit changed the history`); }
    else if(!res) miss(`${label}: the edit was refused`);
    else {
      const S1=snap();
      if(!same(S1,S0)) miss(`${label}: the edit changed nothing`);
      { const O=songNotes().orphans; if(O.length) miss(`${label}: ${O.length} orphan events after the edit — first L${O[0].layer+1} beat ${beat(O[0].t)} ${O[0].fn}`); }
      if(notesOf(ly)!==n0+(res.dn||0)) miss(`${label}: L${ly+1} has ${notesOf(ly)} notes after the edit, ${n0+(res.dn||0)} intended`);
      if(res.pitch!==false) for(const [e,h] of H0) if(events.includes(e) && hz(e)!==h){ miss(`${label}: the ${e.fn} at beat ${beat(e.t)} sounds ${hz(e)} instead of ${h}`); break; }
      if(res.check && (d=res.check())) miss(`${label}: ${d}`);
      if(nh()!==h0+1) miss(`${label}: the edit left ${nh()-h0} history entries, one intended`);
      if(!editUndo()) miss(`${label}: undo refused`);
      else { if((d=same(snap(),S0))) miss(`${label}: one undo does not restore the song — ${d}`);
        if((d=order(O0))) miss(`${label}: undo restores the events but not their order (${d})`);
        if(!editRedo()) miss(`${label}: redo refused`);
        else { if((d=same(snap(),S1))) miss(`${label}: redo does not repeat the edit — ${d}`);
          if(!editUndo()) miss(`${label}: the second undo refused`);
          else if((d=same(snap(),S0))) miss(`${label}: the second undo does not restore the song — ${d}`); } }
    }
    if(o.prep){ if(!editUndo()) miss(`${label}: the set-up edit could not be undone`);
      else if((d=same(snap(),SA)||order(OA))) miss(`${label}: the song is not back as before the case — ${d}`); }
  };
  return { beat, snap, same, open, layersOf, segsOf, findIn, single, segOf, rt };
}
/* ═══ ED3: QUANTISE AFTER RECORDING — P.checkQuant ═══
   On every pitched role's first unfrozen, non-backing track (editor opened and closed by the probe), through recorder.editQuantSel: single
   notes first nudged off the grid (one group move), then quantised — starts (the note keeps its length), ends, starts + ends at 50 %; a
   boundary INSIDE a glide moves by itself (the line stays ONE note with as many segments — user decision 4, no detach; the previous segment
   ends exactly there); the seed's theremin note moves whole by its start (its bend unchanged). Drum hits on a temporary take: starts at 50 %;
   'ends' leaves hits alone (refused); hits already on the grid are refused. The expected beats are computed HERE from the grid; pitches
   never change; round trip as in the kit (one entry, undo/redo bit for bit and in order). */
export function checkQuant(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed'), absent=[];
  const lack=what=>{ if(isSeed) miss(`the seed lacks ${what}`); else absent.push(what); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const K=edKit(miss,()=>cases++), MIN=1/32, eq=(a,b)=>Math.abs(a-b)<1e-9;
  const q=(t,s,amt=1)=> t+amt*(Math.round(t/s)*s-t);
  /* the expected start and end of a single note, computed from the grid here */
  const want=(s0,e0,step,what,amt)=>{ const S=what!=='end', E=what!=='start';
    const d= S ? q(s0,step,amt)-s0 : 0, s1=s0+d; let e1=e0+d;
    if(E){ let g=Math.round(e1/step)*step; if(g<s1+MIN) g=(Math.floor(s1/step+1e-9)+1)*step; const x=e1+amt*(g-e1); if(x>=s1+MIN-1e-9) e1=x; }
    return { s:s1, e:e1 }; };
  const landed=(evs,W)=>()=>{ for(let i=0;i<evs.length;i++){ const g=K.segOf(evs[i]); if(!g) return `note ${i+1} is gone`;
      if(!eq(g.start,W[i].s)||!eq(g.note.end,W[i].e)) return `note ${i+1} spans ${K.beat(g.start)}–${K.beat(g.note.end)}, intended ${K.beat(W[i].s)}–${K.beat(W[i].e)}`; }
    return null; };
  try{
    for(const role of ['bs','ch','ld']){
      const ly=K.layersOf(role)[0] ?? null; if(ly==null){ lack(`an unfrozen ${role} track`); continue; }
      song++;
      const W=K.segsOf(ly).filter(K.single).slice(0,3);
      if(W.length<2) lack(`two single ${role} notes in one track`);
      else for(const [what,step,amt] of [['start',1/4,1],['end',1/4,1],['both',1,0.5]]){
        const evs=W.map(g=>g.ev);
        K.rt(`${role}: ${what} ${amt*100} % on grid ${step} (notes nudged 0.137 beat off it first)`, ly, ()=>{
          const Wn=evs.map(e=>{ const g=K.segOf(e); return want(g.start, g.note.end, step, what, amt); });
          const r=editQuantSel(evs, step, what, amt);
          return r && { r, check:landed(evs,Wn) }; },
          { prep:()=>editMoveSel(evs.map(e=>({ ev:e })), 0.137) });
      }
      /* a boundary inside a glide: it moves, the neighbour's length follows, no detach */
      const mid=K.findIn(role,g=>!g.first && g.endEv && g.note.end!=null);
      if(!mid) lack(`a later segment of a ${role} glide`);
      else { const segs=songSegs().segs.filter(x=>x.note===mid.note).sort((a,b)=>a.start-b.start), i=segs.indexOf(mid);
        const right= i+1<segs.length ? segs[i+1].start : mid.note.end;
        const step=[1,0.4,0.3,0.7,0.45].find(s=>{ const B=q(mid.start,s); return !eq(B,mid.start) && B>=segs[i-1].start+MIN && B<=right-MIN; });
        if(step==null) lack(`a ${role} glide boundary that some grid can move`);
        else { const B=q(mid.start,step), k=segs.length;
          K.rt(`${role}: the boundary inside a glide onto grid ${step} (stays one note)`, mid.layer, ()=>{
            const r=editQuantSel([mid.ev], step, 'start', 1);
            return r && { r, check:()=>{ const g=K.segOf(mid.ev); if(!g||g.ev!==mid.ev) return 'the boundary is no longer a segment start';
              const all=songSegs().segs.filter(x=>x.note===g.note).sort((a,b)=>a.start-b.start), j=all.indexOf(g);
              if(all.length!==k) return `the glide has ${all.length} segments, ${k} before (it fell apart or merged)`;
              if(!eq(g.start,B)) return `the boundary sits at ${K.beat(g.start)}, intended ${K.beat(B)}`;
              if(!eq(all[j-1].end,B)) return `the previous segment ends at ${K.beat(all[j-1].end)}, not at the boundary ${K.beat(B)}`;
              return null; } }; }); } }
    }
    /* the seed's theremin note: its start moves the whole note, the bend stays */
    { const th=K.findIn('ld',g=>K.single(g) && g.note.head.a && g.note.head.a.bend && g.note.head.a.bend.length);
      if(!th) lack('a solo theremin note (with a bend)');
      else { const step=[1,0.4,0.3].find(s=>!eq(q(th.start,s),th.start)), s0=th.start, e0=th.note.end, B=JSON.stringify(th.note.head.a.bend);
        K.rt(`ld: a theremin note's start onto grid ${step} (moves whole, bend kept)`, th.layer, ()=>{
          const d=q(s0,step)-s0, r=editQuantSel([th.ev], step, 'start', 1);
          return r && { r, check:()=>{ const g=K.segOf(th.ev); if(!g) return 'the theremin note is gone';
            if(!eq(g.start,s0+d)||!eq(g.note.end,e0+d)) return `it spans ${K.beat(g.start)}–${K.beat(g.note.end)}, intended ${K.beat(s0+d)}–${K.beat(e0+d)}`;
            return JSON.stringify(g.note.head.a.bend)!==B ? `its bend changed to ${JSON.stringify(g.note.head.a.bend)}` : null; } }; }); } }
    /* drums — on a temporary take at the song end (the seed's drums are a backing) */
    if(editIsOpen()) editClose();
    let tmpLy=null; const S00=K.snap();
    { const T=Math.ceil(songBeats())+8, R=seedTake([0,1.3,2.55,3.8].map((x,i)=>({ fn:'drum', a:{ row:i%3, vol:0.8, kit:0 }, t:T+x })));
      tmpLy= R ? events.find(e=>e.tk===R.take&&e.fn==='drum')?.layer ?? null : null; }
    if(tmpLy==null) miss('drums: the temporary drum take could not be recorded');
    else { song++;
      const H=events.filter(e=>e.layer===tmpLy&&e.fn==='drum').sort((a,b)=>a.t-b.t), off=H.filter(e=>!eq(e.t,Math.round(e.t)));
      if(off.length<2) lack('two drum hits off the beat in the temporary take');
      else { K.rt(`dr: ${off.length} hits, starts 50 % on grid 1`, tmpLy, ()=>{ const Wt=off.map(e=>q(e.t,1,0.5)), r=editQuantSel(off, 1, 'start', 0.5);
          return r && { r, check:()=>{ for(let i=0;i<off.length;i++) if(!eq(off[i].t,Wt[i])) return `a hit at ${K.beat(off[i].t)}, intended ${K.beat(Wt[i])}`; return null; } }; });
        K.rt('dr: "ends" moves no hit (refused)', tmpLy, ()=>editQuantSel(off, 1, 'end', 1), { refuse:true }); }
      const on=H.filter(e=>eq(e.t,Math.round(e.t)));
      if(!on.length) lack('a drum hit on the beat in the temporary take');
      else K.rt('dr: a hit already on the grid (refused)', tmpLy, ()=>editQuantSel(on, 1, 'start', 1), { refuse:true });
      if(editIsOpen()) editClose();
      laneDelTap(tmpLy); laneDelTap(tmpLy);
      { const d=K.same(K.snap(),S00); if(d) miss(`drums: the song is not back as it was after the temporary take — ${d}`); } }
  } finally { if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe ED3] tracks ${song} · cases ${cases} · differences ${nBad}`);
  if(absent.length) console.log('[scaleprobe ED3] not in this song (not checked): '+[...new Set(absent)].join('; '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED3] '+m));
  if(!nBad) console.log('[scaleprobe ED3] starts, ends and both (with strength) land where the grid says, notes keep their pitch and length where intended, a glide boundary moves without detaching, a theremin note moves whole with its bend; one history entry each, undo/redo bit for bit; nothing to move is refused');
  return out();
}
/* ═══ ED4: TRANSPOSE BY DEGREES — P.checkDegrees ═══
   On every pitched role's first unfrozen, non-backing track (editor opened and closed by the probe), through recorder.editDegreeSel:
   single notes +1 degree, a whole glide −2 (it stays ONE note with as many segments), a later segment of a glide +1 (no detach: the other
   segments keep their pitch), the seed's theremin note +1 (every event of it carries the new pitch, the bend unchanged), a note moved off
   the mode first (one tuning step) then +1 — it keeps its offset from the nearest degree. Every pitch is checked against an expectation
   computed HERE by absolute tuning steps (nearest mode pitch, a tie taking the lower; degree + n; the same offset), beats never change.
   Refusals change nothing: a shift past the last register ('reg'), drum hits only ('none'). Round trip as in the kit. The pure pitch
   arithmetic over every view is the node row «ED4 degrees (sweep)». */
export function checkDegrees(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed'), absent=[];
  const lack=what=>{ if(isSeed) miss(`the seed lacks ${what}`); else absent.push(what); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const K=edKit(miss,()=>cases++);
  /* the expected pitch, by absolute tuning steps (a second derivation, not scales.shiftDegrees) */
  const want=(ti,oct,v,k)=>{ const T=tuningOf(v), E= T.equal!=null ? T.equal : T.cents.length, n=v.iv.length, A=ti+E*oct;
    const abs=(d,r)=>tuningIndexOf(d,v)+E*r, r0=Math.floor((A-v.root)/E);
    let bd=-1, br=0, bD=Infinity;
    for(let r=r0-1;r<=r0+1;r++) for(let d=0;d<n;d++){ const x=Math.abs(A-abs(d,r)); if(x<bD || (x===bD && abs(d,r)<abs(bd,br))){ bD=x; bd=d; br=r; } }
    const D=bd+k; return { abs: abs(((D%n)+n)%n, br+Math.floor(D/n)) + (A-abs(bd,br)), E }; };
  /* every listed segment (by its defining event, read before the edit) now sits n degrees away; its beats and the other events untouched */
  const moved=(list,k)=>{ const X=list.map(g=>({ ev:g.ev, t:g.start, w:want(g.ti,g.oct,g.sc,k), evs:g.note.evs.filter(e=>songSegs().byEv.get(e)===g) }));
    return ()=>{ for(const x of X){ const g=K.segOf(x.ev); if(!g||g.ev!==x.ev) return `the segment at ${K.beat(x.t)} is no longer a segment start`;
        if(Math.abs(g.start-x.t)>1e-9) return `the segment at ${K.beat(x.t)} moved in time to ${K.beat(g.start)}`;
        const got=g.ti+x.w.E*g.oct; if(got!==x.w.abs) return `the segment at ${K.beat(x.t)} sits at ${g.ti}/${g.oct} (abs ${got}), intended abs ${x.w.abs}`;
        for(const e of x.evs) if(!/Off$/.test(e.fn) && (e.a.ti!==g.ti || (e.a.oct|0)!==g.oct)) return `an event of the segment at ${K.beat(x.t)} (beat ${K.beat(e.t)}) kept the old pitch`; }
      return null; }; };
  try{
    for(const role of ['bs','ch','ld']){
      const ly=K.layersOf(role)[0] ?? null; if(ly==null){ lack(`an unfrozen ${role} track`); continue; }
      song++;
      const W=K.segsOf(ly).filter(K.single).slice(0,3);
      if(W.length<2) lack(`two single ${role} notes in one track`);
      else K.rt(`${role}: ${W.length} notes one degree up`, ly, ()=>{ const c=moved(W,1), r=editDegreeSel(W.map(g=>g.ev),1); return r && { r, pitch:false, check:c }; });
      const glide=K.findIn(role,g=>g.first && songSegs().segs.filter(x=>x.note===g.note).length>=2 && g.note.end!=null);
      if(!glide) lack(`a ${role} glide`);
      else { const all=songSegs().segs.filter(x=>x.note===glide.note), k=all.length;
        K.rt(`${role}: a whole glide two degrees down (stays one note)`, glide.layer, ()=>{ const c=moved(all,-2), r=editDegreeSel(all.map(g=>g.ev),-2);
          return r && { r, pitch:false, check:()=>{ const d=c(); if(d) return d; const g=K.segOf(glide.ev); const m=songSegs().segs.filter(x=>x.note===g.note).length;
            return m!==k ? `the glide has ${m} segments, ${k} before` : null; } }; }); }
      const mid=K.findIn(role,g=>!g.first && g.endEv && g.note.end!=null);
      if(!mid) lack(`a later segment of a ${role} glide`);
      else { const others=songSegs().segs.filter(x=>x.note===mid.note && x!==mid).map(x=>({ ev:x.ev, ti:x.ti, oct:x.oct }));
        /* a shift that lands on a neighbour's pitch merges the two segments (the honest result of a pitch-only edit) — take one that does not */
        const nb=songSegs().segs.filter(x=>x.note===mid.note && (x.endEv===mid.ev || mid.endEv===x.ev));
        const k=[1,-1,2,-2,3,-3].find(k=>{ const p=shiftDegrees(mid.ti,mid.oct,mid.sc,k); return p && p.oct>=0 && p.oct<REG_N && !nb.some(x=>x.ti===p.ti&&x.oct===p.oct); });
        if(k==null) lack(`a ${role} glide segment that can move without meeting its neighbour’s pitch`);
        else K.rt(`${role}: a later segment of a glide ${k>0?'+':''}${k} degree(s) (no detach)`, mid.layer, ()=>{ const c=moved([mid],k), r=editDegreeSel([mid.ev],k);
          return r && { r, pitch:false, check:()=>{ const d=c(); if(d) return d;
            for(const o of others){ const g=K.segOf(o.ev); if(!g||g.ev!==o.ev||g.ti!==o.ti||g.oct!==o.oct) return `another segment of the glide changed (at ${K.beat(o.ev.t)})`; }
            return null; } }; }); }
      /* a note off the mode keeps its offset: set up by moving one single note one tuning step to a pitch outside the mode */
      const off=W.find(g=>!modeSlotOfTi(g.ti+1,g.oct,g.sc));
      if(!off) absent.push(`a ${role} note whose next tuning step is off the mode (${role==='ch'?'chromatic chords':'a mode filling its tuning'})`);
      else K.rt(`${role}: an out-of-mode note one degree up (keeps its offset)`, ly, ()=>{ const g=K.segOf(off.ev), c=moved([g],1), r=editDegreeSel([off.ev],1); return r && { r, pitch:false, check:c }; },
        { prep:()=>editMoveSel([{ ev:off.ev, ti:off.ti+1, oct:off.oct }],0) });
      /* refusal: past the last register */
      if(W.length) K.rt(`${role}: ${W.length>1?'notes':'a note'} shifted past the last register (refused)`, ly, ()=>{
        const evs=W.map(g=>g.ev), n=40*(W[0].sc.iv.length);
        if(editDegreeWhy(evs,n)!=='reg') miss(`${role}: the reason for a shift past the registers is ${editDegreeWhy(evs,n)}, not 'reg'`);
        return editDegreeSel(evs,n); }, { refuse:true });
    }
    /* the seed's theremin note: every event carries the new pitch (the hold changes too), the bend unchanged */
    { const th=K.findIn('ld',g=>K.single(g) && g.note.head.a && g.note.head.a.bend && g.note.head.a.bend.length);
      if(!th) lack('a solo theremin note (with a bend)');
      else { const B=JSON.stringify(th.note.head.a.bend);
        K.rt('ld: a theremin note one degree up (bend kept)', th.layer, ()=>{ const c=moved([th],1), r=editDegreeSel([th.ev],1);
          return r && { r, pitch:false, check:()=>{ const d=c(); if(d) return d; const g=K.segOf(th.ev);
            return JSON.stringify(g.note.head.a.bend)!==B ? `its bend changed to ${JSON.stringify(g.note.head.a.bend)}` : null; } }; }); } }
    /* drums only: nothing to transpose — refused, the reason 'none' (a temporary take at the song end) */
    if(editIsOpen()) editClose();
    let tmpLy=null; const S00=K.snap();
    { const T=Math.ceil(songBeats())+8, R=seedTake([0,1].map(x=>({ fn:'drum', a:{ row:x, vol:0.8, kit:0 }, t:T+x })));
      tmpLy= R ? events.find(e=>e.tk===R.take&&e.fn==='drum')?.layer ?? null : null; }
    if(tmpLy==null) miss('drums: the temporary drum take could not be recorded');
    else { const H=events.filter(e=>e.layer===tmpLy&&e.fn==='drum');
      K.rt('dr: drum hits only (refused)', tmpLy, ()=>{ if(editDegreeWhy(H,1)!=='none') miss(`dr: the reason is ${editDegreeWhy(H,1)}, not 'none'`); return editDegreeSel(H,1); }, { refuse:true });
      if(editIsOpen()) editClose();
      laneDelTap(tmpLy); laneDelTap(tmpLy);
      { const d=K.same(K.snap(),S00); if(d) miss(`drums: the song is not back as it was after the temporary take — ${d}`); } }
  } finally { if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe ED4] tracks ${song} · cases ${cases} · differences ${nBad}`);
  if(absent.length) console.log('[scaleprobe ED4] not in this song (not checked): '+[...new Set(absent)].join('; '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED4] '+m));
  if(!nBad) console.log('[scaleprobe ED4] every selected segment moves exactly n degrees of its mode (an out-of-mode note keeps its offset), beats never change, glides stay whole, a theremin keeps its bend; one history entry each, undo/redo bit for bit; past the registers and drums-only are refused');
  return out();
}
/* ═══ OWN2: THE BEND CURVE — P.checkBend ═══
   On the seed's theremin note (the first solo note with a curve of ≥ 3 points, unfrozen track), through recorder.editBendPoint with the
   editor open: a point's cents +35 (its time kept); a point's time past its neighbour (clamped just before it); the first point's time
   (stays 0, only its cents); a point added between two (sorted in); a point deleted; refused: deleting the first point, adding on an
   existing point's time or past the note's end. Each edit: the curve is exactly the one computed here, the note's pitch and every other
   event untouched, ONE history step, undo / redo bit for bit (edKit). CONTROL that must fail: the array changed in place (bendDbg) — ↶
   cannot bring the old curve back. */
export function checkBend(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed');
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const K=edKit(miss,()=>cases++);
  const th=K.findIn('ld',g=>K.single(g) && g.note.head.a && g.note.head.a.bend && g.note.head.a.bend.length>=3);
  if(!th){ if(isSeed) miss('the seed lacks a solo theremin note with three bend points'); return out(); }
  song=1;
  const ev=th.note.head, ly=th.layer, len=th.note.end-th.note.start, B=()=>ev.a.bend.map(p=>({ dt:p.dt, c:p.c }));
  const is=(W,label)=>()=>{ const G=B(); return JSON.stringify(G)===JSON.stringify(W) ? null : `${label}: the curve is ${JSON.stringify(G)}, intended ${JSON.stringify(W)}`; };
  try{
    { const B0=B(), W=B0.map((p,i)=>i===1?{ dt:p.dt, c:p.c+35 }:p);
      K.rt('a point +35 cents', ly, ()=>{ const r=editBendPoint(ev,'move',1,B0[1].dt,B0[1].c+35); return r!==false && { r:true, check:is(W,'+35 cents') }; }); }
    { const B0=B(), W=B0.map((p,i)=>i===1?{ dt:B0[2].dt-1e-6, c:p.c }:p);
      K.rt('a point dragged past its neighbour (clamped)', ly, ()=>{ const r=editBendPoint(ev,'move',1,B0[2].dt+0.5,B0[1].c); return r!==false && { r:true, check:is(W,'clamped') }; }); }
    { const B0=B(), W=B0.map((p,i)=>i===0?{ dt:0, c:p.c-20 }:p);
      K.rt('the first point: time stays 0, cents −20', ly, ()=>{ const r=editBendPoint(ev,'move',0,0.7,B0[0].c-20); return r!==false && { r:true, check:is(W,'first point') }; }); }
    { const B0=B(), t=(B0[0].dt+B0[1].dt)/2, W=[B0[0],{ dt:t, c:-50 },...B0.slice(1)];
      K.rt('a point added between the first two', ly, ()=>{ const r=editBendPoint(ev,'add',null,t,-50); return r===1 && { r:true, check:is(W,'added') }; }); }
    { const B0=B(), W=B0.filter((p,i)=>i!==2);
      K.rt('a point deleted', ly, ()=>{ const r=editBendPoint(ev,'del',2); return r!==false && { r:true, check:is(W,'deleted') }; }); }
    K.rt('deleting the first point (refused)', ly, ()=>editBendPoint(ev,'del',0), { refuse:true });
    K.rt('adding on an existing point (refused)', ly, ()=>editBendPoint(ev,'add',null,B()[1].dt,10), { refuse:true });
    K.rt('adding past the note end (refused)', ly, ()=>editBendPoint(ev,'add',null,len+1,10), { refuse:true });
    /* CONTROL: an in-place change survives ↶ */
    { cases++; if(K.open(ly)){ const a0=ev.a, keep=B();
        bendDbg(true); const r=editBendPoint(ev,'move',1,keep[1].dt,keep[1].c+15); bendDbg(false);
        editUndo();
        const back=JSON.stringify(B())===JSON.stringify(keep);
        if(r===false) miss('CONTROL: the in-place edit was refused');
        else if(back) miss('CONTROL: with the curve changed in place, ↶ still brought it back — the check cannot fail');
        ev.a=a0; a0.bend.length=0; a0.bend.push(...keep); histReset(); } }
  } finally { bendDbg(false); if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe OWN2] cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe OWN2] '+m));
  if(!nBad) console.log('[scaleprobe OWN2] bend points move, clamp, add and delete exactly as computed here, the first stays at 0; refusals change nothing; one history step each, undo/redo bit for bit; CONTROL: an in-place change survives ↶');
  return out();
}
/* ═══ BEND-CURVE: GLIDES AND SHAPES — P.checkBendCurve ═══
   Deterministic (no real-time capture). Material: a temporary theremin take after the song end — a recorded-style curve [0:0, 1:0, 6:0]
   (no shapes), 8 beats long; its row is deleted at the end.
   (1) RECORDED CURVES UNCHANGED: for every theremin note of the song, config.bendPlan gives exactly (===) the pre-slice schedule — one
       setFreq per point at t0 + dt·spb with the bank's default τ — and every chase entry (each point's beat and each midpoint) exactly the
       pre-slice chase rewrite; chaseNote hands the whole curve and its entry beat. CONTROL: a curve with one glide must differ.
   (2) THROUGH THE EDITOR (each one history step, undo/redo bit for bit — edKit): a hand-added point glides in and the recorded point after
       it glides on; then with two hand-added points (beat 2 at 0¢, beat 4 at +300¢) the glide between them curved +0.6 and −0.6 and
       switched to a step; refusals (no change, the first point).
   (3) THE PITCH ALONG THE CURVE: each captured curve's ramps (bendPlan) applied by Web Audio itself (a ConstantSource offset in an
       OfflineAudioContext, setTargetAtTime as a bank does) and read back: the glide passes 75 / 150 / 225¢ at beats 2.5 / 3 / 3.5; +0.6
       above and −0.6 below the straight line at their curve's value; the step holds 0¢ just before beat 4 and is at +300¢ 0.2 s after.
       Tolerance = how far the ideal curve moves within one sub-step around that moment (the ramp's own resolution). CONTROLS that must
       fail: the old behaviour (hand points without shapes) for the glide; the straight glide for "above the line"; the glide for "holds".
   (4) LIVE = RENDER: what the render copy schedules for the temporary track (render.bendTrace, the curved glide applied) carries the
       event's curve, its attack pitch (evHz), the tempo and no entry beat, and its ramps equal bendPlan for those arguments exactly — the
       arguments live replay derives (recorder ENG.leadOn) and the function it calls.
   (5) BUS LANES: two hand points on a chord track's reverb lane; the glide into the second curved +0.6 / −0.6 (one step each, ↶/↷ exact):
       the merged lane (fxLaneMerge — what ▶ and the render read) carries k and its expansion passes above / below the line at the
       midpoint by the curve law. CONTROL: the lane without k sits on the line (must fail "above"). */
export async function checkBendCurve(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const K=edKit(miss,()=>cases++), M=loop.metre, spb=60/loop.bpm, r2=x=>Math.round(x*100)/100, done=r=> !!r && r!=='changed';
  const oldPlan=(B,base,t0)=>B.map(p=>({ f:base*Math.pow(2,p.c/1200), at:t0+p.dt*spb, tc:undefined }));
  const oldChase=(B,base,t0,off)=>{ let k=-1; for(let j=0;j<B.length&&B[j].dt<=off;j++) k=j;
    const nb= k>=0 ? [{ dt:0, c:B[k].c }] : []; for(let j=k+1;j<B.length;j++) nb.push({ dt:B[j].dt-off, c:B[j].c }); return oldPlan(nb,base,t0); };
  const eqPlan=(A,B)=> A.length===B.length && A.every((x,i)=>x.f===B[i].f && x.at===B[i].at && x.tc===B[i].tc);
  const restoreVer=laneVerKeep(), S00=K.snap(), FX00=takeFxDump();
  let tmpLy=null, autLy=null, ev=null; const cap={};
  try{
    const T0=Math.ceil(songBeats()/M-1e-9)*M+M;
    const R=seedTake([{ fn:'leadOn', a:{ deg:2, oct:1, vol:0.8, inst:0, bend:[{dt:0,c:0},{dt:1,c:0},{dt:6,c:0}], v:0 }, t:T0, id:1 },
                      { fn:'leadOff', a:{ v:0 }, t:T0+8, id:1 }]);
    ev= R ? events.find(e=>e.tk===R.take&&e.fn==='leadOn') : null; tmpLy= ev ? ev.layer : null;
    if(!ev){ miss('the temporary theremin take could not be recorded'); return out(); }
    histReset();
    const S0=K.snap();
    /* (1) recorded curves */
    const th=songNotes().notes.filter(n=>n.role==='ld' && n.head.a && n.head.a.bend && n.head.a.bend.length && !n.head.a.bend.some(p=>p.sh));
    song=th.length;
    if(th.length<2) miss(`${th.length} recorded theremin notes in the song (the seed has one, the probe adds one)`);
    for(const n of th){ cases++; const h=n.head, B=h.a.bend, base=evHz(h.a,h,'ld'), t0=1.25, at=`L${n.layer+1} beat ${r2(n.start)}`;
      if(!eqPlan(bendPlan(B,base,spb,t0,0), oldPlan(B,base,t0))){ miss(`${at}: a recorded curve is not scheduled exactly as before`); continue; }
      const xs=[...new Set([...B.map(p=>p.dt), ...B.slice(1).map((p,i)=>(B[i].dt+p.dt)/2)])].filter(x=>x>0);
      for(const off of xs) if(!eqPlan(bendPlan(B,base,spb,t0,off), oldChase(B,base,t0,off))){ miss(`${at}: entering at +${r2(off)} beats is not scheduled exactly as the old chase`); break; }
      for(const off of xs){ const x=n.start+off; if(n.end!=null && x>=n.end) continue;
        const s=chaseFor(x).find(c=>c.on===h); if(!s) continue;
        const A=chaseNote(s,x).a; if(A.bend!==B || A.bendFrom!==x-h.t){ miss(`${at}: the chase at +${r2(off)} hands bend ${A.bend===B?'(same)':'(another)'} from ${A.bendFrom}`); break; } } }
    { cases++; const B=[{dt:0,c:0},{dt:1,c:0},{dt:3,c:300,sh:'s'}];
      if(eqPlan(bendPlan(B,440,spb,0,0), oldPlan(B,440,0))) miss('CONTROL: a curve with a glide is scheduled as the old steps — the comparison cannot fail'); }
    /* (2) the editor */
    const ly=tmpLy, Bnow=()=>ev.a.bend, cp=()=>Bnow().map(q=>({ ...q }));
    K.rt('a hand-added point glides in, the recorded point after it glides on', ly, ()=>{ const r=editBendPoint(ev,'add',null,2,0);
      return r!==false && { r:true, check:()=>{ const B=Bnow(); return B[2].sh==='s' && B[3].sh==='s' && !B[1].sh ? null : `shapes ${JSON.stringify(B.map(q=>q.sh||'-'))}, intended - - s s`; } }; });
    if(!K.open(ly)){ miss('the editor would not open the temporary track'); return out(); }
    const h0=histLen();
    if(editBendPoint(ev,'add',null,2,0)===false || editBendPoint(ev,'add',null,4,300)===false || histLen()!==h0+2){ miss('the two hand points could not be added (one step each)'); return out(); }
    cap.glide=cp();
    if(JSON.stringify(cap.glide)!==JSON.stringify([{dt:0,c:0},{dt:1,c:0},{dt:2,c:0,sh:'s'},{dt:4,c:300,sh:'s'},{dt:6,c:0,sh:'s'}])) miss(`two hand points: the curve is ${JSON.stringify(cap.glide)}`);
    for(const [k,key] of [[0.6,'up'],[-0.6,'down']])
      K.rt(`the glide between them curved ${k>0?'+':''}${k}`, ly, ()=>{ const r=editBendShape(ev,3,'s',k);
        return r!==false && { r:true, check:()=>{ cap[key]=cp(); return Bnow()[3].k===k && Bnow()[3].sh==='s' ? null : `point 3 is ${JSON.stringify(Bnow()[3])}`; } }; });
    K.rt('the glide switched to a step', ly, ()=>{ const r=editBendShape(ev,3,'h');
      return r!==false && { r:true, check:()=>{ cap.step=cp(); return Bnow()[3].sh==='h' ? null : `point 3 is ${JSON.stringify(Bnow()[3])}`; } }; });
    K.rt('a shape that changes nothing (refused)', ly, ()=>editBendShape(ev,3,'s'), { refuse:true });
    K.rt('the first point has no segment into it (refused)', ly, ()=>editBendShape(ev,0,'h'), { refuse:true });
    /* (4) live = render, with the curved glide in place */
    { cases++; K.open(ly);
      if(editBendShape(ev,3,'s',0.6)===false) miss('(4): the curve could not be set');
      editClose();
      let log=null; try{ const RR=await import('../render.js'); log=await RR.bendTrace(ly); }catch(e){ miss(`(4): the render failed — ${e&&e.message}`); }
      const want=JSON.stringify(ev.a.bend), base=evHz(ev.a,ev,'ld');
      const L=(log||[]).filter(x=>JSON.stringify(x.B)===want);
      if(log && L.length!==1) miss(`(4): the render scheduled ${L.length} curves equal to the note's (of ${log.length} calls), one intended`);
      for(const x of L){
        if(x.base!==base) miss(`(4): the render's attack pitch is ${x.base} Hz, live derives ${base} Hz`);
        if(x.spb!==spb) miss(`(4): the render's beat is ${x.spb} s, live uses ${spb} s`);
        if(x.from!==0) miss(`(4): the render enters the curve at ${x.from}, not 0`);
        if(!eqPlan(x.plan, bendPlan(ev.a.bend,base,spb,x.t0,0))) miss('(4): the render ramps differ from bendPlan for the same arguments');
        const B=ev.a.bend, ng=x.plan.filter(s=>s.tc===BEND_GLIDE_TC).length;
        const ex=B.reduce((n,q,j)=> n + (j && q.sh==='s' ? Math.ceil((q.dt-B[j-1].dt)*spb/BEND_GLIDE_STEP_S-1e-9) : 0), 0);
        if(ng!==ex || !ng) miss(`(4): ${ng} glide sub-steps in the render, ${ex} intended (one per ${BEND_GLIDE_STEP_S*1000} ms of each glide)`); }
      if(!done(histUndo())) miss('(4): the curve step could not be undone'); }
    { let ok=true; for(let i=0;i<2;i++) ok=done(histUndo())&&ok;
      if(editIsOpen()) editClose(); const d=K.same(K.snap(),S0); if(!ok||d) miss(`the temporary note is not back after undoing the two points — ${d||'undo refused'}`); }
    /* (3) the pitch along the curve, applied by Web Audio */
    const base=evHz(ev.a,ev,'ld'), SR=16000, Tq=0.05, db=BEND_GLIDE_STEP_S/spb;
    const evalAt=async(B,secs)=>{ const plan=bendPlan(B,base,spb,Tq,0), end=Tq+Math.max(...secs)+0.3;
      const oc=new OfflineAudioContext(1,Math.ceil(end*SR),SR), cs=oc.createConstantSource();
      cs.offset.setValueAtTime(base,0);
      for(const s of plan) cs.offset.setTargetAtTime(s.f, s.at, s.tc===undefined ? 0.02 : s.tc);   // 0.02 — the banks' default τ (audio LEAD_GLIDE_TC)
      cs.connect(oc.destination); cs.start(0);
      const d=(await oc.startRendering()).getChannelData(0);
      return secs.map(s=>1200*Math.log2(d[Math.round((Tq+s)*SR)]/base)); };
    const tolAt=(B,x)=>Math.max(0.05, Math.abs(bendAt(B,x+db)-bendAt(B,x)), Math.abs(bendAt(B,x)-bendAt(B,x-db)));
    const near=async(B,xs)=>{ const v=await evalAt(B,xs.map(x=>x*spb)); return xs.map((x,i)=>({ x, v:v[i], want:bendAt(B,x), tol:tolAt(B,x) })); };
    const offBy=Rs=>Rs.filter(r=>Math.abs(r.v-r.want)>r.tol);
    const fmt=Rs=>Rs.map(r=>`beat ${r.x}: ${r2(r.v)}¢ (curve ${r2(r.want)}¢ ±${r2(r.tol)})`).join('; ');
    if(cap.glide){ cases+=2;
      const G=await near(cap.glide,[2.5,3,3.5]); if(offBy(G).length) miss(`the glide misses its curve — ${fmt(offBy(G))}`);
      if(Math.abs(G[1].want-150)>1e-9) miss(`the glide's midpoint by the law is ${G[1].want}¢, not 150`);
      const ctl=cap.glide.map(({ sh, k, ...q })=>q), C=await near(ctl,[3]);
      if(Math.abs(C[0].v-G[1].want)<=G[1].tol) miss(`CONTROL: hand points acting as steps (the old behaviour) still pass the glide's midpoint (${r2(C[0].v)}¢)`); }
    else miss('(3): the glide curve was not captured');
    for(const [key,sg] of [['up',1],['down',-1]]){ if(!cap[key]){ miss(`(3): the ${key} curve was not captured`); continue; } cases++;
      const [r]=await near(cap[key],[3]);
      if(offBy([r]).length) miss(`the curved glide (${key}) misses its curve — ${fmt([r])}`);
      if(!(sg*(r.v-150)>r.tol)) miss(`the curved glide (${key}) is not ${sg>0?'above':'below'} the straight line: ${r2(r.v)}¢ at the midpoint`); }
    if(cap.glide){ cases++; const [r]=await near(cap.glide,[3]); if(r.v-150>r.tol) miss(`CONTROL: the straight glide reads as above the line (${r2(r.v)}¢) — the check cannot fail`); }
    if(cap.step){ cases++;
      const [a]=await evalAt(cap.step,[4*spb-0.02]), [b]=await near(cap.step,[4+0.2/spb]);
      if(Math.abs(a)>0.01) miss(`the step does not hold before its point: ${r2(a)}¢ just before beat 4`);
      if(offBy([b]).length || b.want<250) miss(`the step does not jump to +300¢ at beat 4 — ${fmt([b])}`);
      if(cap.glide){ const [g]=await evalAt(cap.glide,[3.5*spb]); if(Math.abs(g)<=0.01) miss('CONTROL: the glide reads as holding — the hold check cannot fail'); } }
    else miss('(3): the step curve was not captured');
    /* (5) bus lanes */
    autLy=laneOrder().find(l=>laneRoleOf(l)==='ch' && freezeState(l)==='none' && !events.some(e=>e.layer===l&&e.jam)) ?? null;
    if(autLy==null || !editOpen(autLy)) miss('(5): no unfrozen chord track to put lane points on');
    else { const A=autAddrs(autLy).find(x=>x.fx==='reverb'), F0=takeFxDump(), t1=T0+1, t2=T0+5, n0=histLen();
      const p1=A&&autAddPoint(autLy,A.fx,A.p,t1,0.2), p2=A&&autAddPoint(autLy,A.fx,A.p,t2,0.8);
      if(!p1||!p2) miss('(5): two lane points could not be added (no reverb on the chord track)');
      else {
        if(p2.sh!=='s') miss(`(5): the second hand point enters with ${p2.sh}, not a glide`);
        const recOf=()=>autPoints(autLy,A.key,A.fx,A.p).pts.find(r=>r.pt===p2);
        const mid=()=>{ const L=fxLaneMerge(), e=L.find(x=>x.fx===A.fx&&x.p===A.p&&x.t===t1&&x.v===0.2&&x.nx&&x.nx.t===t2);
          if(!e) return null; const X=fxLaneExpand([e,e.nx],(t2-t1)/2).find(x=>Math.abs(x.t-(t1+t2)/2)<1e-9); return X ? { v:X.v, k:e.nx.k } : null; };
        for(const k of [0.6,-0.6]){ cases++; const h1=histLen(), k0=p2.k;
          if(!autCurvePoint(recOf(),k) || histLen()!==h1+1){ miss(`(5): curving the lane glide by ${k} was refused or took ${histLen()-h1} steps`); continue; }
          const m=mid(), want=0.2+0.6*curveU(0.5,k);
          if(!m) miss(`(5): the merged lane lost the glide (k ${k})`);
          else { if(m.k!==k) miss(`(5): the merged lane carries k ${m.k}, not ${k}`);
            if(Math.abs(m.v-want)>1e-12) miss(`(5): the expanded midpoint is ${m.v}, the curve law gives ${want}`);
            if(!(Math.sign(k)*(m.v-0.5)>0.01)) miss(`(5): the curved lane (k ${k}) is not ${k>0?'above':'below'} the line at its midpoint (${r2(m.v)})`); }
          if(!done(histUndo()) || p2.k!==k0) miss(`(5): ↶ did not bring the curvature ${k0} back (k ${p2.k})`);
          if(!done(histRedo()) || p2.k!==k) miss(`(5): ↷ did not bring the curvature ${k} back (k ${p2.k})`); }
        { cases++; const k=p2.k; delete p2.k; const m=mid(); p2.k=k;
          if(m && m.v-0.5>0.01) miss('CONTROL: the lane without its curvature still reads above the line — the check cannot fail'); }
        while(histLen()>n0 && done(histUndo())){ /* back to before the lane points */ }
        if(takeFxDump()!==F0) miss('(5): the captured lanes are not back after undoing the lane edits'); }
      editClose(); }
  } finally {
    if(editIsOpen()) editClose();
    if(tmpLy!=null){ laneDelTap(tmpLy); laneDelTap(tmpLy); }
    histReset(); restoreVer();
    { const d=K.same(K.snap(),S00); if(d) miss(`the song is not back as it was before the probe — ${d}`); }
    if(takeFxDump()!==FX00) miss('the captured lanes are not back as before the probe');
  }
  console.log(`[scaleprobe BEND-CURVE] recorded theremin notes ${song} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe BEND-CURVE] '+m));
  if(!nBad) console.log('[scaleprobe BEND-CURVE] recorded curves schedule exactly as before; hand points glide, curve up/down and step exactly as the shape law says (read back from Web Audio); the render schedules what live replay computes; bus lanes curve by the same law; CONTROLS fail');
  return out();
}
/* ═══ OWN1: A TRACK INTO ANOTHER MODE — P.checkTrackMode ═══
   On the seed, through recorder.editTrackMode with the editor open (edKit: one history step, undo / redo bit for bit, nothing else in the
   song changes): for the first unfrozen solo, bass and chord track, the first other mode it can go to (scales.modesLikeView) — every event
   of the track takes that mode's view; every pitch-carrying event gets exactly the pitch scales.mapDegrees gives (expected from the state
   before, computed here); beats, volumes and bends unchanged. The seed's frozen track goes stale with the edit and after its ↶ (it
   re-freezes by itself), fresh again once the edit versions are back. Refusals: the same mode, a mode of another tuning or with another
   number of degrees, a drum track. CONTROL: each case must move pitches (a no-op re-map would pass a weaker check). */
export function checkTrackMode(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const K=edKit(miss,()=>cases++), restoreVer=laneVerKeep();
  const pitchOf=e=> e.a && typeof e.a.ti==='number';
  try{
    for(const role of ['ld','bs','ch']){
      const ly=K.layersOf(role).find(l=>trackViewOfLayer(l)); if(ly==null){ miss(`no unfrozen ${role} track in the song`); continue; }
      const v=trackViewOfLayer(ly), M=modesLikeView(v).filter(m=>m!==(v.mode||v));
      if(!K.open(ly)){ miss(`L${ly+1}: the editor would not open`); continue; }
      const moves=x=>events.some(e=>e.layer===ly && e.a && typeof e.a.ti==='number' && (q=>q && (q.ti!==e.a.ti||q.oct!==(e.a.oct|0)))(mapDegrees(e.a.ti, e.a.oct|0, e.sc, scaleView(x, v.tunedFrom))));
      const m=M.find(x=>editTrackModeWhy(x)===null && moves(x)); if(!m){ miss(`L${ly+1} (${role}, ${v.id}): no other mode it can go to that moves a pitch (${M.length} of the same tuning and size)`); continue; }   // material: a target where the track's pitches really move
      song++;
      const E0=events.filter(e=>e.layer===ly).map(e=>({ e, t:e.t, a:e.a }));
      K.rt(`L${ly+1} ${role}: ${v.id} → ${m.id}`, ly, ()=>{ const r=editTrackMode(m);
        return r && { r:true, pitch:false, check:()=>{ const v2=trackViewOfLayer(ly); let moved=0;
          if(!v2 || (v2.mode||v2)!==m) return `the track's view is ${v2&&v2.id}, not ${m.id}`;
          for(const x of E0){ const e=x.e;
            if(e.sc!==v2) return `the ${e.fn} at beat ${K.beat(e.t)} kept another view (${e.sc&&e.sc.id})`;
            if(e.t!==x.t) return `the ${e.fn} at beat ${K.beat(x.t)} moved in time`;
            if(!pitchOf(e)){ if(e.a!==x.a) return `the ${e.fn} at beat ${K.beat(x.t)} without a pitch got a new payload`; continue; }
            const w=mapDegrees(x.a.ti, x.a.oct|0, v, v2);
            if(!w || e.a.ti!==w.ti || e.a.oct!==w.oct) return `the ${e.fn} at beat ${K.beat(x.t)}: ${x.a.ti}/${x.a.oct} → ${e.a.ti}/${e.a.oct}, intended ${w&&w.ti}/${w&&w.oct}`;
            if(e.a.ti!==x.a.ti || e.a.oct!==x.a.oct) moved++;
            for(const f of ['vol','bend','fx','inst','ty','bri']) if(e.a[f]!==x.a[f]) return `the ${e.fn} at beat ${K.beat(x.t)} changed its ${f}`; }
          return moved ? null : `CONTROL: no pitch moved (${E0.length} events) — the case proves nothing`; } }; });
      K.rt(`L${ly+1}: its own mode (refused)`, ly, ()=>editTrackMode(v.mode||v), { refuse:true });
      { cases++; if(editTrackModeWhy(v.mode||v)!=='same') miss(`L${ly+1}: the reason for its own mode is ${editTrackModeWhy(v.mode||v)}, not 'same'`); }
      const other=SCALES.find(x=>x.sel && x.tuning!==(v.mode||v).tuning), size=SCALES.find(x=>x.sel && x.tuning===(v.mode||v).tuning && x.iv.length!==v.iv.length);
      if(other) K.rt(`L${ly+1}: a mode of another tuning (${other.id}, refused)`, ly, ()=>editTrackMode(other), { refuse:true });
      if(size) K.rt(`L${ly+1}: a mode with ${size.iv.length} degrees (${size.id}, refused)`, ly, ()=>editTrackMode(size), { refuse:true });
    }
    { const ly=laneOrder().find(l=>laneRoleOf(l)==='dr' && freezeState(l)==='none' && !events.some(e=>e.layer===l&&e.jam));
      if(ly!=null) K.rt(`L${ly+1}: a drum track (refused)`, ly, ()=>editTrackMode(SCALES.find(x=>x.sel)), { refuse:true }); }
    /* the frozen track */
    const FZ=laneOrder().find(l=>freezeState(l)==='fresh' && trackViewOfLayer(l) && laneRoleOf(l)!=='dr');
    if(FZ==null) miss('the seed has no frozen pitched track');
    else { cases++; const v=trackViewOfLayer(FZ), m=modesLikeView(v).find(x=>x!==(v.mode||v));
      if(!m) miss(`L${FZ+1}: its mode ${v.id} has no other mode of the same tuning and size`);
      else if(!editOpen(FZ)) miss(`L${FZ+1}: the editor would not open the frozen track`);
      else { const r=editTrackMode(m); editClose();
        if(!r) miss(`L${FZ+1}: re-mapping the frozen track was refused (${editTrackModeWhy(m)})`);
        else { if(freezeState(FZ)!=='stale') miss(`L${FZ+1}: after the re-map its freeze is ${freezeState(FZ)}, not stale`);
          const u=histUndo(); if(!u||u==='changed') miss(`L${FZ+1}: undo refused (${u})`);
          if(trackViewOfLayer(FZ)!==v) miss(`L${FZ+1}: undo did not bring its view back`);
          if(freezeState(FZ)!=='stale') miss(`L${FZ+1}: after the undo its freeze is ${freezeState(FZ)} — a track touched by ↶ re-freezes by itself`);
          restoreVer(); if(freezeState(FZ)!=='fresh') miss(`L${FZ+1}: not fresh again once the edit versions are back (${freezeState(FZ)})`); } } }
  } finally { if(editIsOpen()) editClose(); histReset(); restoreVer(); }
  console.log(`[scaleprobe OWN1] tracks ${song} · cases ${cases} · differences ${nBad}`);
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe OWN1] '+m));
  if(!nBad) console.log('[scaleprobe OWN1] a whole track takes the new view and every pitch lands on the same degree of the new mode (an out-of-mode note keeps its offset); one history step, undo/redo bit for bit; refusals change nothing; the frozen track goes stale');
  return out();
}
/* ═══ ED5: VOLUME BARS — P.checkVolBars ═══
   recorder.pnBars / editVolSel on every pitched role's first unfrozen, non-backing track and a temporary drum take: (1) one bar per note,
   at its start, with the note's own start volume; (2) a bar drag shifts EVERY volume value of that note by d (clamped 0..1, never unset —
   rule #30) and nothing else in the song; (3) two selected notes move by the same d; (4) clamping at 1 and at 0 (0 is a value); (5) a note
   inside a hand-drawn smooth segment (set up through the lane: a point mid-note) loses its Volume ramp marks — no 'r'/'s', no
   generated-for-Volume flag — so the lane shows what sounds; (6) two drum hits on ONE beat keep their own volumes: the edited one moves,
   the other does not. CONTROL that must fail (6): the same edit through the LINE (autMovePoint on that beat — one value per beat, pnPlan)
   flattens the other hit. Every case: one history entry, undo / redo bit for bit and in order (edKit). */
export function checkVolBars(){
  const bad=[]; let nBad=0, cases=0, song=0; const miss=m=>{ nBad++; if(bad.length<KEEP_MAX) bad.push(m); };
  const isSeed=!!(SEED_REC&&SEED_REC.kind==='seed'), absent=[];
  const lack=what=>{ if(isSeed) miss(`the seed lacks ${what}`); else absent.push(what); };
  const out=()=>({ cases, song, total:nBad, differences:bad });
  if(editIsOpen()){ miss('the track editor is open — close it: the probe opens it itself'); return out(); }
  if(recording||loop.on){ miss('recording or playing — stop first'); return out(); }
  const K=edKit(miss,()=>cases++), MK='vol:amt';
  const car=e=>/^(leadOn|leadSet|bassOn|bassSet|chOn|chSet|drum)$/.test(e.fn);
  const noteOf=ev=>songNotes().notes.find(n=>n.evs.includes(ev));
  /* the intended values, computed here from a.vol (a second derivation, not pnGet); others = every other carrier's volume, unchanged */
  const shifted=(heads,d)=>{ const N=heads.map(noteOf), mine=new Set(N.flatMap(n=>n.evs));
    const W=N.map(n=>n.evs.filter(car).map(e=>({ e, v:Math.max(0,Math.min(1,e.a.vol+d)) })));
    const O=events.filter(e=>car(e)&&!mine.has(e)).map(e=>[e,e.a.vol]);
    return ()=>{ for(const L of W) for(const {e,v} of L){ if(typeof e.a.vol!=='number') return `the ${e.fn} at beat ${K.beat(e.t)} has no volume`;
        if(Math.abs(e.a.vol-v)>1e-6) return `the ${e.fn} at beat ${K.beat(e.t)} has volume ${e.a.vol}, intended ${+v.toFixed(6)}`; }
      for(const [e,v] of O) if(events.includes(e) && e.a.vol!==v) return `another note's ${e.fn} at beat ${K.beat(e.t)} changed its volume ${v} → ${e.a.vol}`;
      return null; }; };
  const bars=ly=>{ const B=pnBars(ly), N=songNotes().notes.filter(n=>n.layer===ly && n.evs.some(car));
    if(B.length!==N.length) return `L${ly+1}: ${B.length} bars for ${N.length} notes`;
    for(let i=0;i<N.length;i++){ const b=B[i], n=N[i], h=n.evs.find(car);
      if(b.ev!==n.head || b.t!==n.start) return `L${ly+1}: bar ${i+1} is not at its note's start`;
      if(b.v!==h.a.vol) return `L${ly+1}: bar ${i+1} shows ${b.v}, its note starts at ${h.a.vol}`; }
    return null; };
  try{
    for(const role of ['bs','ch','ld']){
      const ly=K.layersOf(role)[0] ?? null; if(ly==null){ lack(`an unfrozen ${role} track`); continue; }
      song++; cases++;
      { const d=bars(ly); if(d) miss(`${role}: ${d}`); }
      const W=K.segsOf(ly).filter(K.single).slice(0,2);
      if(W.length<2){ lack(`two single ${role} notes in one track`); continue; }
      const h0=W[0].note.head, h1=W[1].note.head;
      K.rt(`${role}: one bar −15`, ly, ()=>{ const c=shifted([h0],-0.15), r=editVolSel([h0],-0.15); return r && { r, check:c }; });
      K.rt(`${role}: two selected bars +10`, ly, ()=>{ const c=shifted([h0,h1],0.1), r=editVolSel([W[0].ev,W[1].ev],0.1); return r && { r, check:c }; });
      K.rt(`${role}: a bar pulled past the top (clamped at 100)`, ly, ()=>{ const c=shifted([h0],5), r=editVolSel([h0],5); return r && { r, check:c }; });
      K.rt(`${role}: a bar pulled to the floor (0 is a value)`, ly, ()=>{ const c=shifted([h0],-5), r=editVolSel([h0],-5); return r && { r, check:c }; });
    }
    /* (5) a held note inside a hand-drawn smooth segment: the lane's point mid-note gives it an anchor and ramp events ('r', generated) */
    { const g=K.findIn('ch',x=>K.single(x) && x.note.end-x.start>=2) || K.findIn('bs',x=>K.single(x) && x.note.end-x.start>=2);
      if(!g) lack('a chord or bass note of two beats or more');
      else { const ly=g.layer, mid=g.start+(g.note.end-g.start)/2, head=g.note.head;
        K.rt(`${laneRoleOf(ly)}: a bar edit on a note with a smooth Volume ramp (ramp marks become steps)`, ly, ()=>{
          const n=noteOf(head), marked=n.evs.some(e=>e.a&&((e.a.sh&&e.a.sh[MK])||(e.a.gen&&e.a.gen[MK])));
          if(!marked) return miss(`${laneRoleOf(ly)}: the set-up point made no ramp inside the note`), false;
          const c=shifted([head],0.05), r=editVolSel([head],0.05);
          return r && { r, check:()=>{ const d=c(); if(d) return d;
            for(const e of noteOf(head).evs){ const s=e.a.sh&&e.a.sh[MK], x=e.a.gen&&e.a.gen[MK];
              if(s==='r'||s==='s'||x) return `the ${e.fn} at beat ${K.beat(e.t)} kept a Volume ramp mark (${s||'gen'})`; }
            return null; } }; },
          { prep:()=>!!autAddPoint(ly,FX_VOL,'amt',mid,0.35) }); } }
    /* (6) two drum hits on one beat (kick 0.8, hat 0.5), a temporary take at the song end; then its control through the line */
    if(editIsOpen()) editClose();
    const S00=K.snap(); let tmpLy=null;
    { const T=Math.ceil(songBeats())+8, R=seedTake([{ fn:'drum', a:{ row:0, vol:0.8, kit:0 }, t:T }, { fn:'drum', a:{ row:3, vol:0.5, kit:0 }, t:T }, { fn:'drum', a:{ row:0, vol:0.7, kit:0 }, t:T+1 }]);
      tmpLy= R ? events.find(e=>e.tk===R.take&&e.fn==='drum')?.layer ?? null : null; }
    if(tmpLy==null) miss('drums: the temporary drum take could not be recorded');
    else { song++;
      const H=events.filter(e=>e.layer===tmpLy&&e.fn==='drum').sort((a,b)=>a.t-b.t||a.a.row-b.a.row), kick=H[0], hat=H.find(e=>e.t===kick.t&&e!==kick);
      if(!hat) miss('drums: the two hits did not land on one beat');
      else {
        K.rt('dr: one of two hits on one beat +10 (the other keeps its volume)', tmpLy, ()=>{ cases++; const d=bars(tmpLy); if(d) miss(`dr: ${d}`);
          const c=shifted([kick],0.1), r=editVolSel([kick],0.1); return r && { r, check:c }; });
        /* CONTROL: the line holds one value per beat — the same edit there must flatten the hat */
        cases++;
        if(!(editIsOpen() ? editSetLayer(tmpLy) : editOpen(tmpLy))) miss('drums control: the editor would not open');
        else { const A=autAddrs(tmpLy).find(a=>a.fx===FX_VOL), D=A&&autPoints(tmpLy,A.key,A.fx,A.p), pt=D&&D.pts.find(r=>Math.abs(r.pt.t-kick.t)<1e-9&&Math.abs(r.pt.v-0.8)<1e-9);
          const hatV=hat.a.vol, ok=pt && autMovePoint(pt.pt, pt.pt.t, 0.9);
          if(!ok) miss('drums control: the line edit was refused');
          else { if(hat.a.vol===hatV) miss(`CONTROL: the line edit left the hat at ${hatV} — the per-note check would not catch a one-value-per-beat edit`);
            if(!editUndo()) miss('drums control: undo refused'); } }
      }
      if(editIsOpen()) editClose();
      laneDelTap(tmpLy); laneDelTap(tmpLy);
      { const d=K.same(K.snap(),S00); if(d) miss(`drums: the song is not back as it was after the temporary take — ${d}`); } }
  } finally { if(editIsOpen()) editClose(); }
  console.log(`[scaleprobe ED5] tracks ${song} · cases ${cases} · differences ${nBad}`);
  if(absent.length) console.log('[scaleprobe ED5] not in this song (not checked): '+[...new Set(absent)].join('; '));
  bad.slice(0,PRINT_MAX).forEach(m=>console.warn('[scaleprobe ED5] '+m));
  if(!nBad) console.log('[scaleprobe ED5] one bar per note at its own start volume; a bar drag shifts every volume value of its notes by the same amount (clamped, never unset) and nothing else; smooth ramp marks of an edited note become steps; two hits on one beat keep their own volumes (CONTROL: the line flattens them); one history entry each, undo/redo bit for bit');
  return out();
}

/* rows of this area — the registry (probes/rows.js) orders them by «at» */
row({ at:190, name:'S4 solo editing', run:()=>checkSoloEdit(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:200, name:'ED1 several notes at once', run:()=>checkSelect(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:210, name:'ED2 copy, paste, duplicate', run:()=>checkPaste(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:220, name:'ED3 quantise after recording', run:()=>checkQuant(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:230, name:'ED4 transpose by degrees', run:()=>checkDegrees(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:260, name:'OWN1 track into another mode', run:()=>checkTrackMode(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:270, name:'ED5 volume bars', run:()=>checkVolBars(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:310, name:'OWN2 bend curve', run:()=>checkBend(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
row({ at:320, name:'BEND-CURVE glides and shapes', run:()=>checkBendCurve(), read:r=>({ cases:r.cases, song:r.song, diff:r.total, list:r.differences }), song:true });
