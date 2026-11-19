/* NIGHT-7 — NIGHT'S OWN TEXTS, both languages. NIGHT-7b: shared texts (start, calibration, cards, settings, hints) never name a room — the room's
   own words live in its record; the data row checks it. Night-only strings live in this app, not in core (core rule 3): imported first by main.js, they
   join the shared dictionaries (core/i18n.js DICTS — t() and [data-i18n] read them like any other key). Every key here has an English and a
   Russian text (data row «NIGHT texts both languages (app)» checks it, with every key the Night page and its code use). */
import { DICTS, langsAdd } from '../../core/i18n.js';
import ES from './lang/es.js';   // LANG-1: six more languages (player-facing keys; development items fall back to English)
import PT from './lang/pt.js';
import DE from './lang/de.js';
import FR from './lang/fr.js';
import IT from './lang/it.js';
import KA from './lang/ka.js';

export const NIGHT_TEXTS=Object.freeze({
  en:Object.freeze({
    'night.privacyLine':'Your camera picture never leaves this device.',
    'night.q.standard':'Standard',
    'night.q.detailed':'Detailed — for strong devices',
    'night.set.camera':'Camera', 'night.cam.front':'Front', 'night.cam.back':'Back', 'night.cam.n':'Camera {n}',   // NIGHT-10
    'night.audio.tap':'Tap to continue',   // NIGHT-11: the phone stopped the sound
    'night.update.ready':'A new version is ready. Tap to open it.',   // NIGHT-14: the precache found a new version
    'night.cam.lost':'The camera stopped. Close other apps that use it, then tap here to try again.',
    /* NIGHT-11 part 2: the start's own words — the model's progress, a failed start (phone / computer, Night's button), a messenger's browser */
    'night.load.model':'Getting the hand model ready…',
    'night.load.modelP':'Getting the hand model ready… {p} %',
    'night.load.warm':'Almost ready…',
    'night.load.camera':'Starting the camera…',
    'night.load.modelFail':'The hand model did not finish loading. Check the connection, then tap {again}.',
    'night.load.noAudio':'This browser cannot play sound, so Night cannot start here. Open this page in Safari or Chrome.',   // SAFARI-1: a browser without Web Audio
    'night.cam.denied.phone':'The camera is blocked for this page. Open this browser’s settings for the site (the icon next to the address, or the menu), allow the camera, then tap {begin} again.',
    'night.cam.denied.pc':'Camera access is blocked for this page. Click the camera or lock icon in the address bar, allow the camera, then press {begin} again.',
    'night.cam.busy.phone':'The camera is busy. Close other apps that use it, then tap {begin} again.',
    'night.cam.busy.pc':'The camera is busy or not responding. Close Zoom and other apps that use the camera, then press {begin} again.',
    'night.cam.notfound.phone':'No camera found. Check that this browser may use the camera, then tap {begin} again.',
    'night.cam.notfound.pc':'No camera found. Check that the camera is switched on (some laptops have a camera key) and connected, then press {begin} again.',
    'night.cam.inapp':'This app’s browser did not let the page use the camera.',
    'night.inapp.android':'This page is open inside an app, which may not give it the camera. Open it in Chrome: the app’s menu, then “Open in browser” — or copy the link and paste it into Chrome.',
    'night.inapp.ios':'This page is open inside an app, which may not give it the camera. Open it in Safari: the app’s menu or share button, then “Open in Safari” — or copy the link and paste it into Safari.',
    'night.inapp.other':'This page is open inside an app, which may not give it the camera. Open it in Chrome or Safari: copy the link and paste it there.',
    'night.inapp.copy':'Copy link', 'night.inapp.copied':'Link copied', 'night.load.reload':'Reload',
    /* NIGHT-11 part 4: the coaching line (one at a time, in context) */
    'night.coach.raise':'Raise a hand',
    'night.coach.pinch':'Touch your thumb to your first finger',
    'night.coach.fingers':'Try the other fingers. Raise your hand for higher notes.',
    'night.coach.depth':'Move your hand away from the camera: the sound opens.',
    'night.coach.calib':'Make the sound follow your hand more closely? About 10 seconds.',
    'night.coach.calibYes':'Set up', 'night.coach.calibNo':'Not now',
    'night.coach.home':'For full screen: tap Share, then “Add to Home Screen”.',
    /* NIGHT-11 part 5 */
    'night.q.crashNote':'The picture opened at Standard: last time Detailed seemed too heavy for this device.',
    'night.howTo':'How to play', 'night.licences':'Licences',
    /* STATS-1: the visit counter in the privacy notice; Write to us */
    'night.privacyCount':'We count visits anonymously: no cookies, no camera data, no personal data.',
    'night.privacyBody':'Your camera picture, your sound and your hand movements stay on this device: hand tracking runs inside the browser, and the app sends none of it anywhere. The app downloads only its own files and the hand model, from this same site.',   // LANG-1: Night's own (the shared text still names the CDN, gone since CORE-22)
    'night.write':'Write to us', 'night.write.copy':'Copy address', 'night.write.copied':'Address copied', 'night.write.mail':'Open mail app',
    /* DESIGN-1 part C: the settings' three tabs, the «More» line, short labels with their notes under them */
    'night.tab.sound':'Sound', 'night.tab.picture':'Picture', 'night.tab.hands':'Hands',
    'night.set.answer':'Music answers my notes', 'night.set.answerNote':'Its next chord leans toward what I played.',
    'night.q.detailedShort':'Detailed',
    'night.set.quality':'Quality', 'night.q.light':'Light',   // NIGHT-16: one quality choice
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
    'night.card.rainNear.t':'Near: the glass',   // RAIN-R1: the rain's cards and lines
    'night.card.rainNear.b':'Bring your playing hand close to the camera: you are at the glass. Hold the touch and move — your finger wipes the mist away. Each note clears a little spot.',
    'night.card.rainFar.t':'Far: the city',
    'night.card.rainFar.b':'Move your hand away: the city comes into focus. Point at a window and play — it lights up. Farther away, you hear more of the street.',
    'night.card.rainFx.t':'Your other hand',
    'night.card.rainFx.b':'Your other hand shapes the sound: touch a finger to your thumb and move it up or down — index Echo, middle Warm or Bright, ring Wave: more cars on the street. It stays where you leave it.',
    'night.rain.coach.depth':'Close to the camera: wipe the glass. Farther away: light a window.',
    'night.rain.fxHint':'Your other hand: touch a finger to your thumb and move it — index Echo, middle Warm or Bright, ring Wave: more cars below.',
    'night.card.home.t':'Full screen',
    'night.card.home.b':'On iPhone and iPad, full screen comes from the Home Screen: tap Share, then “Add to Home Screen”. Handsong Night then opens from its own icon, without Safari’s bars.',
    'night.fs.enter':'Full screen',
    'night.fs.exit':'Leave full screen',
    'night.cal.offerB':'One step, about 10 seconds: show the camera the hand you play with. Then the sound will follow its movement more closely.',
    'night.cal.doneB':'Your hand is remembered. Closer to the camera, the sound is near and clear; farther, the space around it opens up and the echo grows.',
  }),
  ru:Object.freeze({
    'night.privacyLine':'Изображение с камеры никогда не покидает это устройство.',
    'night.q.standard':'Обычная',
    'night.q.detailed':'Подробная — для мощных устройств',
    'night.set.camera':'Камера', 'night.cam.front':'Передняя', 'night.cam.back':'Задняя', 'night.cam.n':'Камера {n}',   // NIGHT-10
    'night.audio.tap':'Коснитесь, чтобы продолжить',   // NIGHT-11
    'night.update.ready':'Готова новая версия. Коснитесь, чтобы открыть её.',   // NIGHT-14
    'night.cam.lost':'Камера остановилась. Закройте другие приложения, которые её используют, и коснитесь здесь, чтобы попробовать снова.',
    /* NIGHT-11 part 2 */
    'night.load.model':'Готовлю модель рук…',
    'night.load.modelP':'Готовлю модель рук… {p} %',
    'night.load.warm':'Почти готово…',
    'night.load.camera':'Включаю камеру…',
    'night.load.modelFail':'Модель рук не загрузилась до конца. Проверьте связь и нажмите «{again}».',
    'night.load.noAudio':'Этот браузер не умеет играть звук, поэтому Handsong Night здесь не запустится. Откройте страницу в Safari или Chrome.',
    'night.cam.denied.phone':'Камера для этой страницы запрещена. Откройте настройки сайта в браузере (значок рядом с адресом или меню), разрешите камеру и снова нажмите «{begin}».',
    'night.cam.denied.pc':'Доступ к камере для этой страницы запрещён. Нажмите значок камеры или замка в адресной строке, разрешите камеру и снова нажмите «{begin}».',
    'night.cam.busy.phone':'Камера занята. Закройте другие приложения, которые её используют, и снова нажмите «{begin}».',
    'night.cam.busy.pc':'Камера занята или не отвечает. Закройте Zoom и другие программы, которые используют камеру, и снова нажмите «{begin}».',
    'night.cam.notfound.phone':'Камера не найдена. Проверьте, что этому браузеру разрешена камера, и снова нажмите «{begin}».',
    'night.cam.notfound.pc':'Камера не найдена. Проверьте, что камера включена (на некоторых ноутбуках есть клавиша камеры) и подключена, и снова нажмите «{begin}».',
    'night.cam.inapp':'Браузер этого приложения не дал странице камеру.',
    'night.inapp.android':'Страница открыта внутри приложения, а оно может не дать ей камеру. Откройте её в Chrome: меню приложения, затем «Открыть в браузере» — или скопируйте ссылку и вставьте её в Chrome.',
    'night.inapp.ios':'Страница открыта внутри приложения, а оно может не дать ей камеру. Откройте её в Safari: меню или кнопка «Поделиться» приложения, затем «Открыть в Safari» — или скопируйте ссылку и вставьте её в Safari.',
    'night.inapp.other':'Страница открыта внутри приложения, а оно может не дать ей камеру. Откройте её в Chrome или Safari: скопируйте ссылку и вставьте её туда.',
    'night.inapp.copy':'Скопировать ссылку', 'night.inapp.copied':'Ссылка скопирована', 'night.load.reload':'Перезагрузить',
    /* NIGHT-11 part 4 */
    'night.coach.raise':'Поднимите руку',
    'night.coach.pinch':'Коснитесь большим пальцем указательного',
    'night.coach.fingers':'Попробуйте другие пальцы. Рука выше — ноты выше.',
    'night.coach.depth':'Отведите руку дальше от камеры — звук раскроется.',
    'night.coach.calib':'Настроить, чтобы звук точнее следовал за рукой? Около 10 секунд.',
    'night.coach.calibYes':'Настроить', 'night.coach.calibNo':'Не сейчас',
    'night.coach.home':'Во весь экран: «Поделиться», затем «На экран „Домой“».',
    /* NIGHT-11 part 5 */
    'night.q.crashNote':'Картинка открылась как «Обычная»: в прошлый раз «Подробная» оказалась слишком тяжёлой для этого устройства.',
    'night.howTo':'Как играть', 'night.licences':'Лицензии',
    'night.privacyCount':'Мы анонимно считаем посещения: без cookie, без данных камеры, без личных данных.',
    'night.privacyBody':'Изображение с камеры, ваш звук и движения рук остаются на этом устройстве: распознавание рук идёт внутри браузера, и приложение ничего из этого никуда не отправляет. Приложение загружает только свои файлы и модель рук — с этого же сайта.',
    'night.write':'Написать нам', 'night.write.copy':'Скопировать адрес', 'night.write.copied':'Адрес скопирован', 'night.write.mail':'Открыть почту',
    'night.tab.sound':'Звук', 'night.tab.picture':'Картинка', 'night.tab.hands':'Руки',
    'night.set.answer':'Музыка отвечает моим нотам', 'night.set.answerNote':'Её следующий аккорд склоняется к сыгранному.',
    'night.q.detailedShort':'Подробная',
    'night.set.quality':'Качество', 'night.q.light':'Лёгкая',
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
    'night.card.rainNear.t':'Близко: стекло',
    'night.card.rainNear.b':'Поднесите играющую руку ближе к камере — вы у самого стекла. Держите касание и ведите — палец стирает туман. Каждая нота протирает пятнышко.',
    'night.card.rainFar.t':'Далеко: город',
    'night.card.rainFar.b':'Отведите руку дальше — город становится резким. Наведите на окно и сыграйте — оно загорится. Чем дальше рука, тем больше слышно улицу.',
    'night.card.rainFx.t':'Вторая рука',
    'night.card.rainFx.b':'Другая рука меняет звук: прижмите палец к большому и ведите вверх или вниз — указательный: эхо, средний: тепло или яркость, безымянный: волна — больше машин на улице. Звук остаётся, где вы его оставили.',
    'night.rain.coach.depth':'Ближе к камере — протрите стекло. Дальше — зажгите окно.',
    'night.rain.fxHint':'Вторая рука: прижмите палец к большому и ведите — указательный: эхо, средний: тепло или яркость, безымянный: волна — больше машин внизу.',
    'night.card.home.t':'Во весь экран',
    'night.card.home.b':'На iPhone и iPad весь экран даёт экран «Домой»: нажмите «Поделиться», затем «На экран „Домой“». Тогда Handsong Night откроется со своего значка, без панелей Safari.',
    'night.fs.enter':'Во весь экран',
    'night.fs.exit':'Выйти из полноэкранного режима',
    'night.cal.offerB':'Один шаг, около 10 секунд: покажите камере руку, которой играете. Тогда звук будет точнее следовать за её движением.',
    'night.cal.doneB':'Рука запомнена. Ближе к камере — звук рядом и чище; дальше — вокруг него больше простора и эха.',
  }),
});
for(const [lang, T] of Object.entries(NIGHT_TEXTS)) if(DICTS[lang]) Object.assign(DICTS[lang], T);
/* LANG-1: the six languages join after English and Russian (the order of the menu); the first visit then follows the device's language (core
   langsAdd reads the choice again with them); a stored choice stays */
export const NIGHT_LANGS=Object.freeze({ es:ES, pt:PT, de:DE, fr:FR, it:IT, ka:KA });
langsAdd(Object.keys(NIGHT_LANGS));
for(const [lang, T] of Object.entries(NIGHT_LANGS)) Object.assign(DICTS[lang], T);
