/* ================= ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n) — ЭТАП 0: только каркас =================
   English по умолчанию + Русский; форма механизма РАССЧИТАНА на четыре языка (en/ru/es/de), но
   словари es/de пока НЕ заводим (музыкальную терминологию на них проверить некому — ложная
   локализация читалась бы носителями как ошибки). Добавить язык позже = добавить его в LANGS и
   завести словарь, механизм не трогая.

   ЭТАП 0 НЕ ПЕРЕНОСИТ НИ ОДНОЙ строки: словари пусты, поэтому t() всегда падает на фолбэк
   (существующий русский текст в разметке/коде), а L() пропускает строки как есть. Приложение выглядит
   и ведёт себя РОВНО как сегодня. Переключатель уже есть, выбор сохраняется и переживает перезагрузку,
   на свежем профиле язык угадывается из браузера. Перенос строк — этапы A/B/C.

   Комментарии — на русском (политика языка комментариев не менялась; интернационализируем только
   ВИДИМЫЕ ПОЛЬЗОВАТЕЛЮ строки). */

/* store — обёртка над localStorage с try/catch. Приватный режим и file:// НЕ должны ронять старт:
   при недоступности localStorage тихо падаем на хранилище В ПАМЯТИ (переживёт сессию, но не
   перезагрузку — приемлемо, лучше, чем исключение на старте). */
const MEM = {};
export const store = {
  get(k){ try{ const v = localStorage.getItem(k); return v===null ? (k in MEM ? MEM[k] : null) : v; }
          catch(e){ return k in MEM ? MEM[k] : null; } },
  set(k,v){ try{ localStorage.setItem(k, v); }catch(e){ MEM[k] = v; } },
};

/* Доступные языки (порядок = порядок в переключателе). es/de готовы ПО ФОРМЕ (см. LANG_LABEL, L()),
   но пока не включены. English — умолчание. */
export const LANGS = ['en','ru'];
/* Эндонимы — самоназвания языков (каждый на своём языке), для подписи опций переключателя. Держим все
   четыре: пригодятся, когда es/de войдут; на выбор влияет только LANGS. */
export const LANG_LABEL = { en:'English', ru:'Русский', es:'Español', de:'Deutsch' };

/* СЛОВАРИ — key → строка, по языку. ЭТАП A: перенесён ИНТЕРФЕЙСНЫЙ ХРОМ (кнопки/подписи/подсказки/
   тосты/статус/ярлыки холста). English — ОСНОВНОЙ текст (по нему читает большинство), ru — перевод.
   МУЗЫКАЛЬНЫЕ ДАННЫЕ (имена ладов/традиций/групп/аккордов/свар/тембров/аранжировки) — ЭТАП B, их здесь
   НЕТ. es/de пусты (терминологию проверить некому). Неизвестный ключ → en → params.def → сам ключ. */
export const DICTS = {
  en: {
    // приложение / стартовая карточка
    'app.title':'Handsong — gesture synth & interactive tunings tutorial',
    'start.tag':'A gesture synth: play with your hands in front of the camera.',
    'start.play':'▶ Play',
    'start.learn':'Learn',
    'start.learnTitle':'Interactive lessons (coming soon)',
    'start.learnSoon':'Interactive lessons are coming soon.',
    'foot.feedbackText':'First version — bugs and rough edges are likely. Tell me what breaks:',
    'foot.feedbackLink':'Feedback',
    'foot.emailLink':'Email me',
    'foot.supportText':'Handsong is made by one person, in spare time, and free for everyone. If you’d like to support its development:',
    'foot.donateLink':'Donate',
    // установка (PWA)
    'install.btn':'⬇ Install',
    'install.title':'Add Handsong to your home screen',
    'install.ios':'To install: tap Share, then “Add to Home Screen”.',
    'install.hint':'add Handsong to your home screen',
    // полноэкранный режим
    'fs.title.enter':'Fullscreen: hide the browser bars',
    'fs.title.exit':'Exit fullscreen',
    'fs.start.enter':'⛶ Fullscreen',
    'fs.start.exit':'⛶ Exit fullscreen',
    // загрузка / ошибка старта (стартовая карточка)
    'load.model':'Loading the hand-tracking model…',
    'load.camera':'Starting the camera…',
    'load.error':'Couldn’t start: {msg}. Check camera access and that the page is served over https.',
    // верхняя панель
    'bar.scale':'Scale',
    'bar.scaleTitle':'Scale: mode, tonic, timbres',
    'bar.instrTitle':'Solo / Chords',
    'bar.halfLTitle':'Left half: instrument',
    'bar.halfRTitle':'Right half: instrument',
    'bar.splitTitle':'Split screen: chords | solo on two halves',
    'bar.camTitle':'Switch camera: front / back',
    'bar.loop':'⚙ Loop',
    'bar.loopTitle':'Looper panel: bars, tempo, arrangement',
    // роли (кнопка роли, свёрнутый бар — держим коротко)
    'role.ld':'🎸 Solo',
    'role.ch':'🎹 Chords',
    'role.bs':'🎚 Bass',
    'role.dr':'🥁 Drums',
    // сплит / камера (тосты и динамические подсказки)
    'split.on':'Split screen ON — tap to turn off',
    'split.off':'Split screen: two roles on two halves',
    'cam.unavailable':'Second camera unavailable',
    // запись клипа / аудио
    'clip.title.rec':'Recording clip — tap to stop and save',
    'clip.title.idle':'Record clip: video + sound in one file (WebM; social apps may want MP4 — you’d need to convert)',
    'clip.saving':'Saving clip…',
    'clip.recording':'● Recording clip',
    'clip.errPrefix':'Clip: ',
    'audio.title.rec':'Recording audio — tap to stop and save',
    'audio.title.idle':'Record audio: sound only to a file (WebM/Opus; Safari may give mp4)',
    'audio.saving':'Saving audio…',
    'audio.recording':'● Recording audio',
    'audio.errPrefix':'Audio: ',
    // джем
    'jam.label':'🎵 Jam',
    'jam.title.on':'Jam playing — tap to switch variant (turns off at the end)',
    'jam.title.off':'Jam: a backing for the tuning — tap to start, next tap switches variant',
    'jam.sizeMismatch':'Jam: the loop has a different metre — clear it (✕)',
    // кнопка записи ● (лупер)
    'rec.title.recFirst':'Recording the loop — tap to stop',
    'rec.title.overdub':'Overdubbing layer {n} — tap to stop',
    'rec.title.armed':'Loop playing — tap to start a new layer',
    'rec.title.idle':'Record: tap for a one-bar count-in, then the loop',
    // транспорт лупера
    'transport.loopPlay':'⟳ loop',
    'transport.loopPause':'❚❚ loop',
    'transport.loopTitle':'Loop: play / pause',
    'transport.undoTitle':'Remove the last layer',
    'transport.clearTitle':'Clear the loop',
    'transport.panicTitle':'Silence everything',
    // панель звукоряда
    'panel.collapse':'Collapse ✕',
    'panel.scale.head':'Scale',
    'panel.scale.sepScale':'Scale & tonic',
    'panel.scale.tradition':'Tradition',
    'panel.scale.mode':'Scale',
    'panel.scale.tonic':'Tonic',
    'panel.scale.aref':'A4 reference',
    'panel.scale.arefHint':'A single reference pitch is a 20th-century invention: before it, every town and church tuned its own way; baroque ensembles still play at 415.',
    'panel.scale.chords':'Chords',
    'panel.scale.triads':'Triads',
    'panel.scale.sevenths':'Sevenths',
    'panel.scale.sepTimbre':'Timbres',
    'panel.scale.leadInstr':'Solo instrument',
    'panel.scale.chordInstr':'Chord instrument',
    'panel.scale.bassInstr':'Bass instrument',
    'panel.scale.drumKit':'Drum kit',
    'panel.scale.handFn':'Hand functions',
    'aref.415':'415 · baroque',
    'aref.440':'440 · modern standard',
    'aref.444':'444 · orchestral',
    'unit.hz':'Hz',
    // панель лупера
    'panel.loop.head':'Looper',
    'panel.loop.sepLoop':'Loop (looper)',
    'panel.loop.length':'Length (bars)',
    'panel.loop.metre':'Metre (beats)',
    'panel.loop.tempo':'Tempo (BPM)',
    'panel.loop.quant':'Quantize',
    'panel.loop.hint':'Length and metre can be changed only on an empty loop.',
    'panel.loop.sepArr':'Arrangement (layers)',
    'panel.loop.harmony':'Harmony',
    'panel.loop.rhythm':'Rhythm',
    'panel.loop.bassMode':'Bass part',
    'panel.loop.addLayers':'＋ Add layers',
    'common.on':'On',
    'common.off':'Off',
    // функции рук
    'handfn.fx':'Effects',
    'handfn.note':'Notes (continuous)',
    'handfn.hold':'Notes (held)',
    'handfn.therm':'Theremin',
    'handfn.expr':'Expression',
    'handfn.loop':'Looper (control)',
    'handfn.latch':'Chords (latch)',
    'handfn.chHold':'Chords (held)',
    'hand.left':'Left hand',
    'hand.right':'Right hand',
    // холст: статус-строка ({name} — имя лада, локализуется на этапе B)
    'status.centsScale':'Scale: {name} · cents tuning · {n} steps',
    'status.edoScale':'Scale: {name} · {edo}-TET · steps: {steps}',
    'status.step':' · step {c}c',
    'status.recPrefix':'● recording · ',
    'status.loopPrefix':'▶ loop · {bpm} BPM · ',
    // холст: коробка лупера
    'looper.count':'COUNT-IN  {n}',
    'looper.recFirst':'● RECORDING · {n}-bar loop',
    'looper.overdub':'● OVERDUB · layer {n}',
    'looper.playing':'▶ LOOP · {bars} bars · {layers} layers',
    'looper.paused':'LOOP · {bars} bars · {layers} layers · “⟳ loop” to play',
    'looper.clear':'CLEAR',
    // холст: подсказка «нет аккордов» (макам) — держим строки короткими под ширину поля
    'nochords.title':'NO CHORDS',
    'nochords.l1':'Chords aren’t built in a maqam.',
    'nochords.l2':'Use the drone in the looper; record',
    'nochords.l3':'chords in another scale and play over it.',
    // холст: рука-лупер
    'hand.looper':'LOOPER',
    'looper.handHint':'index=record · middle=play · ring=undo · pinky=clear',
    // холст: короткие индикаторы (узкие столбики — токены той же длины, что и в ru)
    'ind.bright':'BRT',
    'ind.expr':'EXP',
    'hand.expr':'EXP',
    // холст: слово-регистр
    'reg.oct':'oct',
    'reg.octaveFull':'OCTAVE',
    'reg.tritave':'tritave',
    'reg.reg':'reg',
    // холст: ярлыки нот
    'tag.gliss':'glissando',
    'tag.step':'step',
    'tag.hold':'held',
    'tag.octHint':'finger I–IV → register (now {r})',
    // холст: полные имена эффектов
    'fx.dly':'Delay',
    'fx.vib':'Vibrato',
    'fx.drv':'Drive',
    'fx.trm':'Tremolo',
    // сообщения руки-лупера (подтверждения команд)
    'msg.recording':'● Recording',
    'msg.overdub':'● Overdub',
    'msg.recStop':'Recording stopped',
    'msg.noLoop':'No loop',
    'msg.play':'▶ Play',
    'msg.pause':'⏸ Pause',
    'msg.noLayers':'No layers',
    'msg.undo':'↶ Undo layer',
    'msg.alreadyEmpty':'Already empty',
    'msg.cleared':'✕ Cleared',
    'msg.clearCancelled':'Clear cancelled',
    // ошибки записи (clip)
    'err.noRecorder':'Recording isn’t supported by this browser',
    'err.noCapture':'captureStream isn’t supported by this browser',
    'err.noAudio':'Sound hasn’t started yet',
    'err.recStartPrefix':'Couldn’t start recording: ',
    // демо (стартовый оверлей)
    'demo.hint':'The same motif in six tunings — hear how the tuning changes.',
    'demo.skip':'Skip ✕',
    // обучение (интерактивный тур поверх реальной игры)
    'tutor.step1.prompt':'Touch the tip of your right thumb to the tip of your index finger — a note plays.',
    'tutor.step1.detail':'Notes come from your right hand — the left hand is for effects. Touch the tip of your right thumb to the tip of your index finger and hold them together until you hear a note.',
    'tutor.step2.prompt':'Now move your hand up and down. The pitch follows.',
    'tutor.step2.detail':'Keep your thumb and index finger touching and slide your hand higher, then lower. Higher hand, higher note.',
    'tutor.step3.prompt':'Touch your thumb to a different fingertip — your middle or ring finger — for a different octave.',
    'tutor.step3.detail':'Touch the tip of your thumb to another fingertip. Your index, middle, ring and little finger each reach a higher octave.',
    'tutor.step4.prompt':'Your left hand controls effects. Touch its thumb and index finger together and move up or down.',
    'tutor.step4.detail':'With your left hand, touch your thumb to a fingertip over the bars at the left edge, then slide up and down — you\'ll hear delay, vibrato and more.',
    'tutor.step5.prompt':'Tap the button at the top and switch to Chords.',
    'tutor.step5.detail':'The button at the top of the screen cycles Solo → Chords → Bass → Drums. Tap it until it reads Chords.',
    'tutor.step6.prompt':'Touch your thumb and index finger together to play a chord. Move your hand to change it.',
    'tutor.step6.detail':'Touch the tip of your thumb to a fingertip — a whole chord sounds. Move up and down for other chords.',
    'tutor.final.prompt':'That\'s the core — notes, pitch, octaves and the sound itself; and there are 75 tunings waiting in the scale menu whenever you like.',
    // обучение — урок «Аккорды»
    'tutor.chSwitch.prompt':'We\'ve set the scale to Chromatic so every chord type is available. Tap the top button to switch to Chords, then touch your thumb and index finger together to play one.',
    'tutor.chSwitch.detail':'The role button at the top cycles Solo → Chords → Bass → Drums — set it to Chords. Then touch the tip of your thumb to a fingertip and a whole chord sounds.',
    'tutor.chLatch.prompt':'Play a chord, then open your fingers — the chord keeps playing. That\'s on purpose: it frees your hand to do something else while the chord rings.',
    'tutor.chLatch.detail':'Touch your thumb and index finger together to sound a chord, then open your fingers — the chord stays. Touch the same spot again and it stops. This is what lets one hand hold a chord while the other plays.',
    'tutor.chRow.prompt':'Now touch your thumb and index finger together at a different height for a different chord — the root follows your hand, just like single notes did.',
    'tutor.chRow.detail':'Raise or lower your hand and touch your thumb and index finger together again. Each height gives a different chord root, exactly the way pitch tracked your hand in the Basics lesson.',
    'tutor.chPalette.prompt':'On the left is a palette of chord types. Touch your thumb and index finger together there to pick one — a plain triad, a seventh — and hear the chord change.',
    'tutor.chPalette.detail':'With your thumb and index finger touching, choose a type from the grid on the left, then play on the right. In these tunings the chord types aren\'t the ones a piano has — that\'s why they get their own palette.',
    'tutor.chHold.prompt':'One last thing: a chord hand can be set to stop its chord the moment your fingers open, instead of leaving it ringing. You choose this per hand in the scale menu, under Hand functions — leaving it ringing is the default, because it frees a hand.',
    // обучение — урок «Строи и тембры»
    'tutor.tunOpen.prompt':'Open the scale menu — the button at the top showing the current scale. Everything about pitch lives here.',
    'tutor.tunOpen.detail':'Tap the button at the top of the screen that shows the scale\'s name and note. It opens the menu where you choose which notes the instrument plays.',
    'tutor.tunFamiliar.prompt':'In the Scale list, pick something from “Familiar” — Major, say — then close the menu and play. This is the ground you already know.',
    'tutor.tunFamiliar.detail':'Open the Scale dropdown, choose a scale under “Familiar” (like Major or Dorian), close the menu, and play a few notes. These are the twelve notes most Western music is built from.',
    'tutor.tunJump.prompt':'Now the real point. Set Tradition to “Java & the Far East”, pick “Pelog”, and play the very same motion — your hand does the same thing, but the world it lands in is completely different.',
    'tutor.tunJump.detail':'Open the menu, switch Tradition to “Java & the Far East”, choose “Pelog” in the Scale list, close the menu and play. The steps between notes are uneven and unlike a piano — that\'s a real gamelan tuning, not an effect.',
    'tutor.tunCents.prompt':'As you play, the tag at the bottom shows each note in Hz and in cents. A cent is a hundredth of the gap between two neighbouring piano keys — so a hundred cents is one key.',
    'tutor.tunCents.detail':'They\'re there because in this tuning the notes don\'t land where a piano puts them, and the cents let you see exactly where they do. Play a few notes and watch the numbers move.',
    'tutor.tunTimbre.prompt':'Open the menu again and change the Solo instrument — then play and hear the new sound. A few of these are real modelled strings and bells, not recordings.',
    'tutor.tunTimbre.detail':'In the scale menu, find “Solo instrument” and pick a different one; it also holds separate instruments for chords, bass and drums. Some are built from the physics of a plucked string or a struck bell, not sampled.',
    'tutor.tunFinal.prompt':'That\'s the whole idea: the same gesture, seventy-five different worlds of pitch. The twelve notes you grew up with are one choice among many — even the pitch of A is only a convention (415 in baroque times, 440 today), and it lives in this menu too.',
    // обучение — урок «Функции рук»
    'tutor.hfWhere.prompt':'Open the scale menu and scroll to “Hand functions”. Most instruments give each hand one fixed job — here you choose it, and the choice can differ for each role.',
    'tutor.hfWhere.detail':'Tap the scale button at the top, then scroll down to “Hand functions”. Your left and right hand each get a job — notes, holding, effects and more — because two hands on one instrument can share the music in many ways.',
    'tutor.hfHold.prompt':'Set your Right hand to “Notes (held)”, then pinch and play: the note stays where you first pinched even as your hand roams, and stops only when your fingers open.',
    'tutor.hfHold.detail':'In Hand functions, change the Right hand to “Notes (held)”. Pinch a note and move your hand around — the pitch is frozen where you started, the volume still follows your hand, and the note ends when you release.',
    'tutor.hfTherm.prompt':'Now set that same Right hand to “Theremin” and play: there are no steps — the pitch slides smoothly as your hand moves. This is where the instrument stops being a keyboard.',
    'tutor.hfTherm.detail':'Change the Right hand to “Theremin”, then pinch and glide up and down. The pitch is continuous, sliding between the notes instead of jumping to them — like the original theremin, played on thin air.',
    'tutor.hfExpr.prompt':'Set your LEFT hand to “Expression”, keep playing with the right, and move your left hand — the sound comes alive, breathing while the hand moves and going still when it stops.',
    'tutor.hfExpr.detail':'That hand plays no notes; it shapes the sound four ways — moving it breathes life in, an open palm opens the tone, spread fingers roughen it, a tilt adds space. Try the movement now; the other three are yours to discover.',
    'tutor.hfLooper.prompt':'One more job: a hand can be set to “Looper (control)” and run recording, playback and undo by pinching different fingers — no reaching for the screen. The Looper lesson covers it.',
    'tutor.hfLooper.detail':'With “Looper (control)” a hand plays nothing; its fingers become buttons — index records, middle plays or pauses, and so on. You\'ll learn it properly in the Looper lesson.',
    'tutor.hfFinal.prompt':'That\'s the hidden layer: most instruments give each hand one job for life — here you choose. Notes, a held note, sliding pitch, effects, expression, the looper — mix them per hand and per role, however the music wants.',
    // обучение — урок «Лупер»
    'tutor.lpRec.prompt':'Press the ● record button (top right). You\'ll hear a one-bar count-in — four clicks that set the beat — then play a few notes and listen as your loop comes back around.',
    'tutor.lpRec.detail':'Tap ● at the top. First comes a one-bar count-in (four clicks) so you know the tempo; recording starts on the next beat. Play a short phrase — when the bar ends it loops back and plays your phrase again.',
    'tutor.lpLayer.prompt':'A second solo part would just replace the first — solo is a single voice. So stack a different instrument: tap the role button at the top to Chords (or Bass), then press ● and play. It layers over your solo instead of replacing it.',
    'tutor.lpLayer.detail':'Keep the loop playing. Switch the role button at the top to Chords or Bass, press ● to start a new layer, play a part, and press ● again to stop. Solo, chords and bass each have their own voices, so they stack together instead of overwriting each other — that layering is the whole point of a looper.',
    'tutor.lpUndo.prompt':'Made a mess? Press ⤺ in the loop strip to remove the layer you just added. Nothing you record is ever stuck — you can always take the top layer back off.',
    'tutor.lpUndo.detail':'The ⤺ button in the loop transport strip removes the most recent layer. Knowing a mistake costs nothing is what lets you experiment freely.',
    'tutor.lpJam.prompt':'Now the quick way to a backing: tap 🎵 Jam at the top. One tap lays down a part that fits your scale — play over it, and tap again to try another. It picks what suits the tuning: a raga gets a drone, not a drum beat.',
    'tutor.lpJam.detail':'🎵 Jam drops in a ready-made backing built for the current scale — chords and a beat where they fit, a plain drone where a beat would be wrong (as in a raga or gamelan). Each tap switches to the next; play over whatever it lays down.',
    'tutor.lpTempo.prompt':'Open the ⚙ Loop panel at the top — tempo, length, and metre live here. The catch: length and metre only change on an empty loop, so with a loop playing they\'re locked (the metre menu greys out). Clear the loop (✕) first to change them.',
    'tutor.lpTempo.detail':'The ⚙ Loop panel holds the tempo (BPM), the loop\'s length in bars, and the metre. Length and metre can change only on an empty loop — otherwise every recorded note would land in the wrong place — so clear the loop first if you want to change them.',
    'tutor.lpHand.prompt':'One shortcut worth knowing: a hand can be set to run all of this — record, play, undo — by pinching different fingers, without reaching for the screen. You set that up in Hand functions.',
    'tutor.lpFinal.prompt':'That\'s the looper: record a phrase, stack layers, undo freely, or drop in a jam — and build a whole piece by yourself, live.',
    'tutor.noHand':'We can\'t see a hand. Check the camera is on, your hand is in the frame, and the room is lit.',
    'tutor.next':'Next →',
    'tutor.done':'Done',
    'tutor.nextLesson':'Next: {title} →',
    'tutor.donePlay':'Done — let me play',
    'tutor.skip':'Skip',
    // список уроков (меню возможностей инструмента)
    'lessons.title':'Lessons',
    'lessons.free':'Free play',
    'lessons.soon':'Coming soon',
    'lessons.close':'Close ✕',
    'lesson.basics.title':'Basics',
    'lesson.basics.desc':'Pinch to play a note, move for pitch, then chords and effects.',
    'lesson.chords.title':'Chords',
    'lesson.chords.desc':'Chord types, holding a chord, and the chord palette.',
    'lesson.tunings.title':'Tunings & timbres',
    'lesson.tunings.desc':'Explore 75 tunings and reshape the instrument\'s sound.',
    'lesson.looper.title':'The looper',
    'lesson.looper.desc':'Record a loop and stack layers over it.',
    'lesson.handfn.title':'Hand functions',
    'lesson.handfn.desc':'Reassign each hand: notes, effects, theremin, looper.',
    'lesson.split.title':'Two roles at once',
    'lesson.split.desc':'Split the screen so each hand plays its own role.',
  },
  ru: {
    'app.title':'Handsong — жестовый синтезатор и интерактивный учебник ладов',
    'start.tag':'Жестовый синтезатор: играйте руками перед камерой.',
    'start.play':'▶ Играть',
    'start.learn':'Обучение',
    'start.learnTitle':'Интерактивное обучение (скоро)',
    'start.learnSoon':'Интерактивное обучение готовится — скоро.',
    'foot.feedbackText':'Первая версия — баги и шероховатости вероятны. Расскажите, что сломалось:',
    'foot.feedbackLink':'Отзыв',
    'foot.emailLink':'Написать на почту',
    'foot.supportText':'Handsong делает один человек, в свободное время, и бесплатно для всех. Если хотите поддержать разработку:',
    'foot.donateLink':'Поддержать',
    'install.btn':'⬇ Установить',
    'install.title':'Добавить Handsong на домашний экран',
    'install.ios':'Чтобы установить: нажмите «Поделиться», затем «На экран „Домой“».',
    'install.hint':'добавить Handsong на домашний экран',
    'fs.title.enter':'Во весь экран: убрать полосы браузера',
    'fs.title.exit':'Выйти из полноэкранного режима',
    'fs.start.enter':'⛶ Во весь экран',
    'fs.start.exit':'⛶ Свернуть',
    'load.model':'Загружаю модель распознавания рук…',
    'load.camera':'Включаю камеру…',
    'load.error':'Не получилось: {msg}. Проверьте доступ к камере и что страница открыта по https.',
    'bar.scale':'Лад',
    'bar.scaleTitle':'Звукоряд: лад, тоника, тембры',
    'bar.instrTitle':'Соло / Аккорды',
    'bar.halfLTitle':'Левая половина: инструмент',
    'bar.halfRTitle':'Правая половина: инструмент',
    'bar.splitTitle':'Сплит-экран: аккорды | соло на двух половинах',
    'bar.camTitle':'Переключить камеру: фронтальная / тыловая',
    'bar.loop':'⚙ Луп',
    'bar.loopTitle':'Панель лупера: такты, темп, аранжировка',
    'role.ld':'🎸 Соло',
    'role.ch':'🎹 Аккорды',
    'role.bs':'🎚 Бас',
    'role.dr':'🥁 Ударные',
    'split.on':'Сплит-экран ВКЛ — тап выключит',
    'split.off':'Сплит-экран: две роли на двух половинах',
    'cam.unavailable':'Вторая камера недоступна',
    'clip.title.rec':'Идёт запись клипа — тап остановит и сохранит',
    'clip.title.idle':'Запись клипа: видео+звук в один файл (WebM; соцсети могут просить MP4 — понадобится конвертация)',
    'clip.saving':'Сохраняю клип…',
    'clip.recording':'● Идёт запись клипа',
    'clip.errPrefix':'Клип: ',
    'audio.title.rec':'Идёт запись аудио — тап остановит и сохранит',
    'audio.title.idle':'Запись аудио: только звук в файл (WebM/Opus; Safari может дать mp4)',
    'audio.saving':'Сохраняю аудио…',
    'audio.recording':'● Идёт запись аудио',
    'audio.errPrefix':'Аудио: ',
    'jam.label':'🎵 Джем',
    'jam.title.on':'Джем играет — тап сменит вариант (в конце выключит)',
    'jam.title.off':'Джем: подложка по строю — тап включит, следующий тап сменит вариант',
    'jam.sizeMismatch':'Джем: петля другого размера — очистите её (✕)',
    'rec.title.recFirst':'Идёт запись круга — тап остановит',
    'rec.title.overdub':'Наложение слоя {n} — тап остановит',
    'rec.title.armed':'Петля играет — тап начнёт новый слой',
    'rec.title.idle':'Запись: тап — отсчёт такта, затем круг',
    'transport.loopPlay':'⟳ луп',
    'transport.loopPause':'❚❚ луп',
    'transport.loopTitle':'Петля: играть / пауза',
    'transport.undoTitle':'Убрать последний слой',
    'transport.clearTitle':'Очистить петлю',
    'transport.panicTitle':'Заглушить всё',
    'panel.collapse':'Свернуть ✕',
    'panel.scale.head':'Звукоряд',
    'panel.scale.sepScale':'Лад и тоника',
    'panel.scale.tradition':'Строй',
    'panel.scale.mode':'Лад',
    'panel.scale.tonic':'Тоника',
    'panel.scale.aref':'Эталон A4',
    'panel.scale.arefHint':'Единый эталон — изобретение XX века: до него каждый город и церковь настраивались по-своему, барочные ансамбли и сегодня играют на 415.',
    'panel.scale.chords':'Аккорды',
    'panel.scale.triads':'Трезвучия',
    'panel.scale.sevenths':'Септаккорды',
    'panel.scale.sepTimbre':'Тембры',
    'panel.scale.leadInstr':'Соло-инструмент',
    'panel.scale.chordInstr':'Аккорд-инструмент',
    'panel.scale.bassInstr':'Бас-инструмент',
    'panel.scale.drumKit':'Набор ударных',
    'panel.scale.handFn':'Функции рук',
    'aref.415':'415 · барочный',
    'aref.440':'440 · современный стандарт',
    'aref.444':'444 · оркестровый',
    'unit.hz':'Гц',
    'panel.loop.head':'Лупер',
    'panel.loop.sepLoop':'Петля (лупер)',
    'panel.loop.length':'Длина (такты)',
    'panel.loop.metre':'Размер (долей)',
    'panel.loop.tempo':'Темп (BPM)',
    'panel.loop.quant':'Квантизация',
    'panel.loop.hint':'Длину и размер меняют только на пустой петле.',
    'panel.loop.sepArr':'Аранжировка (слои)',
    'panel.loop.harmony':'Гармония',
    'panel.loop.rhythm':'Ритм',
    'panel.loop.bassMode':'Бас-партия',
    'panel.loop.addLayers':'＋ Добавить слои',
    'common.on':'Вкл',
    'common.off':'Выкл',
    'handfn.fx':'Эффекты',
    'handfn.note':'Ноты (непрерывно)',
    'handfn.hold':'Ноты (с удержанием)',
    'handfn.therm':'Терменвокс',
    'handfn.expr':'Выразительность',
    'handfn.loop':'Лупер (управление)',
    'handfn.latch':'Аккорды (защёлка)',
    'handfn.chHold':'Аккорды (с удержанием)',
    'hand.left':'Левая рука',
    'hand.right':'Правая рука',
    'status.centsScale':'Лад: {name} · центовый строй · {n} ступеней',
    'status.edoScale':'Лад: {name} · {edo}-TET · ступени: {steps}',
    'status.step':' · шаг {c}c',
    'status.recPrefix':'● запись · ',
    'status.loopPrefix':'▶ петля · {bpm} BPM · ',
    'looper.count':'ОТСЧЁТ  {n}',
    'looper.recFirst':'● ЗАПИСЬ · круг {n} т.',
    'looper.overdub':'● НАЛОЖЕНИЕ · слой {n}',
    'looper.playing':'▶ ПЕТЛЯ · {bars} т. · слоёв {layers}',
    'looper.paused':'ПЕТЛЯ · {bars} т. · слоёв {layers} · «⟳ луп» играть',
    'looper.clear':'ОЧИСТКА',
    'nochords.title':'АККОРДОВ НЕТ',
    'nochords.l1':'В макаме аккорды не строятся.',
    'nochords.l2':'Дрон — в лупере; аккорды запишите',
    'nochords.l3':'в другом ладу и играйте под макам.',
    'hand.looper':'ЛУПЕР',
    'looper.handHint':'указ.=запись · средн.=пуск · безым.=отмена · мизинец=очистка',
    'ind.bright':'ЯРК',
    'ind.expr':'ВЫР',
    'hand.expr':'ВЫР',
    'reg.oct':'окт',
    'reg.octaveFull':'ОКТАВА',
    'reg.tritave':'тритава',
    'reg.reg':'рег.',
    'tag.gliss':'глиссандо',
    'tag.step':'ступень',
    'tag.hold':'держ.',
    'tag.octHint':'палец I–IV → регистр (сейчас {r})',
    'fx.dly':'Делей',
    'fx.vib':'Вибрато',
    'fx.drv':'Драйв',
    'fx.trm':'Тремоло',
    'msg.recording':'● Запись',
    'msg.overdub':'● Наложение',
    'msg.recStop':'Запись стоп',
    'msg.noLoop':'Нет петли',
    'msg.play':'▶ Пуск',
    'msg.pause':'⏸ Пауза',
    'msg.noLayers':'Нет слоёв',
    'msg.undo':'↶ Отмена слоя',
    'msg.alreadyEmpty':'Уже пусто',
    'msg.cleared':'✕ Очищено',
    'msg.clearCancelled':'Очистка отменена',
    'err.noRecorder':'Запись не поддерживается браузером',
    'err.noCapture':'captureStream не поддерживается браузером',
    'err.noAudio':'Звук ещё не запущен',
    'err.recStartPrefix':'Не удалось начать запись: ',
    'demo.hint':'Один и тот же мотив звучит в шести строях — слушайте, как меняется настройка.',
    'demo.skip':'Пропустить ✕',
    'tutor.step1.prompt':'Коснитесь кончиком большого пальца правой руки кончика указательного — зазвучит нота.',
    'tutor.step1.detail':'Ноты играет правая рука — левая для эффектов. Коснитесь кончиком большого пальца правой руки кончика указательного и держите вместе, пока не услышите ноту.',
    'tutor.step2.prompt':'Теперь двигайте руку вверх и вниз — высота идёт следом.',
    'tutor.step2.detail':'Не размыкая большой и указательный пальцы, ведите руку выше, потом ниже. Выше рука — выше нота.',
    'tutor.step3.prompt':'Коснитесь большим пальцем другого кончика — среднего или безымянного — для другой октавы.',
    'tutor.step3.detail':'Коснитесь кончиком большого пальца другого кончика. Указательный, средний, безымянный и мизинец берут всё более высокую октаву.',
    'tutor.step4.prompt':'Левая рука управляет эффектами. Сведите её большой и указательный пальцы и двигайте вверх или вниз.',
    'tutor.step4.detail':'Левой рукой коснитесь большим пальцем кончика над столбиками у левого края и ведите вверх-вниз — услышите делей, вибрато и другое.',
    'tutor.step5.prompt':'Нажмите кнопку вверху и переключитесь на «Аккорды».',
    'tutor.step5.detail':'Кнопка вверху экрана листает Соло → Аккорды → Бас → Ударные. Нажимайте, пока не появится «Аккорды».',
    'tutor.step6.prompt':'Сведите большой и указательный пальцы — заиграет аккорд. Двигайте руку, чтобы менять его.',
    'tutor.step6.detail':'Коснитесь кончиком большого пальца кончика другого — зазвучит целый аккорд. Двигайте вверх-вниз для других аккордов.',
    'tutor.final.prompt':'Это основа — ноты, высота, октавы и сам звук; а в меню лада ждут 75 строёв, когда захотите.',
    // обучение — урок «Аккорды»
    'tutor.chSwitch.prompt':'Мы поставили лад «Хроматика», чтобы были доступны все типы аккордов. Нажмите кнопку вверху, переключитесь на «Аккорды» и сведите большой и указательный пальцы — заиграет аккорд.',
    'tutor.chSwitch.detail':'Кнопка роли вверху листает Соло → Аккорды → Бас → Ударные — поставьте «Аккорды». Затем коснитесь кончиком большого пальца кончика другого — зазвучит целый аккорд.',
    'tutor.chLatch.prompt':'Сыграйте аккорд и разомкните пальцы — аккорд продолжает звучать. Так задумано: это освобождает руку для другого дела, пока аккорд звучит.',
    'tutor.chLatch.detail':'Сведите большой и указательный пальцы — аккорд зазвучал; разомкните пальцы, аккорд остаётся. Коснитесь в том же месте снова — он выключится. Именно это позволяет одной руке держать аккорд, пока другая играет.',
    'tutor.chRow.prompt':'Теперь сведите большой и указательный пальцы на другой высоте — другой аккорд. Корень идёт за рукой, как раньше отдельные ноты.',
    'tutor.chRow.detail':'Поднимите или опустите руку и снова сведите большой и указательный пальцы. Каждая высота — свой корень аккорда, ровно как высота ноты шла за рукой в «Основах».',
    'tutor.chPalette.prompt':'Слева — палитра типов аккорда. Сведите там большой и указательный пальцы, чтобы выбрать один — трезвучие, септаккорд — и услышьте, как аккорд меняется.',
    'tutor.chPalette.detail':'Сведя большой и указательный пальцы, выберите тип из сетки слева, затем играйте справа. У этих строёв свои типы аккордов — не те, что у рояля, — поэтому им дана палитра.',
    'tutor.chHold.prompt':'Последнее: аккордовой руке можно задать так, чтобы аккорд смолкал, едва разомкнёте пальцы, а не звучал дальше. Это выбирается на руку в меню лада, раздел «Функции рук»; по умолчанию аккорд остаётся звучать, потому что это освобождает руку.',
    // обучение — урок «Строи и тембры»
    'tutor.tunOpen.prompt':'Откройте меню лада — кнопка вверху с названием текущего лада. Здесь всё про высоту звука.',
    'tutor.tunOpen.detail':'Нажмите кнопку вверху экрана с названием лада и нотой. Откроется меню, где выбирают, какие ноты играет инструмент.',
    'tutor.tunFamiliar.prompt':'В списке ладов выберите что-то из «Привычного» — например, Мажор — закройте меню и поиграйте. Это знакомая почва.',
    'tutor.tunFamiliar.detail':'Откройте список ладов, выберите лад из «Привычного» (Мажор, Дорийский), закройте меню и сыграйте несколько нот. Это те двенадцать нот, на которых построена почти вся западная музыка.',
    'tutor.tunJump.prompt':'А теперь главное. Смените строй на «Ява и Дальний Восток», возьмите «Пелог» и повторите то же движение — рука делает то же самое, а мир, в который она попадает, совсем другой.',
    'tutor.tunJump.detail':'Откройте меню, смените строй на «Ява и Дальний Восток», выберите «Пелог» в списке ладов, закройте меню и играйте. Шаги между нотами неравные и не как у рояля — это настоящий строй гамелана, а не эффект.',
    'tutor.tunCents.prompt':'Пока вы играете, плашка внизу показывает каждую ноту в герцах и в центах. Цент — сотая доля расстояния между двумя соседними клавишами рояля, так что сто центов — это одна клавиша.',
    'tutor.tunCents.detail':'Они здесь потому, что в этом строе ноты стоят не там, где их ставит рояль, а центы дают увидеть, где именно. Сыграйте несколько нот и посмотрите, как меняются числа.',
    'tutor.tunTimbre.prompt':'Снова откройте меню и смените «Соло-инструмент» — потом поиграйте и услышьте новый звук. Некоторые из них — настоящие смоделированные струны и колокола, а не записи.',
    'tutor.tunTimbre.detail':'В меню лада найдите «Соло-инструмент» и выберите другой; там же — отдельные инструменты для аккордов, баса и ударных. Часть из них рассчитана из физики щипковой струны или удара колокола, а не записана.',
    'tutor.tunFinal.prompt':'В этом вся идея: то же движение — и семьдесят пять разных миров высоты. Двенадцать нот, на которых вы выросли, — лишь один выбор из многих; даже высота ноты «ля» — только договорённость (415 в барокко, 440 сегодня), и она тоже живёт в этом меню.',
    // обучение — урок «Функции рук»
    'tutor.hfWhere.prompt':'Откройте меню лада и пролистайте до «Функции рук». Обычно у каждого инструмента рука имеет одну работу навсегда — здесь работу выбираете вы, и для каждой роли она может быть разной.',
    'tutor.hfWhere.detail':'Нажмите кнопку лада вверху и пролистайте вниз до «Функции рук». Левая и правая рука получают свою работу — ноты, удержание, эффекты и другое — потому что две руки на одном инструменте могут делить музыку по-разному.',
    'tutor.hfHold.prompt':'Поставьте ПРАВУЮ руку на «Ноты (с удержанием)», затем щипок и игра: нота остаётся там, где вы её взяли, даже когда рука уходит, и смолкает только с размыканием пальцев.',
    'tutor.hfHold.detail':'В «Функциях рук» смените Правую руку на «Ноты (с удержанием)». Возьмите ноту щипком и двигайте рукой — высота застыла на старте, громкость всё ещё идёт за рукой, а нота гаснет при размыкании.',
    'tutor.hfTherm.prompt':'Теперь поставьте ту же ПРАВУЮ руку на «Терменвокс» и играйте: ступеней нет — высота плавно скользит за рукой. Здесь инструмент перестаёт быть клавиатурой.',
    'tutor.hfTherm.detail':'Смените Правую руку на «Терменвокс», затем щипок и ведите руку вверх-вниз. Высота непрерывна, скользит между нотами, а не прыгает по ним — как настоящий терменвокс, игра по воздуху.',
    'tutor.hfExpr.prompt':'Поставьте ЛЕВУЮ руку на «Выразительность», продолжайте играть правой и двигайте левой — звук оживает, дышит, пока рука движется, и замирает, когда она стоит.',
    'tutor.hfExpr.detail':'Эта рука нот не играет; она лепит звук четырьмя способами — движение вдыхает жизнь, раскрытая ладонь раскрывает тембр, растопыренные пальцы делают его грязнее, наклон добавляет пространства. Попробуйте сейчас движение; остальные три — на самостоятельное открытие.',
    'tutor.hfLooper.prompt':'Ещё одна работа: руку можно поставить на «Лупер (управление)» и вести запись, воспроизведение и отмену щипками разных пальцев — не тянясь к экрану. Об этом — урок «Лупер».',
    'tutor.hfLooper.detail':'На «Лупере (управление)» рука ничего не играет; её пальцы становятся кнопками — указательный пишет, средний играет/ставит паузу и так далее. Подробно — в уроке «Лупер».',
    'tutor.hfFinal.prompt':'Это и есть скрытый слой: обычно инструмент даёт каждой руке одну работу на всю жизнь — здесь выбираете вы. Ноты, удержанная нота, скользящая высота, эффекты, выразительность, лупер — смешивайте их на руку и на роль, как захочет музыка.',
    // обучение — урок «Лупер»
    'tutor.lpRec.prompt':'Нажмите кнопку записи ● (вверху справа). Сначала — отсчёт в один такт, четыре щелчка, задающие темп, — потом сыграйте несколько нот и послушайте, как ваш круг возвращается снова.',
    'tutor.lpRec.detail':'Нажмите ● вверху. Сначала идёт отсчёт в один такт (четыре щелчка), чтобы вы знали темп; запись начинается со следующей доли. Сыграйте короткую фразу — в конце такта круг завернётся и сыграет её снова.',
    'tutor.lpLayer.prompt':'Второй соло-слой просто заменил бы первый — соло это один голос. Поэтому наложите ДРУГОЙ инструмент: кнопкой роли вверху переключитесь на Аккорды (или Бас), нажмите ● и играйте. Он ложится поверх соло, а не вытесняет его.',
    'tutor.lpLayer.detail':'Пусть петля играет. Переключите кнопку роли вверху на Аккорды или Бас, нажмите ● для нового слоя, сыграйте партию и нажмите ● снова, чтобы остановить. У соло, аккордов и баса свои голоса, поэтому они складываются, а не затирают друг друга — ради этого наложения лупер и нужен.',
    'tutor.lpUndo.prompt':'Напутали? Нажмите ⤺ в полосе лупера, чтобы снять только что добавленный слой. Записанное никогда не застревает — верхний слой всегда можно снять.',
    'tutor.lpUndo.detail':'Кнопка ⤺ в полосе транспорта лупера снимает самый последний слой. Знание, что ошибка ничего не стоит, и позволяет свободно пробовать.',
    'tutor.lpJam.prompt':'Быстрый путь к подложке: нажмите 🎵 Джем вверху. Один тап кладёт партию под ваш лад — играйте поверх, тап ещё раз — другой вариант. Он выбирает уместное строю: раге достаётся дрон, а не барабанный бит.',
    'tutor.lpJam.detail':'🎵 Джем добавляет готовую подложку под текущий лад — аккорды и бит там, где они уместны, простой дрон там, где бит был бы неуместен (как в раге или гамелане). Каждый тап — следующий вариант; играйте поверх того, что он положил.',
    'tutor.lpTempo.prompt':'Откройте панель ⚙ Луп вверху — здесь темп, длина и размер. Загвоздка: длину и размер меняют только на пустой петле, поэтому пока петля играет, они заблокированы (меню размера становится серым). Сначала очистите петлю (✕).',
    'tutor.lpTempo.detail':'Панель ⚙ Луп держит темп (BPM), длину петли в тактах и размер. Длину и размер можно менять только на пустой петле — иначе каждая записанная нота встала бы не на своё место, — так что сначала очистите петлю.',
    'tutor.lpHand.prompt':'Ещё один приём: руку можно поставить так, чтобы она вела всё это — запись, пуск, отмену — щипками разных пальцев, не тянясь к экрану. Это настраивается в «Функциях рук».',
    'tutor.lpFinal.prompt':'Это и есть лупер: записать фразу, копить слои, свободно отменять или бросить джем — и собрать целую пьесу в одиночку, вживую.',
    'tutor.noHand':'Не видим руку. Проверьте, что камера включена, рука в кадре и в комнате светло.',
    'tutor.next':'Дальше →',
    'tutor.done':'Готово',
    'tutor.nextLesson':'Дальше: {title} →',
    'tutor.donePlay':'Готово — играть',
    'tutor.skip':'Пропустить',
    'lessons.title':'Уроки',
    'lessons.free':'Свободная игра',
    'lessons.soon':'Скоро',
    'lessons.close':'Закрыть ✕',
    'lesson.basics.title':'Основы',
    'lesson.basics.desc':'Щипок — нота, движение — высота, затем аккорды и эффекты.',
    'lesson.chords.title':'Аккорды',
    'lesson.chords.desc':'Типы аккордов, удержание и палитра аккордов.',
    'lesson.tunings.title':'Строи и тембры',
    'lesson.tunings.desc':'75 строёв и смена звучания инструмента.',
    'lesson.looper.title':'Лупер',
    'lesson.looper.desc':'Запишите петлю и наложите слои.',
    'lesson.handfn.title':'Функции рук',
    'lesson.handfn.desc':'Назначьте каждой руке: ноты, эффекты, терменвокс, лупер.',
    'lesson.split.title':'Две роли сразу',
    'lesson.split.desc':'Разделите экран — каждая рука играет свою роль.',
  },
  es: {}, de: {},
};

const LS_KEY = 'handsong.lang';

/* Язык браузера → один из доступных (по первым двум буквам, navigator.languages в порядке
   предпочтения); не совпало ни с одним — en. */
function detectLang(){
  const list = (navigator.languages && navigator.languages.length) ? navigator.languages
             : [navigator.language || ''];
  for(const l of list){ const code = String(l).toLowerCase().slice(0,2); if(LANGS.includes(code)) return code; }
  return 'en';
}

/* Начальный язык: сохранённый выбор (если валиден) → иначе язык браузера → иначе en.
   lang — ЖИВОЙ экспорт (let): t()/L() читают модульную переменную, обновляемую setLang; импортёры
   получают живую привязку, отдельной перерисовки для смены самой переменной не нужно. */
const _stored = store.get(LS_KEY);
export let lang = (_stored && LANGS.includes(_stored)) ? _stored : detectLang();

/* t(key, params) — строка UI-словаря текущего языка. Фолбэк: en-словарь → params.def (умолчание вызова)
   → сам ключ (видимый маркер недостающего перевода). {n}-подстановка для шаблонов (статус/ярлыки
   холста, этап A). Пока словари пусты → всегда фолбэк (params.def или ключ). */
export function t(key, params){
  const d = DICTS[lang] || {}, en = DICTS.en || {};
  let s = (key in d) ? d[key] : (key in en) ? en[key] : (params && params.def != null ? params.def : key);
  if(params) s = String(s).replace(/\{(\w+)\}/g, (m,k)=> k in params ? params[k] : m);
  return s;
}

/* L(field) — поле-ИМЯ данных (звукоряды/аккорды/тембры). Принимает И строку (одинаково на всех языках:
   международный символ или пока-не-переведённое), И объект {en,ru,es,de,default}. Резолв по языку с
   фолбэком default → en → ru → первое значение. Этап B наполнит данные объектами; строки проходят
   насквозь, поэтому сегодня L() — тождество. Форма объекта — на четыре языка (частичный объект
   {default,ru} для транслитераций тоже валиден). */
export function L(field){
  if(field == null) return '';
  if(typeof field === 'string') return field;
  return field[lang] ?? field.default ?? field.en ?? field.ru ?? Object.values(field)[0] ?? '';
}

/* Подписчики на смену языка: этап A подключит сюда перерисовку динамики (выпадашки, составные кнопки).
   applyI18n зовётся ВСЕГДА; подписчики — для того, что нельзя выразить через [data-i18n]. */
const _subs = [];
export const onLangChange = fn => { _subs.push(fn); };

/* Перерисовка СТАТИЧЕСКОЙ разметки: проходим [data-i18n] (текст) и [data-i18n-title] (подсказка) и
   ставим из словаря. Пока таких атрибутов в HTML нет → no-op (строки не перенесены). Этап A разметит. */
export function applyI18n(root = document){
  root.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = t(el.getAttribute('data-i18n-title')); });
  try{ document.documentElement.setAttribute('lang', lang); }catch(e){}   // <html lang> в ногу с выбором
}

/* Сменить язык БЕЗ перезагрузки: валидируем, сохраняем, перерисовываем разметку, уведомляем подписчиков.
   Холст ничего не требует — draw читает t()/L() каждый кадр, следующий кадр уже локализован. */
export function setLang(code){
  if(!LANGS.includes(code)) return;
  lang = code; store.set(LS_KEY, code);
  applyI18n();
  for(const fn of _subs){ try{ fn(lang); }catch(e){} }
}
