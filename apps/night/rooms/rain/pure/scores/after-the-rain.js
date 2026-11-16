/* RAIN-4b: «After the rain» — an easy, lightly swung groove in C Mixolydian (swing 0.56), 66 bpm, 32 bars: intro 4, A 8, B 8, A 8, ending 4 (the
   room loops A B A). Chords (0 C, 1 D, 2 E, 3 F, 4 G, 5 A, 6 Bb): I9, bVIImaj9, v m9 — every one safe under the playing hand's notes (C D E G A Bb).
   Bass in two with a pickup into the next bar, brushes and a soft kick on 1 and the and of 3, the comping a little behind the beat. Edit freely:
   the data row «RAIN jazz bed (app)» checks every change. */
export default {
  format:'handsong/score', version:1, id:'rain/after-the-rain', mood:'mixolydian-hexa', parent:'mixolydian', title:{ en:'After the rain', ru:'После дождя' },
  bpm:66, feel:'swing', swing:0.56,
  chords:{ 'I9':{ root:0, tones:[2, 6, 1, 5] }, 'bVIImaj9':{ root:6, tones:[1, 3, 5, 0] }, 'vm9':{ root:4, tones:[6, 1, 3, 5] } },
  sections:{
    intro:{ bars:['I9', 'I9', 'bVIImaj9', 'bVIImaj9'], bass:'pedal', drums:'wash', comp:'pads', fill:'pickup' },
    A:{ bars:['I9', 'I9', 'bVIImaj9', 'bVIImaj9', 'I9', 'I9', 'vm9', 'vm9'], bass:'roomy', drums:'light', comp:'after', fill:'taps' },
    B:{ bars:['bVIImaj9', 'bVIImaj9', 'vm9', 'vm9', 'bVIImaj9', 'bVIImaj9', 'I9', 'I9'], bass:'two', drums:'light', comp:'after-b', fill:'taps' },
    end:{ bars:['I9', 'bVIImaj9', 'I9', 'I9'], bass:'pedal', drums:'wash', comp:'pads' } },
  form:['intro', 'A', 'B', 'A', 'end'], loop:1, loopEnd:3,
  bass:{ pedal:[[0, 'R', 3.8]], two:[[0, 'R', 1.9], [2, '5', 1.9]], roomy:[[0, 'R', 1.9], [2, '5', 1.4], [3.5, 'app', 0.45]] },
  drums:{ wash:[[0, 'ride', 0.2, 3], [2, 'tap', 0.16]],
    light:[[0, 'swish', 0.32, 1.9], [2, 'swish', 0.3, 1.9], [1, 'tap', 0.25], [3, 'tap', 0.25], [1, 'hat', 0.15], [3, 'hat', 0.15], [0, 'kick', 0.2], [2.5, 'kick', 0.14]] },
  fills:{ pickup:[[3, 'tap', 0.3], [3.5, 'tap', 0.36]], taps:[[3, 'tap', 0.38], [3.5, 'tap', 0.46], [3.5, 'kick', 0.2]] },
  comp:{ pads:[[0, 3.6, 0.38]], after:[[0.5, 1.4, 0.42], [2, 0.9, 0.3], [3.5, 0.6, 0.28]], 'after-b':[[0, 1.4, 0.4], [2.5, 1.2, 0.34]] },
  vib:{ A:[[7, [[0, 16, 2, 0.45], [2, 14, 2, 0.4]]]], B:[[3, [[0, 12, 1, 0.45], [1, 13, 1, 0.4], [2, 14, 2, 0.45]]]] } };
