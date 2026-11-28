/* LIGHT-11 — LIGHT'S TIMBRES (the founder: few but good, from different families; a lead is the heart of Light; 2–3 basses; a timbre per hand).
   Fourteen in six groups. Eight are core's built-in solo records (the profile's list, data/light.json); six are LIGHT'S OWN records, written here
   from published synthesis methods on core's engines (breath: harmonics + formants + breath noise + its own vibrato; subtractive: oscillators
   through a lowpass with a strike; Karplus–Strong string) and installed for the session through core's door (audio.timbreInstall — pack ids
   «light/…», checked by core's bounds T5, never in Full's lists, as Night's rain room does). Each entry: its group, its name in Light's eight
   languages, a level trim in dB (audio.setTimbreTrim; measured so the timbres sit at one loudness — tools/.out/light11-levels.txt) and, for the
   basses, the octave shift a hand takes when it picks one (−1: a bass hand plays an octave lower). */
import { timbreInstall, setTimbreTrim, timbreIdx } from '../../core/audio.js';
import { lang } from '../../core/i18n.js';

const POL=Object.freeze({ voiceMode:'poly', glide:0.02, register:'solo', quant:0 });
const rec=(id, engine, name, recipe, env, pol)=>({ format:'handsong/timbre', version:1, id, family:'solo', engine, name, recipe, env, policies:{ ...POL, ...(pol||{}) } });
/* Light's own records (their names below carry the eight languages; the record's own name is English and Russian) */
export const LIGHT_RECORDS=Object.freeze([
  /* a warm singing lead: rounded harmonics, a slow vibrato that grows in, a little air — between a flute and a synthesizer */
  rec('light/soft-lead', 'breath', { en:'Soft lead', ru:'Мягкий лид' }, {
    harm:[{ m:1, g:0.46, w:'triangle' }, { m:2, g:0.16 }, { m:3, g:0.085 }, { m:4, g:0.04 }, { m:5, g:0.02 }],
    lvl:1.1, lp:4200, vb:0.45, body:{ hz:900, q:0.9, db:2 },
    air:{ g:0.012, hz:4800, q:0.7 }, vib:{ rate:5.2, cents:11, amp:0.035, delay:0.38, rise:0.8 }, drift:{ cents:2.5, rate:0.1 }, scoop:-10 },
    { att:0.035, rel:0.3 }, { glide:0.05 }),
  /* a round bass: a sine with its octave below and a soft triangle, a short filter pluck — the finger-played bass */
  rec('light/bass-round', 'subtractive', { en:'Round bass', ru:'Круглый бас' }, {
    filter:{ freq:520, Q:0.9 }, oscs:[{ wave:'sine', mult:1, gain:0.5 }, { wave:'sine', mult:0.5, gain:0.28 }, { wave:'triangle', mult:1, gain:0.22 }],
    strike:{ open:3, tc:0.09, fv:0 } },
    { att:0.006, rel:0.14 }),
  /* a synth bass: two detuned saws and a square an octave down through a resonant filter that snaps open */
  rec('light/bass-synth', 'subtractive', { en:'Synth bass', ru:'Синт-бас' }, {
    filter:{ freq:380, Q:5 }, oscs:[{ wave:'sawtooth', mult:1, gain:0.26, detune:-7 }, { wave:'sawtooth', mult:1, gain:0.26, detune:7 }, { wave:'square', mult:0.5, gain:0.2 }],
    strike:{ open:6, tc:0.13, fv:0 } },
    { att:0.004, rel:0.1 }),
  /* a plucked bass: a long low string (Karplus–Strong) with a wooden body */
  rec('light/bass-pluck', 'ks', { en:'Plucked bass', ru:'Щипковый бас' }, {
    fb:0.995, damp:0.7, exBase:0.22, exSpan:0.35, body:{ hz:140, Q:1.1, db:6 } },
    { att:0.002, rel:0.5 }),
  /* bowed strings: two detuned saws and an octave, a body resonance and a slow bow attack, a late gentle vibrato */
  rec('light/strings', 'breath', { en:'Strings', ru:'Струнные' }, {
    harm:[{ m:1, g:0.3, w:'sawtooth', dt:-6 }, { m:1, g:0.3, w:'sawtooth', dt:6 }, { m:2, g:0.1, w:'sawtooth' }],
    lvl:1.2, lp:3600, vb:0.3, body:{ hz:480, q:1.3, db:3 }, formants:[{ hz:700, q:0.7, g:0.9 }, { hz:2400, q:1.2, g:0.4 }],   // with formants the whole sound passes through them (breath.js): wide and strong
    noise:{ g:0.04, q:3, m:1, on:1.5 }, vib:{ rate:5.6, cents:8, amp:0.02, delay:0.5, rise:1 }, drift:{ cents:3, rate:0.12 } },
    { att:0.22, rel:0.55 }),
  /* brass: a bright full spectrum, two formants, a lip scoop into the note and a breathy start */
  rec('light/brass', 'breath', { en:'Brass', ru:'Медные' }, {
    harm:[{ m:1, g:0.34 }, { m:2, g:0.3 }, { m:3, g:0.22 }, { m:4, g:0.15 }, { m:5, g:0.1 }, { m:6, g:0.065 }, { m:7, g:0.04 }, { m:8, g:0.025 }],
    lvl:1.5, lp:5200, vb:0.6, body:{ hz:1250, q:1.2, db:3 }, formants:[{ hz:1300, q:1.1, g:0.9 }, { hz:2700, q:1.8, g:0.45 }],
    noise:{ g:0.08, q:4, m:1, on:2 }, chiff:{ g:0.25, m:1, q:2, d:0.05 }, vib:{ rate:5.4, cents:9, amp:0.03, delay:0.5, rise:0.9 }, drift:{ cents:2, rate:0.1 }, scoop:-30 },
    { att:0.06, rel:0.22 }),
]);
/* the fourteen in the sheet's order, by group; dB = the level trim; oct = a hand's octave shift when it picks a bass */
export const LIGHT_GROUPS=Object.freeze(['lead','keys','winds','strings','bass','other']);
export const LIGHT_TIMBRES=Object.freeze([
  { id:'solo.supersaw', group:'lead', dB:0 },
  { id:'light/soft-lead', group:'lead', dB:-3.5 },
  { id:'solo.firefly', group:'keys', dB:14 },
  { id:'solo.organ', group:'keys', dB:-4 },
  { id:'solo.breath-flute', group:'winds', dB:0 },
  { id:'solo.reed', group:'winds', dB:1.5 },
  { id:'light/brass', group:'winds', dB:-3.5 },
  { id:'light/strings', group:'strings', dB:3 },
  { id:'solo.guitar', group:'strings', dB:4 },
  { id:'light/bass-round', group:'bass', dB:-5, oct:-1 },
  { id:'light/bass-synth', group:'bass', dB:0, oct:-1 },
  { id:'light/bass-pluck', group:'bass', dB:2, oct:-1 },
  { id:'solo.kalimba', group:'other', dB:0 },
  { id:'solo.warm-pad', group:'other', dB:2 },
].map(Object.freeze));
const NAMES={
  'solo.supersaw':     { en:'SuperSaw', ru:'Суперсо', es:'SuperSaw', pt:'SuperSaw', de:'SuperSaw', fr:'SuperSaw', it:'SuperSaw', ka:'სუპერსო' },
  'light/soft-lead':   { en:'Soft lead', ru:'Мягкий лид', es:'Lead suave', pt:'Lead suave', de:'Weicher Lead', fr:'Lead doux', it:'Lead morbido', ka:'რბილი ლიდი' },
  'solo.firefly':      { en:'Electric piano', ru:'Электропиано', es:'Piano eléctrico', pt:'Piano elétrico', de:'E-Piano', fr:'Piano électrique', it:'Piano elettrico', ka:'ელექტროპიანინო' },
  'solo.organ':        { en:'Organ', ru:'Орган', es:'Órgano', pt:'Órgão', de:'Orgel', fr:'Orgue', it:'Organo', ka:'ორღანი' },
  'solo.breath-flute': { en:'Flute', ru:'Флейта', es:'Flauta', pt:'Flauta', de:'Flöte', fr:'Flûte', it:'Flauto', ka:'ფლეიტა' },
  'solo.reed':         { en:'Reed', ru:'Язычковый', es:'Lengüeta', pt:'Palheta', de:'Rohrblatt', fr:'Anche', it:'Ancia', ka:'ენაკიანი' },
  'light/brass':       { en:'Brass', ru:'Медные', es:'Metales', pt:'Metais', de:'Blech', fr:'Cuivres', it:'Ottoni', ka:'სპილენძის ჩასაბერი' },
  'light/strings':     { en:'Strings', ru:'Струнные', es:'Cuerdas', pt:'Cordas', de:'Streicher', fr:'Cordes', it:'Archi', ka:'სიმებიანი' },
  'solo.guitar':       { en:'Guitar', ru:'Гитара', es:'Guitarra', pt:'Violão', de:'Gitarre', fr:'Guitare', it:'Chitarra', ka:'გიტარა' },
  'light/bass-round':  { en:'Round bass', ru:'Круглый бас', es:'Bajo redondo', pt:'Baixo redondo', de:'Runder Bass', fr:'Basse ronde', it:'Basso rotondo', ka:'მრგვალი ბასი' },
  'light/bass-synth':  { en:'Synth bass', ru:'Синт-бас', es:'Bajo sintetizado', pt:'Baixo sintetizado', de:'Synthbass', fr:'Basse synthé', it:'Basso synth', ka:'სინთ-ბასი' },
  'light/bass-pluck':  { en:'Plucked bass', ru:'Щипковый бас', es:'Bajo pulsado', pt:'Baixo dedilhado', de:'Gezupfter Bass', fr:'Basse pincée', it:'Basso pizzicato', ka:'პიციკატო ბასი' },
  'solo.kalimba':      { en:'Kalimba', ru:'Калимба', es:'Kalimba', pt:'Kalimba', de:'Kalimba', fr:'Kalimba', it:'Kalimba', ka:'კალიმბა' },
  'solo.warm-pad':     { en:'Warm pad', ru:'Тёплый пэд', es:'Pad cálido', pt:'Pad quente', de:'Warmes Pad', fr:'Nappe chaude', it:'Pad caldo', ka:'თბილი პედი' },
};
const GROUP_NAMES={
  lead:    { en:'Lead', ru:'Лид', es:'Lead', pt:'Lead', de:'Lead', fr:'Lead', it:'Lead', ka:'ლიდი' },
  keys:    { en:'Keys', ru:'Клавишные', es:'Teclados', pt:'Teclados', de:'Tasten', fr:'Claviers', it:'Tastiere', ka:'კლავიშიანი' },
  winds:   { en:'Winds', ru:'Духовые', es:'Vientos', pt:'Sopros', de:'Bläser', fr:'Vents', it:'Fiati', ka:'ჩასაბერი' },
  strings: { en:'Strings', ru:'Струнные', es:'Cuerdas', pt:'Cordas', de:'Saiten', fr:'Cordes', it:'Corde', ka:'სიმებიანი' },
  bass:    { en:'Bass', ru:'Бас', es:'Bajo', pt:'Baixo', de:'Bass', fr:'Basse', it:'Basso', ka:'ბასი' },
  other:   { en:'More', ru:'Ещё', es:'Más', pt:'Mais', de:'Mehr', fr:'Autres', it:'Altri', ka:'სხვა' },
};
export const timbreName=id=>{ const n=NAMES[id]; return n ? (n[lang]||n.en) : id; };
export const timbreGroupName=g=>{ const n=GROUP_NAMES[g]; return n ? (n[lang]||n.en) : g; };
export const timbreEntry=id=>LIGHT_TIMBRES.find(t=>t.id===id)||null;
/* the own records into core (once; a refused one is left out of the list, with its reason kept) and the level trims → the refusals */
const refused=[];
let installed=false;
export function lightTimbresInstall(){
  if(installed) return refused.slice(); installed=true;
  for(const r of LIGHT_RECORDS){ const why=timbreInstall(r); if(why){ refused.push(r.id+': '+why); console.warn('[light] timbre '+r.id+' refused — '+why); } }   // eslint-disable-line no-console
  setTimbreTrim(Object.fromEntries(LIGHT_TIMBRES.filter(t=>t.dB).map(t=>[t.id, t.dB])));
  return refused.slice();
}
/* the list a person can pick from: the fourteen that core knows */
export const lightTimbresAvailable=()=>LIGHT_TIMBRES.filter(t=>timbreIdx('ld', t.id)!=null);
