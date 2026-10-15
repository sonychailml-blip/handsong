/* PROBE1: Shared probe helpers: frames with a fallback timer, measures, the quick flag, the short render window, window keep/restore. Moved from scaleprobe.js verbatim; rows register themselves (probes/rows.js). */
import { arrFace, rollBeat0, rollSpan, laneRow0, arrOpen, setLaneRow0 } from '../state.js';
import { arrApi } from '../ui.js';

/* ⛳ МЕРЫ СТРОК (слайс AUTO-PROBE): проба кладёт сюда измеренные величины с допуском — {name, value, limit, dir:'max'|'min'|'abs'|null,
   unit}; P.all собирает их по строкам (res.measures), раннер tools/probe-browser.mjs --repeat печатает по прогонам с запасом до допуска,
   чтобы хрупкие строки было видно ДО того, как они упадут. Вердикт меры не решают — их решает сама проба, как прежде. */
export let MEAS=[];
export const measReset=()=>{ MEAS=[]; };   // P.all: each row starts with an empty list (importers cannot assign a live binding)
export const meas=(name,value,limit=null,dir=null,unit='')=>{ if(value!=null && Number.isFinite(+value)) MEAS.push({ name, value:+(+value).toPrecision(4), limit, dir, unit }); };
/* ⛳ КАДР С ЗАПАСНЫМ ТАЙМЕРОМ (после MX2: P.orderCheck напечатал одну таблицу P.all из двух). В скрытой вкладке requestAnimationFrame не
   приходит вовсе, и проба, ждущая кадр, висела бы бесконечно — молча. Теперь кадр — rAF или 1 с, что раньше; не дождались — счётчик
   frameStalls (P.all печатает его: окно не рисовалось, строки окон могли читать старый снимок). Держите вкладку видимой. */
export let frameStalls=0;
/* ⛳ СКРЫТАЯ ВКЛАДКА (слайс «быстрые пробы»): кадров не будет вовсе — не ждём секунду на каждый, а сразу считаем пропуск; строки, читающие
   нарисованное окно, P.all покажет «не проверено: вкладка скрыта» (DRAWN_ROWS). */
export const frame=()=>new Promise(res=>{ if(typeof document!=='undefined' && document.hidden){ frameStalls++; res(); return; }
  let done=false; const fin=st=>{ if(done) return; done=true; if(st) frameStalls++; res(); };
  requestAnimationFrame(()=>fin(false)); setTimeout(()=>fin(true),1000); });
export const waitMs=ms=>new Promise(res=>setTimeout(res,ms));
/* ⛳ КОРОТКОЕ ОКНО РЕНДЕРА ПРОБ (слайс «быстрые пробы»): секунд песни от первого события дорожки (render.renderTrack o.short; хвост ≤ 1 с).
   Мерам проб — баланс каналов, отношение уровней, повтор двух рендеров — нужна пара секунд звука, не вся дорожка: рендер в разы короче
   (буфер ≈ 0.5 с разгона + 1 с песни + хвост ≤ 0.75 с).
   Замороженный бас посева (P.checkFrozen) этим не затронут — его цифры сняты при P.seed полной заморозкой (render.freeze). */
export const PROBE_SHORT=1.0;
/* ⛳ P.quick: рендерящие строки берут ТОЛЬКО высотную дорожку — подслучаи ударных (ступень уровня и панорамы в ударе, повтор ударных)
   остаются в P.all. Рендер копии стоит около секунды даже коротким окном (пул аккордов копии строится и звучит целиком), а цель P.quick —
   меньше 30 с. Ставит P.all({quick:true}) на время прогона и снимает в finally. */
export let QUICK=false;
export const setQuick=v=>{ QUICK=!!v; };   // P.all sets it for the run
/* ⛳ ОКНО АРАНЖИРОВКИ, ЛИЦО, ОКНО ВРЕМЕНИ И ПРОКРУТКА — СНИМОК И ВОЗВРАТ (починка после MX2). Пробы микшера открывают окно и лицо «микшер»;
   прежде в finally ставили лицо «аранжировка» безусловно и не возвращали окно времени (первый вход в окно вписывает всю песню) и прокрутку.
   Теперь — ровно как было до пробы, в finally (и при исключении). */
export const winKeep=()=>({ face:arrFace, b0:rollBeat0, span:rollSpan, row0:laneRow0 });
export function winRestore(k){ if(arrOpen) arrApi.close(); if(arrFace!==k.face) arrApi.face(k.face); arrApi.setWin(k.b0,k.span); setLaneRow0(k.row0); }
