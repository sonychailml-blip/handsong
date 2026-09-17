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
    'bar.sound':'🎛 Sound',
    'bar.soundTitle':'Sound & control: timbres, hand functions, effects',
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
    'jam.sizeMismatch':'Backing could not be loaded',
    // кнопка записи ● (лупер)
    /* S3.3: приложение стало ЛИНЕЙНЫМ рекордером — «круг»/«петля» в подписях больше не правда.
       'rec.title.recFirst' УДАЛЁН вместе с веткой первого круга (loop.first). */
    'rec.title.overdub':'Recording track {n} — tap to stop',
    'rec.title.armed':'Playing — tap to record a new track',
    'rec.title.into':'Tap to record into track {n}',   // S3.5c: дорожка вооружена
    'rec.title.idle':'Record: tap for a one-bar count-in, then play',
    // транспорт лупера
    'transport.loopPlay':'▶ play',
    'transport.loopPause':'❚❚ pause',
    'transport.loopTitle':'Play / pause · from the end, play restarts from the top',
    'transport.regionTitle':'Repeat: cycle the bars under the brace instead of stopping at the end',
    'transport.undoTitle':'Undo the last take',
    'transport.clearTitle':'Clear the whole song',
    'transport.panicTitle':'Silence everything',
    'transport.editTitle':'Edit this track: piano roll',
    // редактор дорожки — пиано-ролл (S5.0)
    'roll.closeTitle':'Close the editor',
    'roll.trackTitle':'Switch track',
    'roll.track':'L{n}',
    'roll.zoomInTitle':'Zoom in',
    'roll.zoomOutTitle':'Zoom out',
    'roll.tabLater':'Editing this role comes later',
    'roll.scaleTitle':'This track holds events in several scales · tap to switch the axis',
    'roll.ghosts':'{n} in another scale',
    'roll.emptyRole':'Nothing of this role in this track',
    'roll.empty':'No drums in this track',
    'roll.noTrack':'This track is gone',
    'roll.refusedRec':'Stop recording first',
    'roll.refusedClip':'Stop the clip recording first',
    'roll.refusedEmpty':'Record something first',
    'roll.recBlocked':'Close the editor to record',
    'roll.hint':'drag a note — move · its right edge — length · empty space — scroll · two fingers — zoom · ruler — playhead',
    // O-2: что у дорожки ЗАХВАЧЕНО для будущего рендера (зародыш «заморожено с …»).
    // {roles} — роли САМОЙ дорожки: их может быть несколько, и тогда список эффектов слитый — подпись об этом и говорит
    // O-4: ПОЛОСА АВТОМАТИЗАЦИИ редактора — выбор параметра и правка цепи САМОЙ дорожки
    'aut.none':'— automation off —',
    'aut.pick':'pick a parameter to see its automation',
    'aut.pickTitle':'Automation lane: which parameter to show',
    'aut.add':'+ effect for this track',
    'aut.addTitle':'Add an effect to this track only — your own chain is not touched',
    'aut.rmTitle':'Remove this effect from the track',
    'roll.cap':'captured — {roles}: {fx} · {n} automation points',
    'roll.capNone':'captured — {roles}: no effects',
    'roll.homeTitle':'Playhead to the start',
    'roll.snapFree':'free',
    'roll.snapHidden':'(grid too fine to draw)',
    // правка ударов (S5.1)
    'roll.insertTitle':'Insert mode: tap an empty cell to add a hit',
    'roll.delTitle':'Delete the selected hit',
    'roll.undoTitle':'Undo the last edit · ⤺ outside the editor undoes a whole take',
    'roll.redoTitle':'Redo the undone edit · a new edit discards it',
    'roll.snapTitle':'Snap {s} · follows “Quantize” in the loop panel',
    'roll.readOnly':'Backing track — read-only',
    'roll.needSel':'Select a hit first',
    // панель звукоряда
    'panel.collapse':'Collapse ✕',
    'panel.scale.head':'Scale',
    'panel.sound.head':'Sound & control',
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
    'panel.scale.handActs':'Finger actions',
    'act.none':'— effects',
    'act.chFam':'Chord type palette',
    'act.unavail':'{name} — not on this scale',
    'act.hint':'What each finger of the EFFECTS hand does. By default every finger drives its effect parameters. The chord type palette can be put on any one finger — inside the palette that finger picks a type, outside it the same finger still drives its parameters.',
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
    'panel.loop.sepLoop':'Song',
    'panel.loop.length':'Backing length (bars)',
    'panel.loop.metre':'Metre (beats)',
    'panel.loop.tempo':'Tempo (BPM)',
    'panel.loop.quant':'Quantize',
    'panel.loop.sub':'Beat division',
    'panel.loop.sub4':'4 · 16ths',
    'panel.loop.sub3':'3 · triplets',
    'panel.loop.hint':'Metre can be changed only while the song is empty. Backing length and beat division can be changed any time — they only affect the next backing and how live drum hits are quantized.',
    'panel.loop.sepArr':'Arrangement (tracks)',
    'panel.loop.harmony':'Harmony',
    'panel.loop.rhythm':'Rhythm',
    'panel.loop.bassMode':'Bass part',
    'panel.loop.addLayers':'＋ Add tracks',
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
    'handfn.hit':'Drums (hit rows)',
    'hand.left':'Left hand',
    'hand.right':'Right hand',
    // холст: статус-строка ({name} — имя лада, локализуется на этапе B)
    'status.centsScale':'Scale: {name} · cents tuning · {n} steps',
    'status.edoScale':'Scale: {name} · {edo}-TET · steps: {steps}',
    'status.step':' · step {c}c',
    'status.recPrefix':'● recording · ',
    'status.loopPrefix':'▶ song · {bpm} BPM · ',
    // холст: коробка лупера
    'looper.count':'COUNT-IN  {n}',
    /* S3.3: 'looper.recFirst' УДАЛЁН (ветки первого круга нет). Остальные трое говорят о ДОРОЖКАХ и
       длине ПЕСНИ, а не о петле. */
    'looper.overdub':'● RECORDING · track {n}',
    'looper.playing':'▶ PLAYING · {bars} bars · {layers} tracks',
    'looper.paused':'SONG · {bars} bars · {layers} tracks · “▶ play” to start',
    'looper.regionOn':'REPEAT',
    'looper.braceAuto':'auto',   // S3.5b: скоба повтора следует за материалом (её ещё не ставили руками)
    'looper.clear':'CLEAR',
    // холст: дорожки лупера (S1). Буквы кнопок — ОДИН символ: гнездо 21px, значок там нечитаем, подписи не влезают
    'looper.laneMute':'M',
    'looper.laneSolo':'S',
    'looper.laneDel':'✕',                                 // S3.5d: удалить дорожку (второй тап подтверждает)
    'looper.delConfirm':'Tap ✕ again to delete L{n}',
    'looper.soloOn':'SOLO',
    'looper.armed':'REC → L{n}',                    // S3.5c: куда пойдёт ●
    'looper.armedSilent':'REC → L{n} (not heard)',  // …в дорожку, которую сейчас не слышно (mute / чужое соло)
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
    'fx.trm':'Tremolo (note)',
    'fx.reverb':'Reverb',
    'fx.bright':'Brightness',
    'fx.bright.amt':'Amount',
    // Подписи ПАРАМЕТРОВ — короткие: они стоят подстрокой под уже подписанным эффектом, повторять его имя незачем.
    'fx.reverb.decay':'Tail',
    'fx.reverb.tone':'Tone',
    'fx.reverb.mix':'Amount',
    'fx.dly.mix':'Amount',
    'fx.dly.time':'Time',
    'fx.dly.fb':'Feedback',
    'fx.trmMix':'Tremolo (mix)',
    'fx.trmMix.depth':'Depth',
    'fx.trmMix.rate':'Rate',
    'fx.param.amt':'Amount',            // у старых скалярных эффектов параметр один и он же сам эффект
    // конструктор эффектов: раскладка по пальцам + ось/инверсия на параметр
    'fx.none':'— none —',
    'fx.invert':'Invert',
    // АДРЕС параметра одним списком (3.4.2): «Фиксировано» + группы по пальцам + играющая рука
    'fx.mode.fixed':'Fixed',            // ключ прежний: тот же текст и тот же смысл, теперь — пункт списка адресов
    'fx.addr.play':'Playing hand',      // заголовок группы; осей внутри ДВЕ (3.7.3): горизонталь и глубина
    // свёрнутый заголовок эффекта + правка состава цепи (3.4.3). Пальцы в сводке — римские I–IV
    // (ими приложение обозначает палец везде), оси — стрелки: и то, и другое перевода не требует.
    'fx.sum.play':'depth',
    'fx.sum.playx':'horiz.',           // сводка: адрес «играющая рука → горизонталь» (та ось, что иначе ведёт громкость)
    'fx.volFix':'Fixed volume',
    'fx.volFixHint':'The playing hand’s horizontal now drives an effect, so it no longer sets volume for this role — set the level here.',
    'fx.sum.fixed':'fixed',
    'fx.add':'+ Add effect',
    'fx.addAll':'All effects are in the chain',
    'fx.remove':'Remove from chain',
    // O-1: перестановка в последовательной цепи + две зоны списка (что живёт в ноте / что обрабатывает сумму)
    'fx.moveUp':'Earlier in the chain',
    'fx.moveDown':'Later in the chain',
    'fx.zone.voice':'In the note',
    'fx.zone.bus':'Summed sound',
    'fx.zone.voiceHint':'Made inside each voice, always before the mix — order does not apply.',
    'fx.zone.busHint':'Applied to all voices together, in this order. The first one feeds the next.',
    'fx.share.title':'Move together:',   // подсказка чипа «×N»: один адрес ведёт несколько параметров (3.4.4)
    'axis.x':'Horizontal',
    'axis.y':'Vertical',
    'axis.z':'Depth',
    'axis.play.z':'Depth (playing hand)',
    'panel.scale.fxCtl':'Effects constructor',
    // выбор роли, чью цепь правим (3.4.1). Роль ВЛАДЕЕТ цепью — отсюда и подпись «цепь роли», а не «роль»
    'fx.role':'Chain of role',
    'fx.noHand':'No hand is set to Effects right now, so the finger addresses below do nothing. Parameters set to Fixed keep working.',
    'finger.index':'Index finger',
    'finger.middle':'Middle finger',
    'finger.ring':'Ring finger',
    'finger.pinky':'Little finger',
    // сообщения руки-лупера (подтверждения команд)
    'msg.recording':'● Recording',
    'msg.recStop':'Recording stopped',   // S3.3: 'msg.overdub' УДАЛЁН — рука-лупер больше не различает «первый круг» и «наложение»
    'msg.noLoop':'Nothing to play',
    'msg.play':'▶ Play',
    'msg.pause':'⏸ Pause',
    'msg.noLayers':'Nothing to undo',
    'msg.undo':'↶ Undo take',
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
    'tutor.chHold.prompt':'You can also set a chord to stop the moment your fingers open. The options are in “🎛 Sound”, under Hand functions.',
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
    'tutor.hfWhere.prompt':'Open “🎛 Sound” in the top bar and find “Hand functions”.',
    'tutor.hfWhere.detail':'Each hand gets its own function, and it can differ for each role. Most instruments fix that once and forever — here you choose.',
    'tutor.hfHold.prompt':'Set the right hand to “Notes (held)”, then play and move your hand around.',
    'tutor.hfHold.detail':'The pitch stays where you took it, however far the hand travels. The volume still follows, and the note ends when your fingers open.',
    'tutor.hfTherm.prompt':'Now set the same hand to “Theremin” and play.',
    'tutor.hfTherm.detail':'There are no steps any more — the pitch slides smoothly between notes instead of jumping to them.',
    'tutor.hfExpr.prompt':'Set the left hand to “Expression”, play with the right, and move the left one.',
    'tutor.hfExpr.detail':'That hand plays nothing — it shapes the sound. Movement brings it alive, an open palm opens the tone, spread fingers roughen it, a tilt adds space.',
    'tutor.hfLooper.prompt':'A hand can also be set to “Looper” and run recording by finger.',
    'tutor.hfLooper.detail':'Its fingers become buttons: index records, middle plays or pauses, ring undoes your last take.',
    'tutor.hfFinal.prompt':'Notes, effects, expression, the looper — assign any function to either hand.',
    // обучение — урок «Лупер»
    'tutor.lpRec.prompt':'We\'ve set the scale to Major. Press ● at the top, wait for the count-in, play a few notes — then press ● again to stop.',
    'tutor.lpRec.detail':'The count-in is one bar of clicks — it sets the beat before recording starts. Recording runs until you stop it: ● starts, ● ends. What you played becomes a track and plays back on the timeline.',
    'tutor.lpLayer.prompt':'Switch the role button to Chords or Bass, press ● again, and play.',
    'tutor.lpLayer.detail':'Each press of ● records a new track, and it plays together with the tracks already there. Use chords or bass for this one — a second, different voice over your melody is easier to hear than a second solo.',
    'tutor.lpUndo.prompt':'Press ⤺ to undo the take you just recorded.',
    'tutor.lpUndo.detail':'⤺ removes your most recent take — here, the whole track you just added. If something didn\'t come out right, undo it and record it again.',
    'tutor.lpJam.prompt':'Tap 🎵 Backing and pick one — a ready-made backing starts, and you can play over it.',
    'tutor.lpJam.detail':'The first tap asks what you want: the full jam, or drums only. Either fits the current scale — chords and a beat where they suit, a plain drone where a beat would be wrong. After that, each tap switches to the next variant.',
    'tutor.lpTempo.prompt':'Open the ⚙ Loop panel — tempo, metre and backing length are here.',
    'tutor.lpTempo.detail':'Metre changes only while the song is empty: otherwise the bar grid would shift under notes already recorded. Tempo can be changed any time — the playhead keeps its place.',
    'tutor.lpHand.prompt':'A hand can run all of this by itself, without reaching for the screen.',
    'tutor.lpHand.detail':'Set a hand to “Looper” in Hand functions and its fingers become buttons — record, play, undo. The Hand functions lesson covers it.',
    'tutor.lpFinal.prompt':'That\'s the looper: record a phrase, stack tracks, undo freely — and build a whole piece by yourself, live.',
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
    'lesson.looper.desc':'Record tracks and stack them into a piece.',
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
    'bar.sound':'🎛 Звук',
    'bar.soundTitle':'Звук и управление: тембры, функции рук, эффекты',
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
    'jam.sizeMismatch':'Подложка не встала',
    'rec.title.overdub':'Пишется дорожка {n} — тап остановит',
    'rec.title.armed':'Играет — тап начнёт новую дорожку',
    'rec.title.into':'Тап — запись в дорожку {n}',
    'rec.title.idle':'Запись: тап — отсчёт такта, затем игра',
    'transport.loopPlay':'▶ играть',
    'transport.loopPause':'❚❚ пауза',
    'transport.loopTitle':'Играть / пауза · с конца пуск идёт с начала',
    'transport.regionTitle':'Повтор: гонять по кругу такты под скобой, а не останавливаться в конце',
    'transport.undoTitle':'Отменить последний дубль',
    'transport.clearTitle':'Очистить всю песню',
    'transport.panicTitle':'Заглушить всё',
    'transport.editTitle':'Редактор дорожки: пиано-ролл',
    'roll.closeTitle':'Закрыть редактор',
    'roll.trackTitle':'Сменить дорожку',
    'roll.track':'L{n}',
    'roll.zoomInTitle':'Приблизить',
    'roll.zoomOutTitle':'Отдалить',
    'roll.tabLater':'Правка этой роли — позже',
    'roll.scaleTitle':'В дорожке события в нескольких ладах · тап переключает ось',
    'roll.ghosts':'{n} в другом ладу',
    'roll.emptyRole':'В этой дорожке нет этой роли',
    'roll.empty':'В этой дорожке нет ударных',
    'roll.noTrack':'Этой дорожки больше нет',
    'roll.refusedRec':'Сначала остановите запись',
    'roll.refusedClip':'Сначала остановите запись клипа',
    'roll.refusedEmpty':'Сначала запишите что-нибудь',
    'roll.recBlocked':'Закройте редактор, чтобы записывать',
    'roll.hint':'тянуть ноту — перенос · её правый край — длина · пустое место — прокрутка · два пальца — зум · линейка — бегунок',
    // O-2: что у дорожки ЗАХВАЧЕНО для будущего рендера (зародыш «заморожено с …»).
    // {roles} — роли САМОЙ дорожки: их может быть несколько, и тогда список эффектов слитый — подпись об этом и говорит
    // O-4: ПОЛОСА АВТОМАТИЗАЦИИ редактора — выбор параметра и правка цепи САМОЙ дорожки
    'aut.none':'— без автоматизации —',
    'aut.pick':'выберите параметр — покажу его автоматизацию',
    'aut.pickTitle':'Полоса автоматизации: какой параметр показать',
    'aut.add':'+ эффект этой дорожке',
    'aut.addTitle':'Добавить эффект ТОЛЬКО этой дорожке — ваша собственная цепь не тронута',
    'aut.rmTitle':'Убрать эффект у дорожки',
    'roll.cap':'захвачено — {roles}: {fx} · точек автоматизации: {n}',
    'roll.capNone':'захвачено — {roles}: без эффектов',
    'roll.homeTitle':'Бегунок в начало',
    'roll.snapFree':'свободно',
    'roll.snapHidden':'(сетка мельче пикселя)',
    'roll.insertTitle':'Режим вставки: тап по пустой клетке добавит удар',
    'roll.delTitle':'Удалить выбранный удар',
    'roll.undoTitle':'Отменить последнюю правку · ⤺ вне редактора снимает целое взятое',
    'roll.redoTitle':'Вернуть отменённую правку · новая правка её отменяет',
    'roll.snapTitle':'Привязка {s} · следует «Квантизации» в панели лупера',
    'roll.readOnly':'Дорожка подложки — только чтение',
    'roll.needSel':'Сначала выберите удар',
    'panel.collapse':'Свернуть ✕',
    'panel.scale.head':'Звукоряд',
    'panel.sound.head':'Звук и управление',
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
    'panel.scale.handActs':'Действия пальцев',
    'act.none':'— эффекты',
    'act.chFam':'Палитра типов аккордов',
    'act.unavail':'{name} — нет на этом ладу',
    'act.hint':'Что делает каждый палец руки, назначенной на «Эффекты». По умолчанию все пальцы ведут параметры эффектов. Палитру типов можно повесить на любой один палец: внутри палитры он выбирает тип, а вне её — по-прежнему ведёт свои параметры.',
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
    'panel.loop.sepLoop':'Песня',
    'panel.loop.length':'Длина подложки (такты)',
    'panel.loop.metre':'Размер (долей)',
    'panel.loop.tempo':'Темп (BPM)',
    'panel.loop.quant':'Квантизация',
    'panel.loop.sub':'Дробление доли',
    'panel.loop.sub4':'4 · 16-е',
    'panel.loop.sub3':'3 · триоли',
    'panel.loop.hint':'Размер меняют только на пустой песне. Длина подложки и дробление доли меняются когда угодно — они влияют лишь на следующую подложку и на сетку квантизации живых ударов.',
    'panel.loop.sepArr':'Аранжировка (дорожки)',
    'panel.loop.harmony':'Гармония',
    'panel.loop.rhythm':'Ритм',
    'panel.loop.bassMode':'Бас-партия',
    'panel.loop.addLayers':'＋ Добавить дорожки',
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
    'handfn.hit':'Удары (по рядам)',
    'hand.left':'Левая рука',
    'hand.right':'Правая рука',
    'status.centsScale':'Лад: {name} · центовый строй · {n} ступеней',
    'status.edoScale':'Лад: {name} · {edo}-TET · ступени: {steps}',
    'status.step':' · шаг {c}c',
    'status.recPrefix':'● запись · ',
    'status.loopPrefix':'▶ песня · {bpm} BPM · ',
    'looper.count':'ОТСЧЁТ  {n}',
    'looper.overdub':'● ЗАПИСЬ · дорожка {n}',
    'looper.playing':'▶ ИГРАЕТ · {bars} т. · дорожек {layers}',
    'looper.paused':'ПЕСНЯ · {bars} т. · дорожек {layers} · «▶ играть»',
    'looper.regionOn':'ПОВТОР',
    'looper.braceAuto':'авто',
    'looper.clear':'ОЧИСТКА',
    'looper.laneMute':'М',    // «Молча» — кириллическая М; одна буква, как в en
    'looper.laneSolo':'С',    // «Соло»
    'looper.laneDel':'✕',
    'looper.delConfirm':'Ещё раз ✕ — удалить L{n}',
    'looper.soloOn':'СОЛО',
    'looper.armed':'ЗАПИСЬ → L{n}',
    'looper.armedSilent':'ЗАПИСЬ → L{n} (не слышно)',
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
    'fx.trm':'Тремоло (нота)',
    'fx.reverb':'Реверб',
    'fx.bright':'Яркость',
    'fx.bright.amt':'Величина',
    // Подписи ПАРАМЕТРОВ — короткие: они стоят подстрокой под уже подписанным эффектом, повторять его имя незачем.
    'fx.reverb.decay':'Длина',
    'fx.reverb.tone':'Окраска',
    'fx.reverb.mix':'Подмес',
    'fx.dly.mix':'Подмес',
    'fx.dly.time':'Время',
    'fx.dly.fb':'Повторы',
    'fx.trmMix':'Тремоло (микс)',
    'fx.trmMix.depth':'Глубина',
    'fx.trmMix.rate':'Частота',
    'fx.param.amt':'Величина',          // у старых скалярных эффектов параметр один и он же сам эффект
    // конструктор эффектов: раскладка по пальцам + ось/инверсия на параметр
    'fx.none':'— нет —',
    'fx.invert':'Инверсия',
    // АДРЕС параметра одним списком (3.4.2): «Фиксировано» + группы по пальцам + играющая рука
    'fx.mode.fixed':'Фиксировано',      // ключ прежний: тот же текст и тот же смысл, теперь — пункт списка адресов
    'fx.addr.play':'Играющая рука',     // заголовок группы; осей внутри ДВЕ (3.7.3): горизонталь и глубина
    // свёрнутый заголовок эффекта + правка состава цепи (3.4.3). Пальцы в сводке — римские I–IV
    // (ими приложение обозначает палец везде), оси — стрелки: и то, и другое перевода не требует.
    'fx.sum.play':'глубина',
    'fx.sum.playx':'гориз.',           // сводка: адрес «играющая рука → горизонталь» (та ось, что иначе ведёт громкость)
    'fx.volFix':'Громкость (фикс.)',
    'fx.volFixHint':'Горизонталь играющей руки отдана эффекту, поэтому громкость этой роли ею больше не ведётся — задайте уровень здесь.',
    'fx.sum.fixed':'фикс.',
    'fx.add':'+ Добавить эффект',
    'fx.addAll':'Все эффекты уже в цепи',
    'fx.remove':'Убрать из цепи',
    // O-1: перестановка в последовательной цепи + две зоны списка (что живёт в ноте / что обрабатывает сумму)
    'fx.moveUp':'Раньше в цепи',
    'fx.moveDown':'Позже в цепи',
    'fx.zone.voice':'В ноте',
    'fx.zone.bus':'Общий звук',
    'fx.zone.voiceHint':'Делается внутри голоса, всегда до суммы — порядок тут ни при чём.',
    'fx.zone.busHint':'Обрабатывает все голоса вместе, в этом порядке. Первый подаёт сигнал следующему.',
    'fx.share.title':'Едут вместе:',     // подсказка чипа «×N»: один адрес ведёт несколько параметров (3.4.4)
    'axis.x':'Горизонталь',
    'axis.y':'Вертикаль',
    'axis.z':'Глубина',
    'axis.play.z':'Глубина (играющая рука)',
    'panel.scale.fxCtl':'Конструктор эффектов',
    // выбор роли, чью цепь правим (3.4.1). Роль ВЛАДЕЕТ цепью — отсюда и подпись «цепь роли», а не «роль»
    'fx.role':'Цепь роли',
    'fx.noHand':'Сейчас ни одна рука не назначена на «Эффекты», поэтому пальцевые адреса ниже не действуют. Параметры в режиме «Фиксировано» продолжают работать.',
    'finger.index':'Указательный',
    'finger.middle':'Средний',
    'finger.ring':'Безымянный',
    'finger.pinky':'Мизинец',
    'msg.recording':'● Запись',
    'msg.recStop':'Запись стоп',
    'msg.noLoop':'Нечего играть',
    'msg.play':'▶ Пуск',
    'msg.pause':'⏸ Пауза',
    'msg.noLayers':'Нечего отменять',
    'msg.undo':'↶ Отмена дубля',
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
    'tutor.chHold.prompt':'Можно настроить игру так, что аккорд будет переставать звучать с размыканием пальцев. Опции доступны в «🎛 Звук», в «Функциях рук».',
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
    'tutor.hfWhere.prompt':'Откройте «🎛 Звук» в верхней панели и найдите «Функции рук».',
    'tutor.hfWhere.detail':'Каждая рука получает свою функцию, и для каждой роли она может быть своей. У большинства инструментов это задано раз и навсегда — здесь выбираете вы.',
    'tutor.hfHold.prompt':'Поставьте правую руку на «Ноты (с удержанием)», сыграйте и подвигайте рукой.',
    'tutor.hfHold.detail':'Высота остаётся там, где вы её взяли, как бы далеко ни ушла рука. Громкость по-прежнему следует за рукой, а нота гаснет с размыканием пальцев.',
    'tutor.hfTherm.prompt':'Теперь поставьте ту же руку на «Терменвокс» и играйте.',
    'tutor.hfTherm.detail':'Ступеней больше нет — высота плавно скользит между нотами, а не прыгает по ним.',
    'tutor.hfExpr.prompt':'Поставьте левую руку на «Выразительность», играйте правой и двигайте левой.',
    'tutor.hfExpr.detail':'Эта рука не играет нот — она лепит звук. Движение оживляет его, раскрытая ладонь раскрывает тембр, растопыренные пальцы делают его грубее, наклон добавляет пространства.',
    'tutor.hfLooper.prompt':'Руку можно поставить и на «Лупер» — вести запись пальцами.',
    'tutor.hfLooper.detail':'Её пальцы становятся кнопками: указательный пишет, средний играет или ставит паузу, безымянный отменяет последний дубль.',
    'tutor.hfFinal.prompt':'Ноты, эффекты, выразительность, лупер — назначайте любые функции на любую руку.',
    // обучение — урок «Лупер»
    'tutor.lpRec.prompt':'Мы поставили лад «Мажор». Нажмите ● вверху, дождитесь отсчёта, сыграйте несколько нот — и нажмите ● ещё раз, чтобы остановить.',
    'tutor.lpRec.detail':'Отсчёт — это такт щелчков, он задаёт темп перед началом записи. Запись идёт, пока её не остановят: ● начинает, ● заканчивает. Сыгранное становится дорожкой и играет на таймлайне.',
    'tutor.lpLayer.prompt':'Переключите кнопку роли на «Аккорды» или «Бас», снова нажмите ● и играйте.',
    'tutor.lpLayer.detail':'Каждое нажатие ● записывает новую дорожку, и она звучит вместе с уже записанными. Для этой возьмите аккорды или бас — второй, другой голос поверх мелодии слышнее, чем второе соло.',
    'tutor.lpUndo.prompt':'Нажмите ⤺, чтобы отменить только что записанный дубль.',
    'tutor.lpUndo.detail':'⤺ снимает последний дубль — здесь это вся дорожка, которую вы только что добавили. Если что-то не получилось, отмените и запишите заново.',
    'tutor.lpJam.prompt':'Нажмите 🎵 Подложка и выберите — заиграет готовая подложка, поверх которой можно играть.',
    'tutor.lpJam.detail':'Первый тап спросит, что вам нужно: джем целиком или только ударные. И то и другое — под текущий лад: аккорды и бит там, где они уместны, простой дрон там, где бит был бы неуместен. Дальше каждый тап переключает на следующий вариант.',
    'tutor.lpTempo.prompt':'Откройте панель ⚙ Луп — здесь темп, размер и длина подложки.',
    'tutor.lpTempo.detail':'Размер меняют только на пустой песне: иначе сетка тактов съехала бы под уже записанными нотами. Темп меняется когда угодно — плейхед остаётся на месте.',
    'tutor.lpHand.prompt':'Рука может вести всё это сама, не тянясь к экрану.',
    'tutor.lpHand.detail':'Поставьте руку на «Лупер» в «Функциях рук», и её пальцы станут кнопками — запись, пуск, отмена. Об этом урок «Функции рук».',
    'tutor.lpFinal.prompt':'Это и есть лупер: записать фразу, копить дорожки, свободно отменять — и собрать целую пьесу в одиночку, вживую.',
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
    'lesson.looper.desc':'Запишите дорожки и сложите из них пьесу.',
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
