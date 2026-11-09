/* NIGHT-6 slice 1 — WHEN A SOUND IS HEARD, on the page's clock. Pure (rule #36), node-tested (data row «FOREST answers (app)»). The music bed
   schedules its events on the audio clock, ahead; a room shows them at the moment they come out of the speakers. The shell publishes the audio
   clock on the bus each frame (`audioClock`): { ctx, perf } — the audio time being output now and the page time it is output at (the context's
   output timestamp, so the output latency is in it) — and { now, nowPerf } — the context's current time and the page time it was read at.
   heardMs maps an audio time to the page time (ms) it is heard at. ignoreLatency (probe CONTROL only) maps it through the current time instead:
   early by the output latency. */
export const heardMs=(clock, at, ignoreLatency=false)=> ignoreLatency ? clock.nowPerf+(at-clock.now)*1000 : clock.perf+(at-clock.ctx)*1000;
