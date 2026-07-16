import { scaleIdx, tonic, seventh } from './state.js';

export const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const ROMAN=['I','II','III','IV','V','VI','VII'];
export const OCT_ROMAN=['I','II','III','IV'];
export const range=n=>Array.from({length:n},(_,i)=>i);

/* Каждый лад: edo — на сколько равных шагов делится октава,
   iv — ступени лада в этих шагах, tag — семейство (для аккордов и Smart Match). */
export const SCALES=[
 {name:'Мажор (ионийский)',            grp:'12-TET · диатоника',        edo:12, iv:[0,2,4,5,7,9,11], tag:'dia'},
 {name:'Минор натуральный (эолийский)',grp:'12-TET · диатоника',        edo:12, iv:[0,2,3,5,7,8,10], tag:'dia'},
 {name:'Гармонический минор',          grp:'12-TET · диатоника',        edo:12, iv:[0,2,3,5,7,8,11], tag:'dia'},
 {name:'Мелодический минор',           grp:'12-TET · диатоника',        edo:12, iv:[0,2,3,5,7,9,11], tag:'dia'},
 {name:'Дорийский',                    grp:'12-TET · лады (моды)',      edo:12, iv:[0,2,3,5,7,9,10], tag:'dia'},
 {name:'Фригийский',                   grp:'12-TET · лады (моды)',      edo:12, iv:[0,1,3,5,7,8,10], tag:'dia'},
 {name:'Лидийский',                    grp:'12-TET · лады (моды)',      edo:12, iv:[0,2,4,6,7,9,11], tag:'dia'},
 {name:'Миксолидийский',               grp:'12-TET · лады (моды)',      edo:12, iv:[0,2,4,5,7,9,10], tag:'dia'},
 {name:'Локрийский',                   grp:'12-TET · лады (моды)',      edo:12, iv:[0,1,3,5,6,8,10], tag:'dia'},
 {name:'Венгерский минор',             grp:'12-TET · этнические',       edo:12, iv:[0,2,3,6,7,8,11], tag:'ethnic'},
 {name:'Мажорная пентатоника',         grp:'12-TET · пентатоника/блюз', edo:12, iv:[0,2,4,7,9],      tag:'penta'},
 {name:'Минорная пентатоника',         grp:'12-TET · пентатоника/блюз', edo:12, iv:[0,3,5,7,10],     tag:'penta'},
 {name:'Блюз (с ♭5)',                  grp:'12-TET · пентатоника/блюз', edo:12, iv:[0,3,5,6,7,10],   tag:'blues'},
 {name:'Хроматика (12 нот)',           grp:'12-TET · пентатоника/блюз', edo:12, iv:range(12),        tag:'chrom'},
 {name:'Макам Раст (¼-тоны)',          grp:'Микротоника',               edo:24, iv:[0,4,7,10,14,18,21], tag:'maqam'},
 {name:'Макам Баяти (¼-тоны)',         grp:'Микротоника',               edo:24, iv:[0,3,6,10,14,16,20], tag:'maqam'},
 {name:'19-TET — весь строй',          grp:'Микротоника',               edo:19, iv:range(19),        tag:'edo'},
 {name:'31-TET — весь строй',          grp:'Микротоника',               edo:31, iv:range(31),        tag:'edo'},
];

export const CUR=()=>SCALES[scaleIdx];
export const IVX=()=>CUR().iv.concat([CUR().edo]);          // + верхняя тоника
export const baseF=()=>220*Math.pow(2,(tonic-9)/12);        // частота тоники (C=130.81 Гц)

/* ================= ТЕОРИЯ: СТУПЕНИ, АККОРДЫ, ИМЕНА =================
   МИКРОТОНАЛЬНАЯ ФОРМУЛА: любая ступень n любого строя из N шагов:
       f = f_тоники · 2^(октава) · 2^(n / N)
   Для 12-TET шаг = полутон (100 центов), для 24-TET = четвертьтон (50 центов),
   для 19-TET = 63.2 цента, для 31-TET = 38.7 цента. */
export const isTert=s=>s.tag==='dia'||s.tag==='ethnic'||s.tag==='maqam';
export const fifthStep=edo=>Math.round(edo*Math.log2(1.5)); // шаг, ближайший к чистой квинте 702c
 
/* КОНТЕКСТНАЯ ЛОГИКА АККОРДОВ:
   · 7-ступенчатые лады (диатоника, венгерский, макамы) — наслоение терций:
     индексы i, i+2, i+4 (+ i+6 для септаккордов), % длины массива с переносом октавы;
   · пентатоника / блюз / хроматика — терции дают кашу → пауэр-аккорды (I + V + октава);
   · 19/31-TET — квинту ищем математически: round(N·log2(3/2)) шагов ≈ 700 центов,
     получаются открытые микротональные аккорды без диссонирующих кластеров. */
export function chordSteps(deg){
  const s=CUR(), n=s.iv.length;
  if (isTert(s)){
    const ks=seventh?[0,2,4,6]:[0,2,4];
    return ks.map(k=>{const j=deg+k; return s.iv[j%n]+s.edo*Math.floor(j/n);});
  }
  const r=s.iv[deg%n]+s.edo*Math.floor(deg/n);
  return [r, r+fifthStep(s.edo), r+s.edo];
}
export function leadFreq(deg,oct){ const s=CUR(); return baseF()*Math.pow(2,oct)*Math.pow(2,IVX()[deg]/s.edo); }
export function chordFreqs(deg,oct){ const s=CUR(); // база аккордов на октаву ниже соло
  return chordSteps(deg).map(st=> baseF()/2*Math.pow(2,oct)*Math.pow(2,st/s.edo)); }
 
export function name24(q){ q=((q%24)+24)%24;      // имена четвертьтонов: чётный шаг = обычная нота,
  return q%2 ? NOTE_NAMES[(((q+1)/2)|0)%12]+'½♭' : NOTE_NAMES[(q/2)%12]; } // нечётный = полубемоль
export function stepName(st){ const s=CUR();
  if (s.edo===12) return NOTE_NAMES[(((tonic+st)%12)+12)%12];
  if (s.edo===24) return name24(tonic*2+st);
  return 'ст'+(((st%s.edo)+s.edo)%s.edo);
}
export function rowLabel(deg){ const s=CUR(), ivx=IVX();
  if (s.edo===12||s.edo===24) return stepName(ivx[deg]);
  const st=ivx[deg]%s.edo; return st===0?'Т':String(st);
}
export const centsOf=deg=>Math.round(IVX()[deg]*1200/CUR().edo)%1200;
 
export function qual(t,f){                         // качество трезвучия по интервалам (полутона)
  if(t===4&&f===7)return''; if(t===3&&f===7)return'm';
  if(t===3&&f===6)return'°'; if(t===4&&f===8)return'+';
  if(t===4&&f===6)return'♭5'; if(t===5&&f===7)return'sus4'; if(t===2&&f===7)return'sus2';
  return null;
}
export const SEV={'|11':'maj7','|10':'7','m|10':'m7','m|11':'m(maj7)','°|9':'°7','°|10':'ø',
           '+|11':'+(maj7)','+|10':'+7','♭5|10':'7♭5','sus4|10':'7sus4','sus2|10':'7sus2'};
export function chordLabel(deg){
  const s=CUR(), n=s.iv.length, d=deg%n;
  if (!isTert(s)){
    return s.edo===12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12]+'5' : 'ст'+s.iv[d]+'·5';
  }
  const st=chordSteps(deg), r=st[0];
  if (s.edo===12){
    const root=NOTE_NAMES[(((tonic+r)%12)+12)%12];
    let q=qual(st[1]-r, st[2]-r);
    if (q==null) return root+'?';
    if (seventh){ const sv=st[3]-r; q=SEV[q+'|'+sv] ?? (q+'⁷'); }
    return root+q;
  }
  return ROMAN[d]+(seventh?'⁷':'');         // макам: римская ступень
}
export const chordNotesStr=deg=>chordSteps(deg).map(stepName).join('·');
