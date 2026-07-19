import { scaleIdx, tonic, seventh } from './state.js';

export const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const ROMAN=['I','II','III','IV','V','VI','VII'];
export const OCT_ROMAN=['I','II','III','IV'];
export const range=n=>Array.from({length:n},(_,i)=>i);

/* ТРАДИЦИИ (ось 1 UI-MAP) — «в каком музыкальном мире я». Меню строя выбирает традицию,
   меню лада показывает только её лады. Список ведёт порядок традиций в UI. */
export const TRADITIONS=[
  {id:'modal', name:'Ладовая (12-TET)'},
  {id:'arab',  name:'Арабская (24-TET)'},
  {id:'micro', name:'Микротональная'},
  {id:'chrom', name:'Хроматика'},
];

/* Каждый лад: edo — на сколько равных шагов делится октава, iv — ступени лада в этих
   шагах, tag — семейство (для аккордов), trad — традиция (меню строя), grp — подгруппа
   внутри традиции (пусто = без подзаголовка).
   ПОРЯДОК МАССИВА НЕ МЕНЯТЬ и новые лады добавлять В КОНЕЦ: индекс — это scaleIdx,
   на него смотрят state и sameDegrees. Меню фильтрует по trad, а не по порядку. */
export const SCALES=[
 {name:'Мажор (ионийский)',            trad:'modal', grp:'Диатоника',          edo:12, iv:[0,2,4,5,7,9,11], tag:'dia'},
 {name:'Минор натуральный (эолийский)',trad:'modal', grp:'Диатоника',          edo:12, iv:[0,2,3,5,7,8,10], tag:'dia'},
 {name:'Гармонический минор',          trad:'modal', grp:'Диатоника',          edo:12, iv:[0,2,3,5,7,8,11], tag:'dia'},
 {name:'Мелодический минор',           trad:'modal', grp:'Диатоника',          edo:12, iv:[0,2,3,5,7,9,11], tag:'dia'},
 {name:'Дорийский',                    trad:'modal', grp:'Лады (моды)',        edo:12, iv:[0,2,3,5,7,9,10], tag:'dia'},
 {name:'Фригийский',                   trad:'modal', grp:'Лады (моды)',        edo:12, iv:[0,1,3,5,7,8,10], tag:'dia'},
 {name:'Лидийский',                    trad:'modal', grp:'Лады (моды)',        edo:12, iv:[0,2,4,6,7,9,11], tag:'dia'},
 {name:'Миксолидийский',               trad:'modal', grp:'Лады (моды)',        edo:12, iv:[0,2,4,5,7,9,10], tag:'dia'},
 {name:'Локрийский',                   trad:'modal', grp:'Лады (моды)',        edo:12, iv:[0,1,3,5,6,8,10], tag:'dia'},
 {name:'Венгерский минор',             trad:'modal', grp:'Этнические',         edo:12, iv:[0,2,3,6,7,8,11], tag:'ethnic'},
 {name:'Мажорная пентатоника',         trad:'modal', grp:'Пентатоника / блюз', edo:12, iv:[0,2,4,7,9],      tag:'penta'},
 {name:'Минорная пентатоника',         trad:'modal', grp:'Пентатоника / блюз', edo:12, iv:[0,3,5,7,10],     tag:'penta'},
 {name:'Блюз (с ♭5)',                  trad:'modal', grp:'Пентатоника / блюз', edo:12, iv:[0,3,5,6,7,10],   tag:'blues'},
 {name:'Хроматика (12 нот)',           trad:'chrom', grp:'',                   edo:12, iv:range(12),        tag:'chrom', typedChords:true},
 {name:'Макам Раст (¼-тоны)',          trad:'arab',  grp:'',                   edo:24, iv:[0,4,7,10,14,18,21], tag:'maqam', noChords:true},
 {name:'Макам Баяти (¼-тоны)',         trad:'arab',  grp:'',                   edo:24, iv:[0,3,6,10,14,16,20], tag:'maqam', noChords:true},
 {name:'19-TET — весь строй',          trad:'micro', grp:'',                   edo:19, iv:range(19),        tag:'edo',
   chord:[1, 6/5, 3/2], chord7:[1, 6/5, 3/2, 9/5]},   // мин.терция 5ш (+0.2¢), кв.11, мал.7 16ш (−7¢)
 {name:'31-TET — весь строй',          trad:'micro', grp:'',                   edo:31, iv:range(31),        tag:'edo',
   chord:[1, 5/4, 3/2], chord7:[1, 5/4, 3/2, 7/4]},   // маж.терция 10ш (+0.8¢), кв.18, нат.7 25ш (−1.1¢) = 4:5:6:7
 /* Хиджаз: джинс Хиджаз (0-1-4-5 полутонов, характерная увеличенная секунда 2→8
    в четвертях) + джинс Нахаванд сверху. Четвертитонов НЕ содержит — отсюда имя без
    пометки «¼-тоны», хотя традиция та же, 24-TET. Добавлен В КОНЕЦ: индексы не поехали. */
 {name:'Макам Хиджаз',                 trad:'arab',  grp:'',                   edo:24, iv:[0,2,8,10,14,16,20], tag:'maqam', noChords:true},
];

/* Лады традиции — в порядке массива; отдаём вместе с АБСОЛЮТНЫМ индексом,
   потому что value у <option> обязан остаться scaleIdx. */
export const scalesOfTrad=id=>SCALES.map((s,i)=>({i,s})).filter(x=>x.s.trad===id);
export const tradOfScale=i=>SCALES[i].trad;

export const CUR=()=>SCALES[scaleIdx];
export const IVX=()=>CUR().iv.concat([CUR().edo]);          // + верхняя тоника
export const baseF=()=>220*Math.pow(2,(tonic-9)/12);        // частота тоники (C=130.81 Гц)
/* Совместимость ладов для §3.7 (перенос фразы в другой строй возможен лишь при равном
   числе ступеней: 7→7 да, 7→5 нет). UI-уровень — принимает индексы, не хранимые данные. */
export const sameDegrees=(a,b)=>SCALES[a].iv.length===SCALES[b].iv.length;
/* Прогрессии (II–V–I и т.п.) — римские ступени, осмысленны лишь в 7-ступенчатом ладу;
   в пентатонике(5)/блюзе(6)/хроматике(12)/range(19|31) «V» не к чему привязать. */
export const supportsProgressions=(s=CUR())=>s.iv.length===7;
/* Лестницы аккордов нет (арабская традиция: музыка монофонична, трезвучий не строит,
   часть ступеней даёт двойной четвертьтон — муть). Свойство лада, а не строковый tag:
   переживёт перегруппировку ладов по традициям. Гейт ТОЛЬКО живого ввода — переигровка
   слоёв идёт по замороженному sc и обязана звучать как записана (полимодальность). */
export const supportsChords=(s=CUR())=>!s.noChords;
/* Типизированные аккорды (UI-MAP «Хроматика»): аккорд задаётся не ступенью лада, а
   СЕМЕЙСТВОМ (палец левой руки) + ВАРИАНТОМ (сектор по X). Четыре семейства: мажор,
   минор, уменьшённые, sus — только 12-TET Хроматика.
   Тип попадает в событие данными (a.ty = массив интервалов), поэтому ПК и переигровка
   старых петель, где ty нет, идут прежним путём. */
export const typedChords=(s=CUR())=>!!s.typedChords;
/* Интервалы в ПОЛУТОНАХ от корня. Для 12-TET шаг EDO == полутон, поэтому кладутся
   напрямую; для 19/31-TET понадобится пересчёт — это следующий шаг, не сейчас.
   ⚠️ НЕ включать typedChords у edo-ладов, пока пересчёта нет: chordSteps прибавит
   эти числа как ШАГИ лада, и на 19-TET [0,4,7] даст 4/19 вместо терции — молча
   и мимо строя. Гейт держится на свойстве лада, а свойство стоит только у Хроматики.
   Число секторов в семействе задаётся длиной types — 4/3/3/3 разбираются сами. */
export const CHORD_FAMS=[
  {id:'maj', name:'Мажор', finger:0, types:[      // палец: указательный
    {label:'',     iv:[0,4,7]},
    {label:'maj7', iv:[0,4,7,11]},
    {label:'7',    iv:[0,4,7,10]},
    {label:'7#9',  iv:[0,4,7,10,15]},             // 5 голосов — единственный такой
  ]},
  {id:'min', name:'Минор', finger:1, types:[      // палец: средний
    {label:'m',    iv:[0,3,7]},
    {label:'m7',   iv:[0,3,7,10]},
    {label:'mM7',  iv:[0,3,7,11]},                // мин-мажорный септаккорд
  ]},
  {id:'dim', name:'Уменьшённые', finger:2, types:[ // палец: безымянный
    {label:'dim',  iv:[0,3,6]},
    {label:'m7b5', iv:[0,3,6,10]},                // полууменьшённый
    {label:'dim7', iv:[0,3,6,9]},
  ]},
  {id:'sus', name:'Sus', finger:3, types:[        // палец: мизинец
    {label:'sus2',  iv:[0,2,7]},
    {label:'sus4',  iv:[0,5,7]},
    {label:'7sus4', iv:[0,5,7,10]},
  ]},
];
/* Имя корня для подписи типизированного аккорда (тип дописывает вызывающий). */
export const rootName=deg=>{ const s=CUR(), n=s.iv.length, d=((deg%n)+n)%n;
  return s.edo===12 ? NOTE_NAMES[(((tonic+s.iv[d])%12)+12)%12] : 'ст'+s.iv[d]; };

/* ================= ТЕОРИЯ: СТУПЕНИ, АККОРДЫ, ИМЕНА =================
   МИКРОТОНАЛЬНАЯ ФОРМУЛА: любая ступень n любого строя из N шагов:
       f = f_тоники · 2^(октава) · 2^(n / N)
   Для 12-TET шаг = полутон (100 центов), для 24-TET = четвертьтон (50 центов),
   для 19-TET = 63.2 цента, для 31-TET = 38.7 цента. */
export const isTert=s=>s.tag==='dia'||s.tag==='ethnic'||s.tag==='maqam';
export const fifthStep=edo=>Math.round(edo*Math.log2(1.5)); // шаг, ближайший к чистой квинте 702c
const stepFor=(edo,ratio)=>Math.round(edo*Math.log2(ratio)); // шаг, ближайший к чистому интервалу ratio
 
/* КОНТЕКСТНАЯ ЛОГИКА АККОРДОВ:
   · 7-ступенчатые лады (диатоника, венгерский, макамы) — наслоение терций:
     индексы i, i+2, i+4 (+ i+6 для септаккордов), % длины массива с переносом октавы;
   · пентатоника / блюз / хроматика — терции дают кашу → пауэр-аккорды (I + V + октава);
   · 19/31-TET — квинту ищем математически: round(N·log2(3/2)) шагов ≈ 700 центов,
     получаются открытые микротональные аккорды без диссонирующих кластеров. */
/* s (лад) и sev (септаккорд?) — параметры со значениями по умолчанию из живого состояния:
   петля передаёт СВОЙ замороженный лад/септаккорд (§3.4), живой ввод — берёт текущие. */
export function chordSteps(deg, s=CUR(), sev=seventh, ty=null){
  const n=s.iv.length;
  if (ty){                                   // типизированный аккорд: интервалы от корня, лад не диктует
    const r=s.iv[((deg%n)+n)%n]+s.edo*Math.floor(deg/n);
    return ty.map(iv=>r+iv);
  }
  if (isTert(s)){
    const ks=sev?[0,2,4,6]:[0,2,4];
    return ks.map(k=>{const j=deg+k; return s.iv[j%n]+s.edo*Math.floor(j/n);});
  }
  const r=s.iv[deg%n]+s.edo*Math.floor(deg/n);
  if (s.tag==='edo'){
    /* Мезотоника (19/31-TET): аккорд строим ПО ИНТЕРВАЛУ, не по индексу.
       Отношения заданы на ладе (chord/chord7); 31-TET септаккорд = 4:5:6:7. */
    const rs=sev?s.chord7:s.chord;
    return rs.map(ra=>r+stepFor(s.edo,ra));
  }
  return [r, r+fifthStep(s.edo), r+s.edo];   // пентатоника/блюз/хроматика — пауэр-аккорд как раньше
}
/* Модуло-страховка: ступень вне лада (перенос фразы в лад покороче, §3.7) заворачивается
   с переносом октавы — сохраняет контур, не роняет частоту в NaN. При ступени внутри лада
   это тождество (i=deg, o=oct). CLAUDE.md: тихого NaN быть не должно. */
export function leadFreq(deg,oct, s=CUR()){ const ivx=s.iv.concat([s.edo]), len=ivx.length;
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  return baseF()*Math.pow(2,o)*Math.pow(2,ivx[i]/s.edo); }
export function bassFreq(deg,oct, s=CUR()){ const ivx=s.iv.concat([s.edo]), len=ivx.length; // бас на 2 октавы ниже соло (baseF/4)
  const i=((deg%len)+len)%len, o=oct+Math.floor(deg/len);
  return baseF()/4*Math.pow(2,o)*Math.pow(2,ivx[i]/s.edo); }
export function chordFreqs(deg,oct, s=CUR(), sev=seventh, ty=null){ // база аккордов на октаву ниже соло
  return chordSteps(deg,s,sev,ty).map(st=> baseF()/2*Math.pow(2,oct)*Math.pow(2,st/s.edo)); }
 
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
