/* NIGHT-7 — NIGHT'S OWN TEXTS, both languages. NIGHT-7b: shared texts (start, calibration, cards, settings, hints) never name a room — the room's
   own words live in its record; the data row checks it. Night-only strings live in this app, not in core (core rule 3): imported first by main.js, they
   join the shared dictionaries (core/i18n.js DICTS — t() and [data-i18n] read them like any other key). Every key here has an English and a
   Russian text (data row «NIGHT texts both languages (app)» checks it, with every key the Night page and its code use). */
import { DICTS } from '../../core/i18n.js';

export const NIGHT_TEXTS=Object.freeze({
  en:Object.freeze({
    'night.privacyLine':'Your camera picture never leaves this device.',
    'night.set.quality':'Picture',
    'night.q.standard':'Standard',
    'night.q.detailed':'Detailed — for strong devices',
    'night.set.camera':'Camera', 'night.cam.front':'Front', 'night.cam.back':'Back', 'night.cam.n':'Camera {n}',   // NIGHT-10
    'night.howTo':'How to play',
    'night.card.skip':'Skip',
    'night.card.next':'Next',
    'night.card.go':'Play',
    'night.card.of':'{n} of {m}',
    'night.card.play.t':'Play',
    'night.card.play.b':'Touch your thumb to a fingertip and a note sounds — each finger has its own. Raise or lower your hand for higher or lower notes. Hold the touch and the note goes on; let go and it fades.',
    'night.card.depth.t':'Near and far',
    'night.card.depth.b':'Bring your playing hand closer to the camera or move it away. Farther: the space around the sound opens up and its echo grows deeper. Closer: the sound comes near and clear.',
    'night.card.fx.t':'Your other hand',
    'night.card.fx.b':'Your other hand shapes the sound: touch a finger to your thumb and move it up or down — index Echo, middle Warm or Bright, ring Wave. The sound stays where you leave it.',
    'night.card.music.t':'Music',
    'night.card.music.b':'The quiet music you hear plays under your notes. The Music button below changes it — {still}, {drift}, {glimmer} — or turns it off.',
    'night.card.home.t':'Full screen',
    'night.card.home.b':'On iPhone and iPad, full screen comes from the Home Screen: tap Share, then “Add to Home Screen”. Handsong Night then opens from its own icon, without Safari’s bars.',
    'night.fs.enter':'Full screen',
    'night.fs.exit':'Leave full screen',
    'night.phones':'Headphones help: everything here plays quietly.',
    'night.cal.offerB':'One step, about 10 seconds: show the camera the hand you play with. Then the sound will follow its movement more closely.',
    'night.cal.doneB':'Your hand is remembered. Closer to the camera, the sound is near and clear; farther, the space around it opens up and the echo grows.',
  }),
  ru:Object.freeze({
    'night.privacyLine':'Изображение с камеры никогда не покидает это устройство.',
    'night.set.quality':'Картинка',
    'night.q.standard':'Обычная',
    'night.q.detailed':'Подробная — для мощных устройств',
    'night.set.camera':'Камера', 'night.cam.front':'Передняя', 'night.cam.back':'Задняя', 'night.cam.n':'Камера {n}',   // NIGHT-10
    'night.howTo':'Как играть',
    'night.card.skip':'Пропустить',
    'night.card.next':'Дальше',
    'night.card.go':'Играть',
    'night.card.of':'{n} из {m}',
    'night.card.play.t':'Игра',
    'night.card.play.b':'Коснитесь большим пальцем кончика другого пальца — прозвучит нота; у каждого пальца своя. Выше или ниже рука — выше или ниже ноты. Держите касание — нота звучит дальше; отпустите — она затихнет.',
    'night.card.depth.t':'Ближе и дальше',
    'night.card.depth.b':'Поднесите играющую руку ближе к камере или отведите дальше. Дальше — вокруг звука больше простора, а эхо глубже. Ближе — звук рядом и чище.',
    'night.card.fx.t':'Вторая рука',
    'night.card.fx.b':'Другая рука меняет звук: прижмите палец к большому и ведите вверх или вниз — указательный: эхо, средний: тепло или яркость, безымянный: волна. Звук остаётся таким, как вы оставили.',
    'night.card.music.t':'Музыка',
    'night.card.music.b':'Тихая музыка, которую вы слышите, звучит под вашими нотами. Кнопка «Музыка» внизу меняет её — {still}, {drift}, {glimmer} — или выключает.',
    'night.card.home.t':'Во весь экран',
    'night.card.home.b':'На iPhone и iPad весь экран даёт экран «Домой»: нажмите «Поделиться», затем «На экран „Домой“». Тогда Handsong Night откроется со своего значка, без панелей Safari.',
    'night.fs.enter':'Во весь экран',
    'night.fs.exit':'Выйти из полноэкранного режима',
    'night.phones':'С наушниками лучше: здесь всё звучит тихо.',
    'night.cal.offerB':'Один шаг, около 10 секунд: покажите камере руку, которой играете. Тогда звук будет точнее следовать за её движением.',
    'night.cal.doneB':'Рука запомнена. Ближе к камере — звук рядом и чище; дальше — вокруг него больше простора и эха.',
  }),
});
for(const [lang, T] of Object.entries(NIGHT_TEXTS)) if(DICTS[lang]) Object.assign(DICTS[lang], T);
