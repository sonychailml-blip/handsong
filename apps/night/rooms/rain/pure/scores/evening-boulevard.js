/* RAIN-4b: «Evening boulevard» — a medium swing in C Dorian, swung eighths (0.64), 72 bpm, 32 bars: intro 4, A 8, B 8, A 8, ending 4 (the room
   loops A B A). Chords (0 C, 1 D, 2 Eb, 3 F, 4 G, 5 A, 6 Bb): i m9, IV9, bIIImaj7, vi half-diminished — every one safe under the playing hand's
   notes (C D Eb F G A). A walking bass in A and B (root, third, fifth, an approach into the next bar), a feathered ride with the hi-hat on 2 and 4
   and a soft four-on-the-floor kick, Charleston comping. Edit freely: the data row «RAIN jazz bed (app)» checks every change. */
export default {
  format:'handsong/score', version:1, id:'rain/evening-boulevard', mood:'dorian-hexa', parent:'dorian', title:{ en:'Evening boulevard', ru:'Вечерний бульвар' },
  bpm:72, feel:'swing', swing:0.64,
  chords:{ 'im9':{ root:0, tones:[2, 4, 6, 1] }, 'IV9':{ root:3, tones:[5, 0, 2, 4] }, 'bIIImaj7':{ root:2, tones:[4, 6, 1, 3] }, 'vi-7b5':{ root:5, tones:[0, 2, 4] } },
  sections:{
    intro:{ bars:['im9', 'im9', 'IV9', 'IV9'], bass:'two', drums:'brush', comp:'pads', fill:'pickup' },
    A:{ bars:['im9', 'im9', 'IV9', 'IV9', 'im9', 'im9', 'IV9', 'IV9'], bass:'walk', drums:'ride', comp:'charleston', fill:'swing' },
    B:{ bars:['bIIImaj7', 'bIIImaj7', 'vi-7b5', 'vi-7b5', 'IV9', 'IV9', 'im9', 'IV9'], bass:'walk-b', drums:'ride', comp:'push', fill:'swing' },
    end:{ bars:['im9', 'IV9', 'im9', 'im9'], bass:'two', drums:'brush', comp:'pads' } },
  form:['intro', 'A', 'B', 'A', 'end'], loop:1, loopEnd:3,
  bass:{ two:[[0, 'R', 1.9], [2, '5', 1.9]], walk:[[0, 'R', 0.95], [1, '3', 0.95], [2, '5', 0.95], [3, 'app', 0.95]], 'walk-b':[[0, 'R', 0.95], [1, '5', 0.95], [2, '6', 0.95], [3, 'app+', 0.95]] },
  drums:{ brush:[[0, 'swish', 0.32, 1.9], [2, 'swish', 0.3, 1.9], [1, 'tap', 0.24], [3, 'tap', 0.24]],
    ride:[[0, 'ride', 0.3, 1], [1, 'ride', 0.34, 1], [1.5, 'ride', 0.2, 0.5], [2, 'ride', 0.3, 1], [3, 'ride', 0.34, 1], [3.5, 'ride', 0.2, 0.5], [1, 'hat', 0.22], [3, 'hat', 0.22],
      [0, 'kick', 0.12], [1, 'kick', 0.09], [2, 'kick', 0.12], [3, 'kick', 0.09]] },
  fills:{ pickup:[[3, 'tap', 0.32], [3.5, 'tap', 0.4]], swing:[[2.5, 'tap', 0.38], [3, 'tap', 0.46], [3.5, 'tap', 0.52], [3.5, 'kick', 0.26]] },
  comp:{ pads:[[0, 3.6, 0.38]], charleston:[[0, 0.8, 0.45], [1.5, 0.8, 0.38]], push:[[0, 0.6, 0.4], [2.5, 0.8, 0.42]] },
  vib:{ B:[[1, [[0, 14, 1, 0.5], [1.5, 13, 1, 0.45], [2, 12, 2, 0.45]]], [5, [[0, 11, 1, 0.45], [1, 12, 1, 0.45], [2, 14, 2, 0.5]]]], end:[[3, [[0, 14, 1, 0.45], [1, 12, 3, 0.4]]]] } };
