/* ======================================================================
   Карплюс–Стронг (щипковая струна) как АУДИО-ВОРКЛЕТ — третий способ построить
   голос, рядом с субтрактивным и FM (не вместо них).

   ПОЧЕМУ ворклет, а НЕ нативные узлы (DelayNode+BiquadFilter):
   петля KS — это линия задержки, замкнутая через фильтр обратной связью, т.е.
   ЦИКЛ в графе. Web Audio считает блоками по 128 сэмплов, и ЛЮБОЙ цикл получает
   принудительный минимум в один квант = 128 сэмплов. При 44.1 кГц это пол ≈ 344 Гц:
   любая нота ВЫШЕ недостижима (петлю не сделать короче), а delayTime нативного
   DelayNode ещё и квантуется по сэмплам → детонирует даже те ноты, что доступны.
   Для микротонального инструмента (центовые строи, 22 шрути, темперации) это
   неприемлемо. В ворклете линия задержки — обычный Float32Array, читаемый с ДРОБНОЙ
   задержкой (аллпас-фильтр 1-го порядка), поэтому строй точный (<1 цента) и весь
   диапазон доступен.

   Настройка строя: полная длина петли = sampleRate/freq. Из неё ВЫЧИТАЕМ фазовую
   задержку петлевого 2-точечного фильтра (≈damp сэмпла на основном тоне; при damp=0.5 —
   ровно 0.5, линейная фаза), остаток делим на ЦЕЛУЮ часть (сдвиг чтения) + ДРОБНУЮ (аллпас).
   Итог round-trip = sampleRate/freq точно при любом damp. freq — a-rate: L пересчитывается
   КАЖДЫЙ сэмпл, поэтому глиссандо непрерывно (скольжение указателя чтения, без щелчков).
   pluck — a-rate, ловим ФРОНТ (0→>0) для сэмпл-точного щипка; значение = сила/яркость (lastVel).
   Тембр банка (fb, damp, яркость щипка, нелинейность, резонаторы) задаётся в buildKSBank/KS_BANKS. */
class KSProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(){
    return [
      {name:'freq',  defaultValue:220, minValue:20, maxValue:12000, automationRate:'a-rate'},
      {name:'pluck', defaultValue:0,   minValue:0,  maxValue:1,     automationRate:'a-rate'},
    ];
  }
  constructor(opts){
    super();
    /* Параметры банка (per-voice, из processorOptions — НЕ автоматизируются, это константы тембра).
       Дефолты = прежние жёсткие значения, поэтому «Струна»/«Ситар» остаются байт-в-байт. */
    const o=(opts&&opts.processorOptions)||{};
    this.nl   = o.nl!=null?o.nl:0;         // нелинейность в петле (джавари/металл): 0=нет, ситар 2.5, сантур ~1.2
    this.fb   = o.fb!=null?o.fb:0.992;     // обратная связь (длина затухания струны)
    this.damp = o.damp!=null?o.damp:0.5;   // коэффициент петлевого фильтра (вес x[n-1]); 0.5 = МАКСИМУМ затухания верхов (усреднитель), дальше от 0.5 = ярче
    this.exBase = o.exBase!=null?o.exBase:0.15;   // яркость щипка при тихой ноте (см. cut в process)
    this.exSpan = o.exSpan!=null?o.exSpan:0.8;    // насколько громче → ярче
    this.N=Math.ceil(sampleRate/20)+8;    // макс. длина линии (для 20 Гц) + запас
    this.buf=new Float32Array(this.N);
    this.wr=0;                            // индекс записи
    this.apX=0; this.apY=0;              // состояние аллпаса (дробная задержка)
    this.avg=0;                          // предыдущий вход петлевого фильтра
    this.prevPluck=0;
  }
  /* Щипок: заполняем ХВОСТ линии (L сэмплов перед указателем записи) шумом. amp — громкость,
     cut — коэффициент предфильтра яркости (мягкий щипок темнее): 0=ярко, →1=глухо. */
  excite(L,amp,cut){
    let z=0;
    for(let i=0;i<L;i++){
      const n=Math.random()*2-1;
      z=cut*z+(1-cut)*n;                  // одно-полюсный предфильтр по шуму
      const idx=(this.wr-L+i+this.N)%this.N;
      this.buf[idx]=z*amp;
    }
  }
  process(inputs,outputs,params){
    const out=outputs[0][0]; if(!out) return true;
    const fA=params.freq, pA=params.pluck;
    const fC=fA.length===1, pC=pA.length===1;
    for(let i=0;i<out.length;i++){
      const pl=pC?pA[0]:pA[i];
      if(pl>0 && this.prevPluck<=0){       // ФРОНТ pluck → щипок (сэмпл-точно)
        const f=fC?fA[0]:fA[i];
        const L=Math.max(2,Math.round(sampleRate/Math.max(20,f)));
        const cut=Math.max(0,Math.min(0.97,1-(this.exBase+this.exSpan*pl)));   // громче → ярче; база/размах — per-bank
        this.excite(L,0.5+0.5*pl,cut);
      }
      this.prevPluck=pl;

      const f=fC?fA[0]:fA[i];
      let Lf=sampleRate/Math.max(20,f)-this.damp;   // вычитаем фазовую задержку петлевого фильтра (≈damp на основном тоне) → строй точный при любом damp
      if(Lf<2) Lf=2;
      const Li=Math.floor(Lf), frac=Lf-Li;
      const eta=(1-frac)/(1+frac);            // коэффициент аллпаса для дробной задержки
      const ri=(this.wr-Li+this.N)%this.N;
      const d=this.buf[ri];
      const y=eta*d+this.apX-eta*this.apY;    // аллпас 1-го порядка (дробная задержка)
      this.apX=d; this.apY=y;
      const filt=(1-this.damp)*y+this.damp*this.avg;   // 2-точечный петлевой фильтр; damp=0.5 → усреднитель (ровно 0.5 сэмпла); дальше от 0.5 → ярче
      this.avg=y;
      let s=filt*this.fb;
      if(this.nl>0) s=Math.tanh(this.nl*s);   // нелинейность в петле: джавари (ситар) / металлический край (сантур) — нечётные гармоники
      this.buf[this.wr]=s;
      this.wr=(this.wr+1)%this.N;
      out[i]=y;
    }
    return true;                              // постоянный узел (как пул) — никогда не «заканчивается»
  }
}
registerProcessor('ks-string',KSProcessor);
