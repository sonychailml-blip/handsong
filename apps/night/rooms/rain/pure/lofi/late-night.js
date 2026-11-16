/* RAIN-4d: «Late night» — dreamy lo-fi in C Lydian, 70 bpm, a light 16th swing (0.55), sparse. Chords (0 C, 1 D, 2 E, 3 F#, 4 G, 5 A, 6 B), rootless,
   every one safe under the playing hand's notes: Imaj9, Imaj7#11, II9, vi9, #iv half-diminished. Three progressions that follow each other (flow):
   A the I–II sway, B vi9 down through #iv to II, C a short I–vi–II turn. Grooves, bass lines, comping rhythms and phrase rhythms are the material
   the player draws every bar from (apps/night/pure/lofi.js). Edit freely: the data row «RAIN lo-fi bed (app)» checks every change. */
export default {
  format:'handsong/lofi', version:2, id:'rain/lofi-late-night', mood:'lydian-penta', parent:'lydian', title:{ en:'Late night', ru:'Поздняя ночь' }, seed:0x4C4E31,
  bpm:70, swing:0.55, lay:{ snare:0.022, hat:0.012 },
  chords:{ 'Imaj9':{ root:0, tones:[2, 6, 1, 4] }, 'Imaj7#11':{ root:0, tones:[2, 4, 6, 3] }, 'II9':{ root:1, tones:[3, 5, 0, 2] }, 'vi9':{ root:5, tones:[0, 2, 4, 6] }, '#iv-7b5':{ root:3, tones:[5, 0, 2] } },
  progs:{ A:['Imaj9', 'Imaj9', 'II9', 'II9', 'Imaj7#11', 'Imaj7#11', 'II9', 'II9'], B:['vi9', 'vi9', '#iv-7b5', 'II9', 'vi9', 'vi9', 'II9', 'II9'], C:['Imaj9', 'vi9', 'II9', 'II9'] },
  flow:{ A:['B', 'C', 'A'], B:['A', 'C'], C:['A', 'B'] }, first:'A',
  /* comping rhythms [step 0…15, length in 16ths, velocity] */
  ep:[[[0, 15, 0.55]], [[0, 6, 0.55], [7, 8, 0.4]], [[0, 10, 0.5], [11, 5, 0.38]], [[2, 12, 0.48]], [[0, 3, 0.5], [6, 9, 0.42]]],
  /* bass lines [step, token, length, velocity]: R the root, 2…9 the chord's scale steps up, 8 the octave, app / app+ under / over the next root */
  bass:[[[0, 'R', 7, 0.8], [8, '5', 5, 0.62]], [[0, 'R', 10, 0.8], [11, '8', 3, 0.55]], [[0, 'R', 6, 0.8], [6, '3', 2, 0.5], [8, '5', 6, 0.6]]],
  /* grooves: kicks [step, velocity], alternatives, the backbeat (rim or snare), the hats (8, 16 or off8), a shaker */
  grooves:[{ kick:[[0, 0.7], [10, 0.5]], kickAlt:[[7, 0.4], [11, 0.45], [9, 0.38]], back:'rim', backV:0.5, hats:'off8', hatV:1.1 },
    { kick:[[0, 0.7], [9, 0.42], [11, 0.5]], kickAlt:[[6, 0.38]], back:'rim', backV:0.5, hats:'8', hatV:0.9, shaker:true }],
  /* phrase rhythms [step, length] — the notes are drawn inside the mode, safe over the bar's chord */
  motifs:[[[4, 4], [8, 4], [12, 6]], [[0, 6], [8, 8]], [[2, 2], [4, 2], [6, 6]], [[6, 4], [10, 6]], [[0, 2], [3, 3], [8, 4], [12, 4]]] };
