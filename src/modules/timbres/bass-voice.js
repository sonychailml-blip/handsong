/* AUD1c (RUN 3, 2026-10-16) — the bass pool voices. Moved from src/audio.js; an ENGINE SUBMODULE (hard rule #38): stateless — every
   engine value comes from the engine context E (audio.engineCtx) passed as the first argument; nothing here keeps state. */
import { voiceBuild, voiceStartPair } from './voice.js';
import { makeBriStage, makePanStage, voiceRoute } from './stages.js';

/* --- БАС: пул голосов С КЛЮЧАМИ ВЛАДЕЛЬЦЕВ (bassHold[owner]), как у соло. Тембр печётся НА АТАКЕ по голосу (как
   аккорд), а не глобально — записанный слой сохраняет свой инструмент (§3.4, как строй/септаккорд).
   ⛳ P1: ПУЛ ЛЕНИВЫЙ, КАК У СОЛО. Прежде initAudio строил BASS_POOL_N=4 голоса СРАЗУ — по голосу на дорожку, — и
   пятая звучащая бас-дорожка крала голос у первой (особенно больно сразу после смены тоники: все замороженные
   дорожки разом уходят на события, то есть в живой пул). Теперь голос строится, когда он впервые нужен, до
   потолка BASS_POOL_N (поднят до потолка соло). ⛔ Правило #3 цело: построенный голос не останавливается и не
   разбирается никогда — только гасится гейтом env, ровно как прежние четыре.
   ЖИВЫХ владельцев баса с V2/V3 — по режиму голоса: в ведущем (умолчание) один ('bass', последний щипок), в полифоническом —
   ключ на руку и палец ('bass:L[:f]'); живые руки и записанные бас-дорожки делят ОДИН пул (до 8 живых нот поверх дорожек
   начнут красть у них — отпущенные первыми).
   ⛔ Код ЗЕРКАЛИТ соло (leadAlloc/newLeadVoice), а не сливается с ним: голос баса — свой (две пилы и фильтр), и
   слияние ждёт формата тембра (HANDOFF, «БАС И СОЛО — ОДИН ИНСТРУМЕНТ»). --- */
function buildBassPool(E, dest, n){   // n голосов разом; зовёт ТОЛЬКО newBassVoice (по одному) — живой и офлайн-пул ленивые (P1)
  for(let i=0;i<n;i++){
    voiceBuild(E);                                   // B: новый голос (см. voiceStart)
    const o1=E.ac.createOscillator(), o2=E.ac.createOscillator();
    const g1=E.ac.createGain(), g2=E.ac.createGain();
    const lp=E.ac.createBiquadFilter(), env=E.ac.createGain(), vol=E.ac.createGain();
    o1.type='sawtooth'; o2.type='sawtooth'; lp.type='lowpass'; lp.frequency.value=500;
    /* Осцилляторы приглушены ДО фильтра (как m1/m2 у аккордов): иначе два осциллятора
       в фазе дают пик 2.0 — в 12 раз громче аккордового голоса, и бас в одиночку
       вгонял лимитер в 12 дБ подавления, «прижимая» аккорды на всю длину ноты. */
    g1.gain.value=.5; g2.gain.value=.5;
    env.gain.value=0; vol.gain.value=0.5;
    const tg=E.ac.createGain();   // MX1: уровень ДОРОЖКИ — после огибающей, до громкости голоса (связь vol→шина и ступень яркости не тронуты)
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(env); env.connect(tg); const pan=makePanStage(E, tg,vol); const vo= E.trackBus.bs&&dest===E.bus.bs ? E.ac.createGain() : dest; vol.connect(vo);   // MX2: tg → панорама → громкость голоса; AF5: vo — the voice's output before its router
    voiceStartPair(E, o1,o2);   // пара — в фазе (Саб-синус: синус+синус на одной частоте — разброс фаз гасил основной тон до тишины), голос — со своей задержкой
    const bri=makeBriStage(E, vol,vo); const rt= vo!==dest ? voiceRoute(E, vo, E.bus.bs, E.trackBus.bs) : null;   // ЯРКОСТЬ: рядом с прежней связью vol→шина (не тронута), без величины — ровно ноль (см. makeBriStage). lp голоса — ТЕМБР (огибающая атаки), его не трогаем
    /* deg/oct — КАКУЮ НОТУ голос держит (P1, зеркало соло-голоса): звуку не нужны, их читает ПОДСВЕТКА (с V2, правило
       #26) — из реестра движка, а не из состояния руки. Пишет их ТОТ ЖЕ вызов, что звучит (bassOn/bassSet), гасит bassOff. */
    E.pool.bs.v.push({o1,o2,g1,g2,lp,env,tg,pan,vol,bri,rt,owner:null,ins:null,tOn:0,on:false,freeAt:0,deg:-1,oct:0});   // freeAt — только для offline (F2); живьём не читается
  }
}
export { buildBassPool };
