/* GES1 part 1 (stage 3) — THE PURE GESTURE MATH: pinch ratios normalised by hand size, the touched fingers with their hysteresis, the
   one-step smoothing, smoothstep with a dead zone, degree / axis / palette-cell hysteresis — moved from gestures.js (which re-exports what
   its readers import). Pure: imports only config.js; runs in node (the data runner's row «GES1 gesture features (core)»). Moved verbatim. */
import { FINGER_TIPS, PAL_HYST_X, PAL_HYST_Y, PINCH_OFF, PINCH_ON, ROW_HYST } from '../config.js';
let pinchD=0;   // HAND1 probe control only: PINCH_ON nudged by d (0 otherwise)
const pinchDbg=d=>{ pinchD=+d||0; };   // HAND1 control: the pinch threshold nudged (0 = off)

 
const clamp01=v=>Math.max(0,Math.min(1,v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
/* Расстояние «большой палец → кончик» нормируется на размер ладони
   (запястье → основание указательного): щипок срабатывает одинаково
   вблизи и вдали от камеры — критично при игре Z-ревербом. */
function pinchRatios(lm){
  const scale=dist(lm[0],lm[5])||1e-6, r={};
  for(const f of FINGER_TIPS)r[f]=dist(lm[4],lm[f])/scale;
  return r;
}
function minFinger(r){
  let mf=FINGER_TIPS[0],mv=Infinity;
  for(const f of FINGER_TIPS)if(r[f]<mv){mv=r[f];mf=f;}
  return[mf,mv];
}
/* ВСЕ пальцы, прижатые к большому СЕЙЧАС (индексы 0..3), а не один ближайший. Гистерезис ТОТ ЖЕ, что
   был у единственного щипка: войти нужно строго ниже PINCH_ON, отпустить — выше PINCH_OFF (между ними
   палец держится). Поэтому при ОДНОМ прижатом пальце множество совпадает с прежним «mv<PINCH_ON /
   mv>PINCH_OFF» ровно, порог в порог: одна нота ощущается как раньше.
   prev — множество прошлого кадра (гистерезис на руке, S.touch). */
function touchedFingers(r,prev){
  const now=new Set();
  for(let i=0;i<FINGER_TIPS.length;i++){
    const v=r[FINGER_TIPS[i]];
    if(prev.has(i) ? v<=PINCH_OFF : v<PINCH_ON+pinchD) now.add(i);   // pinchD: HAND1 probe control only (0 otherwise)
  }
  return now;
}
function emaS(S,k,v,a=0.35){ S.sm[k]=(k in S.sm)?S.sm[k]+a*(v-S.sm[k]):v; return S.sm[k]; }
/* smoothstep с мёртвой зоной: <a → 0 (РОВНО), >b → 1, между — гладко. Несущая часть: покоящаяся рука = 0 энергии. */
function smoothstep(a,b,x){ if(b<=a)return x>=b?1:0; const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }
/* Раньше у соло сетка обрезалась на высоту нижней полосы эффектов. Полосы больше нет
   (столбики рисуются ПОВЕРХ слева), поэтому ввод считается по ВСЕЙ высоте — как и
   рисуется. Эти две высоты обязаны совпадать: разойдутся — палец будет брать не ту
   ступень, которую видит, и тем сильнее, чем ниже по экрану. */
function degRaw(y,rows,H){ const seg=H/rows;
  let z=Math.floor(y/seg); if(z<0)z=0; if(z>rows-1)z=rows-1;
  return rows-1-z;
}
/* Гистерезис по границам ступеней: чтобы в 19/31-TET (узкие ряды)
   не было «трели» на стыке, соседняя ступень берётся лишь когда
   палец ушёл от границы дальше 16% высоты ряда. */
function degHyst(y,rows,H,prev){
  const seg=H/rows; let d=degRaw(y,rows,H);
  if(prev>=0&&prev<=rows-1&&Math.abs(d-prev)===1){
    const zTop=rows-1-Math.max(d,prev), b=(zTop+1)*seg;
    if(Math.abs(y-b)<seg*ROW_HYST)return prev;
  }
  return Math.min(d,rows-1);
}
/* Гистерезис ОДНОЙ оси — общий движок для колонок и рядов палитры: соседнюю ячейку
   берём, только если палец ушёл от границы дальше hyst её размера. Тот же приём, что
   degHyst по Y; без него на узких ячейках выбор дребезжал бы от дрожания руки. */
function axHyst(v,a0,a1,n,prev,hyst){
  const seg=(a1-a0)/n; let d=Math.floor((v-a0)/seg); if(d<0)d=0; if(d>n-1)d=n-1;
  if(prev>=0&&prev<=n-1&&Math.abs(d-prev)===1){
    const b=a0+Math.max(d,prev)*seg;
    if(Math.abs(v-b)<seg*hyst)return prev;
  }
  return d;
}
/* Попадание в ячейку палитры: ДВЕ независимые одномерные проверки. Сначала X даёт
   колонку (семейство), и только потом её types.length задаёт число рядов для Y —
   порядок важен, наборы могут быть рваными. prev-состояние живёт на РУКЕ (S.pc/S.pr),
   а не в глобальном стейте: новый щипок начинает с чистого листа, а залипшая ячейка
   при этом остаётся выбранной. */
function cellHyst(x,y,x0,x1,y0,y1,fams,prevC,prevR){
  const c=axHyst(x,x0,x1,fams.length,prevC,PAL_HYST_X);
  const nR=fams[c].types.length;
  const r=axHyst(y,y0,y1,nR,(prevR>=0&&prevR<nR)?prevR:-1,PAL_HYST_Y);
  return [c,r];
}
/* Другая рука, всё ещё держащая щипок в той же зоне — для ПЕРЕДАЧИ голоса в ВЕДУЩЕМ режиме (V2; прежде — только бас).
   ⚠️ Нужна ТОЛЬКО ведущему режиму: там голос у роли один, и без передачи оставшаяся рука замолкала бы. В
   полифоническом у каждой руки свой голос — передавать нечего, и передача была бы ВРЕДНА (вторая рука получила бы
   чужую ноту). Поэтому зовёт её лишь ветка ведущего режима в endPinch и сторож. */

export { pinchDbg, clamp01, clamp, dist, pinchRatios, minFinger, touchedFingers, emaS, smoothstep, degRaw, degHyst, cellHyst };
