/* ======================================================================
   СЪЁМ МАСТЕРА ДЛЯ ПРОБ — НА ПОТОКЕ ЗВУКА, С НОМЕРАМИ КАДРОВ (только пробы; приложение его не грузит)
   ----------------------------------------------------------------------
   ⛳ ПОЧЕМУ НЕ ScriptProcessorNode. Прежний съём (audio.probeCapture) брал звук ScriptProcessor'ом по 4096 кадров на ГЛАВНОМ
   потоке. Когда главный поток занят (P.all, распознавание рук на каждом кадре), его блоки приходят с опозданием, и Chrome их
   теряет или повторяет — съём перестаёт быть сплошным, а пробы считают индексы от метки как от сплошного: всё после разрыва
   сдвинуто на долю блока. Так пробы реального времени падали «случайно»: AF2 «стоящий начинается на 76.7/101.9 мс позже»,
   «остаток +2.5 дБ сверх буфера», AF6b «16 бит отличается на −0.2 дБ к пику» — сравнивались РАЗНЫЕ мгновения звука.
   Здесь каждый квант (128 кадров) пишется сразу на потоке звука, с номером кадра (currentFrame): разрывов быть не может, а если
   бы они были — они видны (gaps). Итог одним сообщением: {F0 — кадр контекста первого сэмпла, L, R, gaps, stale, jumps}.
   ====================================================================== */
class ProbeCap extends AudioWorkletProcessor {
  constructor(opts){
    super();
    const o=(opts&&opts.processorOptions)||{};
    this.want=o.want|0; this.L=new Float32Array(this.want); this.R=new Float32Array(this.want);
    this.got=0; this.off=[]; this.done=false;
    this.port.onmessage=e=>{ if(e.data&&e.data.abort) this.finish(); };
  }
  /* ⛳ КАДР ПЕРВОГО СЭМПЛА — НЕ ПЕРВЫЙ currentFrame. Замер раннером: Chrome иногда отдаёт в process ТОТ ЖЕ currentFrame два вызова
     подряд, а следующий — через два кванта (скачки −128, +128: сумма ноль, звук сплошной — устарело лишь показание). Поэтому каждый вызов
     даёт смещение currentFrame − сэмплов_до_него; F0 — самое частое смещение. Настоящий разрыв сдвинул бы смещение НАСОВСЕМ — это
     gaps: смещение ушло от F0 и держится не меньше трёх вызовов подряд. stale — одиночные устаревшие показания (сведение). */
  finish(){ if(this.done) return; this.done=true;
    const cnt=new Map(); for(const v of this.off) cnt.set(v,(cnt.get(v)||0)+1);
    let F0=null, best=-1; for(const [v,c] of cnt) if(c>best){ best=c; F0=v; }
    let gaps=0, stale=0, run=0; const jumps=[];
    for(let k=0;k<this.off.length;k++){ if(this.off[k]===F0){ if(run>0&&run<3) stale+=run; run=0; continue; }
      run++; if(run===3){ gaps++; if(jumps.length<8) jumps.push([k*128, this.off[k]-F0]); } }
    if(run>0&&run<3) stale+=run;
    this.port.postMessage({ F0, got:this.got, gaps, stale, jumps, L:this.L, R:this.R }, [this.L.buffer, this.R.buffer]); }
  process(inputs){
    if(this.done) return false;
    const F=currentFrame, inp=inputs[0]||[], a=inp[0], b=inp[1]||inp[0], n=128;   // eslint-disable-line no-undef
    this.off.push(F-this.got);
    const k=Math.min(n, this.want-this.got);
    if(a){ this.L.set(a.subarray(0,k), this.got); this.R.set(b.subarray(0,k), this.got); }   // вход молчит (нет каналов) — нули уже лежат
    this.got+=k;
    if(this.got>=this.want){ this.finish(); return false; }
    return true;
  }
}
registerProcessor('probe-cap', ProbeCap);
