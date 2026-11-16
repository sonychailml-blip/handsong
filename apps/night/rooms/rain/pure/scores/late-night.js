/* RAIN-4b: «Late night» — a slow ballad in C Lydian, straight eighths, 64 bpm, 32 bars: intro 4, A 8, B 8, A 8, ending 4 (the room loops A B A).
   Chords as the parent's degrees (0 C, 1 D, 2 E, 3 F#, 4 G, 5 A, 6 B), voiced rootless: Imaj7#11, II9, vi9, #iv half-diminished — every one safe
   under the playing hand's notes (C D E F# A). Bass in two (root and fifth), brushes swept on 1 and 3, tapped on 2 and 4. Edit freely: the data
   row «RAIN jazz bed (app)» checks every change. */
export default {
  format:'handsong/score', version:1, id:'rain/late-night', mood:'lydian-penta', parent:'lydian', title:{ en:'Late night', ru:'Поздняя ночь' },
  bpm:64, feel:'straight', swing:0.5,
  chords:{ 'Imaj7#11':{ root:0, tones:[2, 4, 6, 3] }, 'Imaj9':{ root:0, tones:[2, 6, 1, 4] }, 'II9':{ root:1, tones:[3, 5, 0, 2] }, 'vi9':{ root:5, tones:[0, 2, 4, 6] }, '#iv-7b5':{ root:3, tones:[5, 0, 2] } },
  sections:{
    intro:{ bars:['Imaj7#11', 'Imaj7#11', 'II9', 'II9'], bass:'pedal', drums:'soft', comp:'pads', fill:'pickup' },
    A:{ bars:['Imaj7#11', 'Imaj7#11', 'II9', 'II9', 'vi9', 'vi9', 'II9', 'II9'], bass:'two', drums:'ballad', comp:'ballad', fill:'taps' },
    B:{ bars:['vi9', 'vi9', '#iv-7b5', '#iv-7b5', 'II9', 'II9', 'Imaj9', 'Imaj9'], bass:'two-app', drums:'ballad', comp:'ballad-b', fill:'taps' },
    end:{ bars:['Imaj7#11', 'II9', 'Imaj9', 'Imaj9'], bass:'pedal', drums:'soft', comp:'pads' } },
  form:['intro', 'A', 'B', 'A', 'end'], loop:1, loopEnd:3,
  bass:{ pedal:[[0, 'R', 3.8]], two:[[0, 'R', 1.9], [2, '5', 1.9]], 'two-app':[[0, 'R', 1.9], [2, '5', 0.9], [3, 'app', 0.9]] },
  drums:{ soft:[[0, 'swish', 0.3, 3.6], [2, 'tap', 0.18]],
    ballad:[[0, 'swish', 0.36, 1.9], [2, 'swish', 0.32, 1.9], [1, 'tap', 0.26], [3, 'tap', 0.26], [1, 'hat', 0.16], [3, 'hat', 0.16], [0, 'kick', 0.2]] },
  fills:{ pickup:[[3, 'tap', 0.3], [3.5, 'tap', 0.38]], taps:[[3, 'tap', 0.4], [3.5, 'tap', 0.5], [3.5, 'kick', 0.22]] },
  comp:{ pads:[[0, 3.8, 0.4]], ballad:[[0, 1.8, 0.45], [2.5, 1.3, 0.32]], 'ballad-b':[[0, 0.9, 0.42], [1.5, 1.5, 0.35], [3, 0.9, 0.28]] },
  vib:{ B:[[1, [[0, 14, 2, 0.5], [2, 16, 1.5, 0.45]]], [5, [[0.5, 13, 1.5, 0.45], [2, 12, 2, 0.4]]]], end:[[3, [[0, 14, 4, 0.45]]]] } };
