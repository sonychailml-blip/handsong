/* RAIN-4d: «Evening boulevard» — the most groove, C Dorian, 82 bpm, 16th swing 0.58. Chords (0 C, 1 D, 2 Eb, 3 F, 4 G, 5 A, 6 Bb), rootless, all safe:
   im9, IV9, bIIImaj7, vi half-diminished. Three progressions: A the i–IV vamp, B bIII–IV–vi–IV, C i–bIII–IV. A boom-bap kick, the snare behind the
   beat, ghosts, 16th hats; the piano pushing the off-beats. Edit freely (data row «RAIN lo-fi bed (app)»). */
export default {
  format:'handsong/lofi', version:2, id:'rain/lofi-evening-boulevard', mood:'dorian-hexa', parent:'dorian', title:{ en:'Evening boulevard', ru:'Вечерний бульвар' }, seed:0x45424F,
  bpm:82, swing:0.58, lay:{ snare:0.018, hat:0.01 },
  chords:{ 'im9':{ root:0, tones:[2, 4, 6, 1] }, 'IV9':{ root:3, tones:[5, 0, 2, 4] }, 'bIIImaj7':{ root:2, tones:[4, 6, 1, 3] }, 'vi-7b5':{ root:5, tones:[0, 2, 4] } },
  progs:{ A:['im9', 'im9', 'IV9', 'IV9'], B:['bIIImaj7', 'IV9', 'vi-7b5', 'IV9'], C:['im9', 'bIIImaj7', 'IV9', 'IV9'] },
  flow:{ A:['A', 'B', 'C'], B:['A', 'C'], C:['A', 'B'] }, first:'A',
  ep:[[[0, 3, 0.55], [3, 4, 0.45], [10, 5, 0.48]], [[0, 6, 0.55], [6, 2, 0.4], [11, 4, 0.45]], [[2, 4, 0.5], [7, 3, 0.42], [12, 4, 0.45]], [[0, 2, 0.5], [3, 2, 0.4], [6, 3, 0.45], [11, 3, 0.4]], [[0, 7, 0.52], [10, 4, 0.44]]],
  bass:[[[0, 'R', 5, 0.85], [7, '5', 2, 0.6], [10, 'R', 3, 0.7]], [[0, 'R', 3, 0.85], [3, '8', 2, 0.55], [8, '5', 4, 0.65], [13, '7', 1, 0.5]], [[0, 'R', 6, 0.85], [6, '3', 2, 0.55], [10, '5', 4, 0.65]]],
  grooves:[{ kick:[[0, 0.8], [3, 0.45], [7, 0.6], [10, 0.7]], kickAlt:[[9, 0.45], [15, 0.4]], back:'snare', backV:0.62, hats:'16', hatV:1 },
    { kick:[[0, 0.8], [7, 0.55], [10, 0.68]], kickAlt:[[9, 0.45], [3, 0.4], [13, 0.4]], back:'snare', backV:0.64, hats:'16', hatV:1.05 },
    { kick:[[0, 0.78], [6, 0.5], [10, 0.7]], kickAlt:[[11, 0.42]], back:'snare', backV:0.6, hats:'8', hatV:1, shaker:true }],
  motifs:[[[4, 2], [6, 2], [8, 4]], [[0, 3], [3, 3], [8, 6]], [[10, 2], [12, 4]], [[2, 2], [4, 2], [7, 3], [12, 4]], [[0, 4], [6, 6]]] };
