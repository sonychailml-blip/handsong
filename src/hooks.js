/* tutor — обучающий слой (UI) подписывается СЮДА: нижние слои (gestures) шлют события через hooks.tutor,
   не трогая DOM (правило #5). Одна нуль-обёртка, четыре жест-события (pinch/note/fx/chord) + heartbeat
   'seen' от gestures и 'role' от ui.applyInstr. Смотри src/tutor.js. */
export const hooks = { cleared: null, leadInstr: null, bassInstr: null, drumKit: null, rec: null, loop: null, tutor: null, scales: null, af: null, afRow: null };   // af — AF3: auto-freeze settle hints (kind) from recorder/ui; afRow — AF4: a row's freeze dot for draw; both set by frzqueue.js   // scales — F6: реестр ладов изменился (файл пользователя установлен/удалён) → ui перестраивает меню
