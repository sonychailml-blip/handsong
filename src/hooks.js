/* tutor — обучающий слой (UI) подписывается СЮДА: нижние слои (gestures) шлют события через hooks.tutor,
   не трогая DOM (правило #5). Одна нуль-обёртка, четыре жест-события (pinch/note/fx/chord) + heartbeat
   'seen' от gestures и 'role' от ui.applyInstr. Смотри src/tutor.js. */
export const hooks = { leadInstr: null, bassInstr: null, drumKit: null, rec: null, loop: null, tutor: null };
