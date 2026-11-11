/* NIGHT-7 — NIGHT'S OWN TEXTS, both languages. Night-only strings live in this app, not in core (core rule 3): imported first by main.js, they
   join the shared dictionaries (core/i18n.js DICTS — t() and [data-i18n] read them like any other key). Every key here has an English and a
   Russian text (data row «NIGHT texts both languages (app)» checks it, with every key the Night page and its code use). */
import { DICTS } from '../../core/i18n.js';

export const NIGHT_TEXTS=Object.freeze({
  en:Object.freeze({
    'night.privacyLine':'Your camera picture never leaves this device.',
    'night.set.quality':'Picture',
    'night.q.standard':'Standard',
    'night.q.detailed':'Detailed — for strong devices',
    'night.howTo':'How to play',
    'night.card.skip':'Skip',
    'night.card.next':'Next',
    'night.card.go':'Play',
    'night.card.of':'{n} of {m}',
    'night.card.play.t':'Play',
    'night.card.play.b':'Touch your thumb to a fingertip and a note sounds — each finger has its own. Raise or lower your hand for higher or lower notes. Hold the touch and the note goes on; let go and it fades.',
    'night.card.depth.t':'Near and far',
    'night.card.depth.b':'Bring your playing hand closer to the camera or move it away. Farther: the forest’s echo grows deeper and your light drifts deeper between the trees. Closer: the sound comes near and clear.',
    'night.card.fx.t':'Your other hand',
    'night.card.fx.b':'Your other hand shapes the sound: touch a finger to your thumb and move it up or down — index Echo, middle Warm or Bright, ring Wave. The sound stays where you leave it.',
    'night.card.music.t':'Music',
    'night.card.music.b':'The Music button below adds a quiet accompaniment under your notes — {still}, {drift} or {glimmer}. Tap it to change, again to turn it off.',
  }),
  ru:Object.freeze({
    'night.privacyLine':'Изображение с камеры никогда не покидает это устройство.',
    'night.set.quality':'Картинка',
    'night.q.standard':'Обычная',
    'night.q.detailed':'Подробная — для мощных устройств',
    'night.howTo':'Как играть',
    'night.card.skip':'Пропустить',
    'night.card.next':'Дальше',
    'night.card.go':'Играть',
    'night.card.of':'{n} из {m}',
    'night.card.play.t':'Игра',
    'night.card.play.b':'Коснитесь большим пальцем кончика другого пальца — прозвучит нота; у каждого пальца своя. Выше или ниже рука — выше или ниже ноты. Держите касание — нота звучит дальше; отпустите — она затихнет.',
    'night.card.depth.t':'Ближе и дальше',
    'night.card.depth.b':'Поднесите играющую руку ближе к камере или отведите дальше. Дальше — эхо леса глубже, а ваш огонёк уходит дальше между деревьями. Ближе — звук рядом и чище.',
    'night.card.fx.t':'Вторая рука',
    'night.card.fx.b':'Другая рука меняет звук: прижмите палец к большому и ведите вверх или вниз — указательный: эхо, средний: тепло или яркость, безымянный: волна. Звук остаётся таким, как вы оставили.',
    'night.card.music.t':'Музыка',
    'night.card.music.b':'Кнопка «Музыка» внизу добавляет тихое сопровождение под ваши ноты — {still}, {drift} или {glimmer}. Нажмите, чтобы сменить, ещё раз — чтобы выключить.',
  }),
});
for(const [lang, T] of Object.entries(NIGHT_TEXTS)) if(DICTS[lang]) Object.assign(DICTS[lang], T);
