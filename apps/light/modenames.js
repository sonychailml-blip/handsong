/* LIGHT-6 — THE MODE AND GROUP NAMES in Light's six added languages (es, pt, de, fr, it, ka). English and Russian come from the mode records
   themselves (L(), core/data); the six live HERE, in the app, because adding them to the shared records would change what Night shows in those
   languages (the founder: Full and Night must not change). Musical terms as commonly used in each language; the Georgian ones await a native
   reader's check (the founder's step). Keyed by the stable mode id and menu group key (rule #25: a display name is never an identifier). */
import { lang } from '../../core/i18n.js';

const IDS=['minor-penta','major','natural-minor','harmonic-minor','melodic-minor','dorian','phrygian','lydian','mixolydian','locrian','hungarian-minor','major-penta','blues','chromatic',
  'harmonic-major','melodic-major','whole-tone','octatonic-wh','octatonic-hw','messiaen-3','phrygian-dominant','double-harmonic','enigmatic','prometheus','egyptian','hungarian-penta',
  'scriabin-penta','major-blues','lydian-penta','dorian-hexa','mixolydian-hexa'];
const GRPS=['diatonic','modes','ethnic','pentaBlues','chromatic','symmetric','exotic','worldPenta'];
const M={
  es:['Pentatónica menor','Mayor (jónico)','Menor natural (eólico)','Menor armónica','Menor melódica','Dórico','Frigio','Lidio','Mixolidio','Locrio','Menor húngara','Pentatónica mayor','Blues (con ♭5)','Cromática (12 notas)',
    'Mayor armónica','Mayor melódica','Tonos enteros','Octatónica (tono-semitono)','Octatónica (semitono-tono)','Modo 3 de Messiaen','Frigio dominante','Doble armónica','Enigmática (Verdi)','Prometeo (Scriabin)','Egipcia (suspendida)','Pentatónica húngara',
    'Pentatónica de Scriabin','Blues mayor','Pentatónica lidia','Hexatónica dórica','Hexatónica mixolidia'],
  pt:['Pentatônica menor','Maior (jônio)','Menor natural (eólio)','Menor harmônica','Menor melódica','Dório','Frígio','Lídio','Mixolídio','Lócrio','Menor húngara','Pentatônica maior','Blues (com ♭5)','Cromática (12 notas)',
    'Maior harmônica','Maior melódica','Tons inteiros','Octatônica (tom-semitom)','Octatônica (semitom-tom)','Modo 3 de Messiaen','Frígio dominante','Dupla harmônica','Enigmática (Verdi)','Prometeu (Scriabin)','Egípcia (suspensa)','Pentatônica húngara',
    'Pentatônica de Scriabin','Blues maior','Pentatônica lídia','Hexatônica dória','Hexatônica mixolídia'],
  de:['Moll-Pentatonik','Dur (ionisch)','Natürliches Moll (äolisch)','Harmonisches Moll','Melodisches Moll','Dorisch','Phrygisch','Lydisch','Mixolydisch','Lokrisch','Ungarisches Moll','Dur-Pentatonik','Blues (mit ♭5)','Chromatisch (12 Töne)',
    'Harmonisches Dur','Melodisches Dur','Ganztonleiter','Oktatonik (Ganz-Halb)','Oktatonik (Halb-Ganz)','Messiaen-Modus 3','Phrygisch-Dominant','Doppelt harmonisch','Enigmatisch (Verdi)','Prometheus (Skrjabin)','Ägyptisch (suspendiert)','Ungarische Pentatonik',
    'Skrjabin-Pentatonik','Dur-Blues','Lydische Pentatonik','Dorische Hexatonik','Mixolydische Hexatonik'],
  fr:['Pentatonique mineure','Majeur (ionien)','Mineur naturel (éolien)','Mineur harmonique','Mineur mélodique','Dorien','Phrygien','Lydien','Mixolydien','Locrien','Mineur hongrois','Pentatonique majeure','Blues (avec ♭5)','Chromatique (12 notes)',
    'Majeur harmonique','Majeur mélodique','Par tons','Octatonique (ton-demi-ton)','Octatonique (demi-ton-ton)','Mode 3 de Messiaen','Phrygien dominant','Double harmonique','Énigmatique (Verdi)','Prométhée (Scriabine)','Égyptienne (suspendue)','Pentatonique hongroise',
    'Pentatonique de Scriabine','Blues majeur','Pentatonique lydienne','Hexatonique dorienne','Hexatonique mixolydienne'],
  it:['Pentatonica minore','Maggiore (ionico)','Minore naturale (eolio)','Minore armonica','Minore melodica','Dorico','Frigio','Lidio','Misolidio','Locrio','Minore ungherese','Pentatonica maggiore','Blues (con ♭5)','Cromatica (12 note)',
    'Maggiore armonica','Maggiore melodica','Esatonale','Ottatonica (tono-semitono)','Ottatonica (semitono-tono)','Modo 3 di Messiaen','Frigio dominante','Doppia armonica','Enigmatica (Verdi)','Prometeo (Skrjabin)','Egiziana (sospesa)','Pentatonica ungherese',
    'Pentatonica di Skrjabin','Blues maggiore','Pentatonica lidia','Esatonica dorica','Esatonica misolidia'],
  ka:['მინორული პენტატონიკა','მაჟორი (იონიური)','ნატურალური მინორი (ეოლიური)','ჰარმონიული მინორი','მელოდიური მინორი','დორიული','ფრიგიული','ლიდიური','მიქსოლიდიური','ლოკრიული','უნგრული მინორი','მაჟორული პენტატონიკა','ბლუზი (♭5-ით)','ქრომატული (12 ნოტა)',
    'ჰარმონიული მაჟორი','მელოდიური მაჟორი','მთელტონიანი','ოქტატონიკა (ტონი-ნახევარტონი)','ოქტატონიკა (ნახევარტონი-ტონი)','მესიანის მე-3 კილო','ფრიგიული დომინანტი','ორმაგი ჰარმონიული','ენიგმატური (ვერდი)','პრომეთე (სკრიაბინი)','ეგვიპტური (შეჩერებული)','უნგრული პენტატონიკა',
    'სკრიაბინის პენტატონიკა','მაჟორული ბლუზი','ლიდიური პენტატონიკა','დორიული ჰექსატონიკა','მიქსოლიდიური ჰექსატონიკა'],
};
const G={
  es:['Diatónicas','Modos','Étnicas','Pentatónicas / blues','Cromática','Simétricas','Exóticas','Pentatónicas del mundo'],
  pt:['Diatônicas','Modos','Étnicas','Pentatônicas / blues','Cromática','Simétricas','Exóticas','Pentatônicas do mundo'],
  de:['Diatonisch','Modi','Ethnisch','Pentatonik / Blues','Chromatisch','Symmetrisch','Exotisch','Pentatonik der Welt'],
  fr:['Diatoniques','Modes','Ethniques','Pentatoniques / blues','Chromatique','Symétriques','Exotiques','Pentatoniques du monde'],
  it:['Diatoniche','Modi','Etniche','Pentatoniche / blues','Cromatica','Simmetriche','Esotiche','Pentatoniche del mondo'],
  ka:['დიატონიკური','კილოები','ეთნიკური','პენტატონიკა / ბლუზი','ქრომატული','სიმეტრიული','ეგზოტიკური','მსოფლიოს პენტატონიკები'],
};
for(const k of Object.keys(M)) if(M[k].length!==IDS.length || G[k].length!==GRPS.length) throw new Error('[light] mode names: '+k+' is incomplete');
/* LIGHT-13b (the founder): twelve scales left Light's list — their names stay in the table above (the scales themselves stay in core's data and in Full) */
const DROPPED=new Set(['octatonic-wh','octatonic-hw','messiaen-3','enigmatic','prometheus','egyptian','hungarian-penta','scriabin-penta','major-blues','lydian-penta','dorian-hexa','mixolydian-hexa']);
export const LIGHT_MODE_IDS=Object.freeze(IDS.filter(id=>!DROPPED.has(id)));
/* the name in the current language: one of the six here, else null (the caller uses the record's own name — English or Russian) */
export const modeNameOf=id=>{ const L=M[lang]; const i=IDS.indexOf(id); return L && i>=0 ? L[i] : null; };
export const groupNameOf=k=>{ const L=G[lang]; const i=GRPS.indexOf(k); return L && i>=0 ? L[i] : null; };
