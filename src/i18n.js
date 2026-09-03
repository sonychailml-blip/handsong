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
    'start.learnTitle':'Interactive lessons — learn by playing',
    'start.learnSoon':'Interactive lessons are coming soon.',   // МЁРТВЫЙ КЛЮЧ: заметка «скоро» жила, пока обучения не было; сейчас кнопка открывает список уроков и ничего сюда не пишет. Оставлен, чтобы #learnMsg не сломался, если его снова начнут заполнять
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
    // подложка (джем / только ударные)
    'backing.label':'🎵 Backing',
    'backing.title.off':'Backing: a full jam or drums only — tap to choose',
    'backing.title.jam':'Jam: {name} — tap for the next variant ({i} of {n}); long-press to change path',
    'backing.title.drums':'Drums: {name} — tap for the next pattern ({i} of {n}); long-press to change path',
    'backing.nowJam':'🎵 {name}',
    'backing.nowDrums':'🥁 {name}',
    'backing.noDrums':'no drums',
    'backing.jam':'🎵 Jam (full backing)',
    'backing.drums':'🥁 Drums only',
    'backing.drumsTitle':'{n} pattern(s) for this metre',
    'backing.drumsNone':'No drum patterns for metre {metre}',
    'jam.sizeMismatch':'Backing: the loop has a different length — clear it (✕)',
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
    // раскладка нот: прямоугольники vs узкие ряды (доступна ВСЕМ ладам — арифметика в scales.rectLayout подбирает k и повтор тоники)
    'panel.scale.rectLayout':'Note layout',
    // многопальцевый щипок: потолок нот на руку (дефолт 4)
    'panel.scale.pinchFingers':'Fingers per hand',
    'panel.scale.pinchHint':'Several fingers to the thumb — several notes. The camera separates two fingers more reliably than four: if the ring or little finger fires falsely, lower the limit.',
    'pinch.one':'1 — one note',
    'pinch.n':'{n} notes at once',
    'rect.auto':'By scale: {form}',
    'rect.rect':'Rectangles (4 notes each)',
    'rect.rows':'Narrow rows',
    'rect.form.rect':'rectangles',
    'rect.form.rows':'narrow rows',
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
    'panel.loop.sub':'Beat division',
    'panel.loop.sub4':'4 · 16ths',
    'panel.loop.sub3':'3 · triplets',
    'panel.loop.hint':'Length and metre can be changed only on an empty loop. Beat division can be changed any time — it only affects how live drum hits are quantized.',
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
    'tag.idleFinger':'finger unused here',   // при k<4 лишние пальцы не играют — молчание без подписи читалось бы как поломка
    // холст: полные имена эффектов
    'fx.dly':'Delay',
    'fx.vib':'Vibrato',
    'fx.drv':'Drive',
    'fx.trm':'Tremolo',
    'fx.reverb':'Reverb',
    'fx.reverb.decay':'Reverb: tail',
    'fx.reverb.tone':'Reverb: tone',
    // конструктор эффектов: раскладка по пальцам
    'fx.none':'— none —',
    'panel.scale.fxCtl':'Effects constructor',
    'finger.index':'Index finger',
    'finger.middle':'Middle finger',
    'finger.ring':'Ring finger',
    'finger.pinky':'Little finger',
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
    'tutor.step1.prompt':'Touch your right thumb and index fingertips together.',
    'tutor.step1.detail':'Notes come from your right hand. Touch the fingertips and keep them together — the note holds as long as they touch.',
    'tutor.step2.prompt':'Keep them touching and move your hand up and down.',
    'tutor.step2.detail':'Moving the hand up and down sets the pitch; moving it left and right sets the volume.',
    'tutor.step3.prompt':'Now touch the tip of your thumb to a fingertip other than the index.',
    'tutor.step3.detail':'Index, middle, ring, little — each finger plays a higher octave. Same hand, same movement, different range.',
    'tutor.step4.prompt':'Now the left hand: touch your thumb to a fingertip and move up and down.',
    'tutor.step4.detail':'Each finger is a different effect — reverb, delay, vibrato and more, shown as bars at the left edge. The finger chooses the effect, the height sets how much.',
    'tutor.final.prompt':'That\'s the core: notes, pitch, octaves, and effects on the sound.',
    // обучение — урок «Аккорды»
    'tutor.chSwitch.prompt':'Tap the "Solo" button at the top to switch to Chords, then touch your fingertips together to play one.',
    'tutor.chSwitch.detail':'We\'ve set the scale to Chromatic so all chord types are available. The button cycles Solo → Chords → Bass → Drums.',
    'tutor.chLatch.prompt':'Play a chord, then open your fingers — it keeps playing.',
    'tutor.chLatch.detail':'That\'s deliberate: the chord holds while your hand goes off to do something else. Touching the fingertips together again in the same place stops it.',
    'tutor.chRow.prompt':'Now play at a different height — a different chord.',
    'tutor.chRow.detail':'It works just as it did with single notes: up and down changes the chord, left and right changes the volume.',
    'tutor.chPalette.prompt':'On the left is a palette of chord types. Touch your thumb and index fingertips together there to pick one, then play on the right.',
    'tutor.chPalette.detail':'Either hand can do either thing — it\'s the place that decides, not the hand.',
    'tutor.chHold.prompt':'You can also set a chord to stop the moment your fingers open. The options are in the scale menu, under Hand functions.',
    // обучение — урок «Строи и тембры»
    'tutor.tunOpen.prompt':'Open the scale menu — the button at the top showing the current scale.',
    'tutor.tunOpen.detail':'Everything about pitch lives here: which notes the instrument plays, and how they sound.',
    'tutor.tunFamiliar.prompt':'Pick something from “Familiar” — Major, say — close the menu and play.',
    'tutor.tunFamiliar.detail':'These are the twelve notes most Western music is built from.',
    'tutor.tunJump.prompt':'Now set Tradition to “Java & the Far East”, pick “Pelog”, and play the same way.',
    'tutor.tunJump.detail':'Unlike the tuning you\'re used to, the distances between notes here are different — and so is the sound.',
    'tutor.tunCents.prompt':'While you play, the tag shows each note in Hz and in cents.',
    'tutor.tunCents.detail':'A cent is a hundredth of the gap between two neighbouring piano keys. Here the notes don\'t land where a piano puts them, and the number shows exactly where they do.',
    'tutor.tunTimbre.prompt':'Open the menu again, change the Solo instrument, and play.',
    'tutor.tunTimbre.detail':'Chords, bass and drums have their own instruments to choose from as well.',
    'tutor.tunFinal.prompt':'Not all music is built from twelve notes — more than seventy-five tunings live in that menu. You can also shift the whole instrument up or down by setting A to something other than 440 Hz.',
    // обучение — урок «Функции рук»
    'tutor.hfWhere.prompt':'Open the scale menu and scroll to “Hand functions”.',
    'tutor.hfWhere.detail':'Each hand gets its own function, and it can differ for each role. Most instruments fix that once and forever — here you choose.',
    'tutor.hfHold.prompt':'Set the right hand to “Notes (held)”, then play and move your hand around.',
    'tutor.hfHold.detail':'The pitch stays where you took it, however far the hand travels. The volume still follows, and the note ends when your fingers open.',
    'tutor.hfTherm.prompt':'Now set the same hand to “Theremin” and play.',
    'tutor.hfTherm.detail':'There are no steps any more — the pitch slides smoothly between notes instead of jumping to them.',
    'tutor.hfExpr.prompt':'Set the left hand to “Expression”, play with the right, and move the left one.',
    'tutor.hfExpr.detail':'That hand plays nothing — it shapes the sound. Movement brings it alive, an open palm opens the tone, spread fingers roughen it, a tilt adds space.',
    'tutor.hfLooper.prompt':'A hand can also be set to “Looper” and run recording by finger.',
    'tutor.hfLooper.detail':'Its fingers become buttons: index records, middle plays or pauses, ring undoes a layer.',
    'tutor.hfFinal.prompt':'Notes, effects, expression, the looper — assign any function to either hand.',
    // обучение — урок «Лупер»
    'tutor.lpRec.prompt':'We\'ve set the scale to Major. Press ● at the top, wait for the count-in, then play a few notes.',
    'tutor.lpRec.detail':'The count-in is one bar of clicks — it sets the beat before recording starts. When the bar ends, your phrase comes back around and repeats.',
    'tutor.lpLayer.prompt':'Switch the role button to Chords or Bass, press ● again, and play.',
    'tutor.lpLayer.detail':'For now the looper can hold only one solo part, so switch to chords or bass for the next layer — they have their own voices and stack over your melody.',
    'tutor.lpUndo.prompt':'Press ⤺ to remove the layer you just added.',
    'tutor.lpUndo.detail':'If a layer didn\'t come out right, take the top one off and record it again.',
    'tutor.lpJam.prompt':'Tap 🎵 Backing and pick one — a ready-made backing starts, and you can play over it.',
    'tutor.lpJam.detail':'The first tap asks what you want: the full jam, or drums only. Either fits the current scale — chords and a beat where they suit, a plain drone where a beat would be wrong. After that, each tap switches to the next variant.',
    'tutor.lpTempo.prompt':'Open the ⚙ Loop panel — tempo, length and metre are here.',
    'tutor.lpTempo.detail':'Length and metre change only on an empty loop: otherwise every recorded note would land in the wrong place. Clear the loop first if you need to change them.',
    'tutor.lpHand.prompt':'A hand can run all of this by itself, without reaching for the screen.',
    'tutor.lpHand.detail':'Set a hand to “Looper” in Hand functions and its fingers become buttons — record, play, undo. The Hand functions lesson covers it.',
    'tutor.lpFinal.prompt':'That\'s the looper: record a phrase, stack layers, undo freely — and build a whole piece by yourself, live.',
    // обучение — урок «Две роли сразу» (сплит)
    'tutor.spOrient.prompt':'Turn your phone sideways, or widen the window on a computer.',
    'tutor.spOrient.detail':'Two instruments side by side need a wide screen. The lesson continues by itself once it is wide enough.',
    'tutor.spOn.prompt':'Tap ◨ at the top — the screen splits in two.',
    'tutor.spOn.detail':'Each half becomes its own instrument, with its own grid.',
    'tutor.spHalves.prompt':'Play in one half, then in the other — a melody in one, chords in the other.',
    'tutor.spHalves.detail':'A hand plays whichever instrument\'s half it is in. One hand or both — the place decides, not the hand.',
    'tutor.spRoles.prompt':'Each half has its own role button at the top — switch one to Bass or Drums.',
    'tutor.spRoles.detail':'The two halves can never hold the same role, so the button skips whatever the other one has.',
    'tutor.spFinal.prompt':'Hand functions apply per half, by that half\'s role — so a solo half keeps its effects and theremin. Turn back to portrait and split switches off by itself.',
    'tutor.noHand':'We can\'t see a hand. Check the camera is on, your hand is in the frame, and the room is lit.',
    'tutor.next':'Next →',
    'tutor.nextLesson':'Next: {title} →',
    'tutor.donePlay':'Done — let me play',
    'tutor.skip':'Skip',
    // список уроков (меню возможностей инструмента)
    'lessons.title':'Lessons',
    'lessons.free':'Free play',
    'lessons.soon':'Coming soon',
    'lessons.close':'Close ✕',
    'lesson.basics.title':'Basics',
    'lesson.basics.desc':'Play your first note, find the pitch, and shape the sound.',
    'lesson.chords.title':'Chords',
    'lesson.chords.desc':'Chord types, holding a chord, and the palette.',
    'lesson.tunings.title':'Tunings & timbres',
    'lesson.tunings.desc':'More than seventy-five tunings and the instrument\'s own sound.',
    'lesson.looper.title':'The looper',
    'lesson.looper.desc':'Record a loop and stack layers over it.',
    'lesson.handfn.title':'Hand functions',
    'lesson.handfn.desc':'Give each hand its own function.',
    'lesson.split.title':'Two roles at once',
    'lesson.split.desc':'Split the screen — each half is its own instrument.',
  },
  ru: {
    'app.title':'Handsong — жестовый синтезатор и интерактивный учебник ладов',
    'start.tag':'Жестовый синтезатор: играйте руками перед камерой.',
    'start.play':'▶ Играть',
    'start.learn':'Обучение',
    'start.learnTitle':'Интерактивное обучение — учимся, играя',
    'start.learnSoon':'Интерактивное обучение готовится — скоро.',   // МЁРТВЫЙ КЛЮЧ, см. англ. словарь
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
    'backing.label':'🎵 Подложка',
    'backing.title.off':'Подложка: джем целиком или только ударные — тап откроет выбор',
    'backing.title.jam':'Джем: {name} — тап включит следующий вариант ({i} из {n}); долгий тап сменит путь',
    'backing.title.drums':'Ударные: {name} — тап включит следующий паттерн ({i} из {n}); долгий тап сменит путь',
    'backing.nowJam':'🎵 {name}',
    'backing.nowDrums':'🥁 {name}',
    'backing.noDrums':'без ударных',
    'backing.jam':'🎵 Джем (вся подложка)',
    'backing.drums':'🥁 Только ударные',
    'backing.drumsTitle':'Паттернов для этого размера: {n}',
    'backing.drumsNone':'Для размера {metre} паттернов пока нет',
    'jam.sizeMismatch':'Подложка: петля другой длины — очистите её (✕)',
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
    'panel.scale.rectLayout':'Раскладка нот',
    'panel.scale.pinchFingers':'Пальцев в руке',
    'panel.scale.pinchHint':'Несколько пальцев к большому — несколько нот. Камера различает два пальца увереннее, чем четыре: если безымянный или мизинец срабатывают ложно — опустите потолок.',
    'pinch.one':'1 — одна нота',
    'pinch.n':'{n} ноты одновременно',
    'rect.auto':'По ладу: {form}',
    'rect.rect':'Прямоугольники (по 4 ноты)',
    'rect.rows':'Узкие ряды',
    'rect.form.rect':'прямоугольники',
    'rect.form.rows':'узкие ряды',
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
    'panel.loop.sub':'Дробление доли',
    'panel.loop.sub4':'4 · 16-е',
    'panel.loop.sub3':'3 · триоли',
    'panel.loop.hint':'Длину и размер меняют только на пустой петле. Дробление доли меняется когда угодно — оно влияет лишь на то, к какой сетке квантуются живые удары.',
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
    'tag.idleFinger':'палец не занят',
    'fx.dly':'Делей',
    'fx.vib':'Вибрато',
    'fx.drv':'Драйв',
    'fx.trm':'Тремоло',
    'fx.reverb':'Реверб',
    'fx.reverb.decay':'Реверб: длина',
    'fx.reverb.tone':'Реверб: окраска',
    // конструктор эффектов: раскладка по пальцам
    'fx.none':'— нет —',
    'panel.scale.fxCtl':'Конструктор эффектов',
    'finger.index':'Указательный',
    'finger.middle':'Средний',
    'finger.ring':'Безымянный',
    'finger.pinky':'Мизинец',
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
    'tutor.step1.prompt':'Сведите кончики большого и указательного пальцев правой руки.',
    'tutor.step1.detail':'Ноты играет правая рука. Сведите кончики и держите — нота звучит, пока они вместе.',
    'tutor.step2.prompt':'Не размыкая пальцы, ведите руку вверх и вниз.',
    'tutor.step2.detail':'Движение руки вверх-вниз задаёт высоту ноты, движение влево-вправо — её громкость.',
    'tutor.step3.prompt':'Теперь коснитесь кончиком большого пальца кончика другого пальца, не указательного.',
    'tutor.step3.detail':'Указательный, средний, безымянный, мизинец — каждый палец играет октавой выше. Та же рука, то же движение, другой регистр.',
    'tutor.step4.prompt':'Теперь левая рука: коснитесь большим пальцем кончика и ведите вверх-вниз.',
    'tutor.step4.detail':'Каждый палец — свой эффект: реверб, делей, вибрато и другие, они видны столбиками у левого края. Палец выбирает эффект, высота задаёт величину.',
    'tutor.final.prompt':'Это основа: ноты, высота, октавы и эффекты на звуке.',
    // обучение — урок «Аккорды»
    'tutor.chSwitch.prompt':'Нажмите кнопку «Соло» вверху, чтобы переключиться на «Аккорды», и сведите кончики пальцев — заиграет аккорд.',
    'tutor.chSwitch.detail':'Мы поставили лад «Хроматика», чтобы были доступны все типы аккордов. Кнопка листает Соло → Аккорды → Бас → Ударные.',
    'tutor.chLatch.prompt':'Сыграйте аккорд и разомкните пальцы — он продолжает звучать.',
    'tutor.chLatch.detail':'Так задумано: аккорд держится, пока рука занята другим. Повторное соединение пальцев в том же месте выключает его.',
    'tutor.chRow.prompt':'Теперь сыграйте на другой высоте — другой аккорд.',
    'tutor.chRow.detail':'Работает как в соло: движение вверх-вниз меняет аккорд, влево-вправо — громкость.',
    'tutor.chPalette.prompt':'Слева — палитра типов аккорда. Соедините там кончики большого и указательного пальцев, чтобы выбрать тип, затем играйте справа.',
    'tutor.chPalette.detail':'Любой рукой можно и играть аккорд, и менять его тип — решает место, а не рука.',
    'tutor.chHold.prompt':'Можно настроить игру так, что аккорд будет переставать звучать с размыканием пальцев. Опции доступны в меню лада, в «Функциях рук».',
    // обучение — урок «Строи и тембры»
    'tutor.tunOpen.prompt':'Откройте меню лада — кнопка вверху с названием текущего лада.',
    'tutor.tunOpen.detail':'Здесь всё про высоту звука: какие ноты играет инструмент и как они звучат.',
    'tutor.tunFamiliar.prompt':'Возьмите что-нибудь из «Привычного» — например, Мажор — закройте меню и поиграйте.',
    'tutor.tunFamiliar.detail':'Это те двенадцать нот, на которых построена почти вся западная музыка.',
    'tutor.tunJump.prompt':'Теперь смените строй на «Ява и Дальний Восток», возьмите «Пелог» и играйте так же.',
    'tutor.tunJump.detail':'В отличие от привычного нам строя, здесь другое соотношение высот между нотами — и звучание иное.',
    'tutor.tunCents.prompt':'Пока вы играете, плашка показывает каждую ноту в герцах и в центах.',
    'tutor.tunCents.detail':'Цент — сотая доля расстояния между соседними клавишами рояля. Здесь ноты стоят не там, где их ставит рояль, и число показывает, где именно.',
    'tutor.tunTimbre.prompt':'Снова откройте меню, смените «Соло-инструмент» и поиграйте.',
    'tutor.tunTimbre.detail':'У аккордов, баса и ударных тоже свои инструменты, из которых можно выбирать.',
    'tutor.tunFinal.prompt':'Не всякая музыка строится из двенадцати нот — в этом меню более семидесяти пяти строёв. Там же можно сдвинуть весь инструмент выше или ниже, поставив ноту «ля» не на 440 Гц, а на другую частоту.',
    // обучение — урок «Функции рук»
    'tutor.hfWhere.prompt':'Откройте меню лада и пролистайте до «Функций рук».',
    'tutor.hfWhere.detail':'Каждая рука получает свою функцию, и для каждой роли она может быть своей. У большинства инструментов это задано раз и навсегда — здесь выбираете вы.',
    'tutor.hfHold.prompt':'Поставьте правую руку на «Ноты (с удержанием)», сыграйте и подвигайте рукой.',
    'tutor.hfHold.detail':'Высота остаётся там, где вы её взяли, как бы далеко ни ушла рука. Громкость по-прежнему следует за рукой, а нота гаснет с размыканием пальцев.',
    'tutor.hfTherm.prompt':'Теперь поставьте ту же руку на «Терменвокс» и играйте.',
    'tutor.hfTherm.detail':'Ступеней больше нет — высота плавно скользит между нотами, а не прыгает по ним.',
    'tutor.hfExpr.prompt':'Поставьте левую руку на «Выразительность», играйте правой и двигайте левой.',
    'tutor.hfExpr.detail':'Эта рука не играет нот — она лепит звук. Движение оживляет его, раскрытая ладонь раскрывает тембр, растопыренные пальцы делают его грубее, наклон добавляет пространства.',
    'tutor.hfLooper.prompt':'Руку можно поставить и на «Лупер» — вести запись пальцами.',
    'tutor.hfLooper.detail':'Её пальцы становятся кнопками: указательный пишет, средний играет или ставит паузу, безымянный снимает слой.',
    'tutor.hfFinal.prompt':'Ноты, эффекты, выразительность, лупер — назначайте любые функции на любую руку.',
    // обучение — урок «Лупер»
    'tutor.lpRec.prompt':'Мы поставили лад «Мажор». Нажмите ● вверху, дождитесь отсчёта и сыграйте несколько нот.',
    'tutor.lpRec.detail':'Отсчёт — это такт щелчков, он задаёт темп перед началом записи. Когда такт кончится, ваша фраза вернётся и повторится.',
    'tutor.lpLayer.prompt':'Переключите кнопку роли на «Аккорды» или «Бас», снова нажмите ● и играйте.',
    'tutor.lpLayer.detail':'Пока в лупер можно записать только один соло-голос, поэтому для следующего слоя переключитесь на аккорды или бас — у них свои голоса, и они лягут поверх мелодии.',
    'tutor.lpUndo.prompt':'Нажмите ⤺, чтобы снять только что добавленный слой.',
    'tutor.lpUndo.detail':'Если слой не получился, снимите верхний и запишите заново.',
    'tutor.lpJam.prompt':'Нажмите 🎵 Подложка и выберите — заиграет готовая подложка, поверх которой можно играть.',
    'tutor.lpJam.detail':'Первый тап спросит, что вам нужно: джем целиком или только ударные. И то и другое — под текущий лад: аккорды и бит там, где они уместны, простой дрон там, где бит был бы неуместен. Дальше каждый тап переключает на следующий вариант.',
    'tutor.lpTempo.prompt':'Откройте панель ⚙ Луп — здесь темп, длина и размер.',
    'tutor.lpTempo.detail':'Длину и размер меняют только на пустой петле: иначе каждая записанная нота встала бы не на своё место. Сначала очистите петлю.',
    'tutor.lpHand.prompt':'Рука может вести всё это сама, не тянясь к экрану.',
    'tutor.lpHand.detail':'Поставьте руку на «Лупер» в «Функциях рук», и её пальцы станут кнопками — запись, пуск, отмена. Об этом урок «Функции рук».',
    'tutor.lpFinal.prompt':'Это и есть лупер: записать фразу, копить слои, свободно отменять — и собрать целую пьесу в одиночку, вживую.',
    // обучение — урок «Две роли сразу» (сплит)
    'tutor.spOrient.prompt':'Поверните телефон набок или расширьте окно на компьютере.',
    'tutor.spOrient.detail':'Двум инструментам рядом нужен широкий экран. Урок продолжится сам, как только места хватит.',
    'tutor.spOn.prompt':'Нажмите ◨ вверху — экран разделится надвое.',
    'tutor.spOn.detail':'Каждая половина становится своим инструментом со своей сеткой.',
    'tutor.spHalves.prompt':'Сыграйте в одной половине, потом в другой — в одной мелодия, в другой аккорды.',
    'tutor.spHalves.detail':'Рука управляет тем инструментом, в поле которого находится. Одной рукой или двумя — решает место, а не рука.',
    'tutor.spRoles.prompt':'У каждой половины своя кнопка роли вверху — переключите одну на «Бас» или «Ударные».',
    'tutor.spRoles.detail':'Две половины не могут держать одну роль, поэтому кнопка пропускает то, что занято соседней.',
    'tutor.spFinal.prompt':'«Функции рук» действуют в каждой половине по её роли, поэтому у соло-половины остаются её эффекты и терменвокс. Поверните обратно в портрет — сплит выключится сам.',
    'tutor.noHand':'Не видим руку. Проверьте, что камера включена, рука в кадре и в комнате светло.',
    'tutor.next':'Дальше →',
    'tutor.nextLesson':'Дальше: {title} →',
    'tutor.donePlay':'Готово — играть',
    'tutor.skip':'Пропустить',
    'lessons.title':'Уроки',
    'lessons.free':'Свободная игра',
    'lessons.soon':'Скоро',
    'lessons.close':'Закрыть ✕',
    'lesson.basics.title':'Основы',
    'lesson.basics.desc':'Первая нота, высота и первые эффекты.',
    'lesson.chords.title':'Аккорды',
    'lesson.chords.desc':'Типы аккордов, удержание и палитра.',
    'lesson.tunings.title':'Строи и тембры',
    'lesson.tunings.desc':'Более семидесяти пяти строёв и звучание самого инструмента.',
    'lesson.looper.title':'Лупер',
    'lesson.looper.desc':'Запишите петлю и наложите слои.',
    'lesson.handfn.title':'Функции рук',
    'lesson.handfn.desc':'Дайте каждой руке свои функции.',
    'lesson.split.title':'Две роли сразу',
    'lesson.split.desc':'Разделите экран — каждая половина свой инструмент.',
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
