/* RAIN-4d: «After the rain» — warm lo-fi in C Mixolydian, 76 bpm, 16th swing 0.57. Chords (0 C, 1 D, 2 E, 3 F, 4 G, 5 A, 6 Bb), rootless, all safe:
   I9, bVIImaj9, vm9, iii half-diminished. Four progressions: A I rocking to bVII with a vm9 turn, B vm9–bVII–I, C I–vm9–bVII–I, D I–iii–vm9–bVII.
   A round kick, a soft snare, 8th hats with a shaker; the piano on 1 and the «and» of 3. Edit freely (data row «RAIN lo-fi bed (app)»). */
export default {
  format:'handsong/lofi', version:2, id:'rain/lofi-after-the-rain', mood:'mixolydian-hexa', parent:'mixolydian', title:{ en:'After the rain', ru:'После дождя' }, seed:0x415452,
  bpm:76, swing:0.57, lay:{ snare:0.02, hat:0.011 },
  chords:{ 'I9':{ root:0, tones:[2, 6, 1, 5] }, 'bVIImaj9':{ root:6, tones:[1, 3, 5, 0] }, 'vm9':{ root:4, tones:[6, 1, 3, 5] }, 'iii-7b5':{ root:2, tones:[4, 6, 1] } },
  progs:{ A:['I9', 'I9', 'bVIImaj9', 'bVIImaj9', 'I9', 'I9', 'vm9', 'bVIImaj9'], B:['vm9', 'vm9', 'bVIImaj9', 'I9'], C:['I9', 'vm9', 'bVIImaj9', 'I9'], D:['I9', 'iii-7b5', 'vm9', 'bVIImaj9'] },
  flow:{ A:['B', 'C', 'D'], B:['A', 'C'], C:['A', 'D'], D:['A', 'B'] }, first:'A',
  ep:[[[0, 7, 0.55], [8, 7, 0.45]], [[0, 3, 0.5], [3, 5, 0.45], [10, 6, 0.45]], [[0, 12, 0.55]], [[2, 5, 0.48], [10, 5, 0.42]], [[0, 4, 0.5], [6, 3, 0.4], [10, 5, 0.44]]],
  bass:[[[0, 'R', 6, 0.82], [7, '5', 2, 0.58], [8, '8', 3, 0.62], [11, '5', 3, 0.55]], [[0, 'R', 4, 0.82], [6, '3', 2, 0.55], [8, '5', 6, 0.65]], [[0, 'R', 8, 0.82], [10, '5', 4, 0.6]]],
  grooves:[{ kick:[[0, 0.75], [8, 0.55], [11, 0.6]], kickAlt:[[6, 0.42], [14, 0.4]], back:'snare', backV:0.56, hats:'8', hatV:1, shaker:true },
    { kick:[[0, 0.75], [6, 0.42], [8, 0.55], [11, 0.58]], kickAlt:[[3, 0.38]], back:'snare', backV:0.58, hats:'8', hatV:0.95, shaker:true },
    { kick:[[0, 0.72], [10, 0.6]], kickAlt:[[7, 0.42], [13, 0.4]], back:'rim', backV:0.52, hats:'16', hatV:0.9 }],
  motifs:[[[4, 4], [8, 4], [12, 4]], [[0, 2], [2, 2], [4, 6]], [[6, 3], [9, 3], [12, 4]], [[0, 6], [8, 3], [11, 5]], [[2, 4], [8, 8]]] };
