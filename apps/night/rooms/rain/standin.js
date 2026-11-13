/* RAIN-0: the rain room's 2D STAND-IN — the «low» level and the fallback without WebGL (or after a lost context): the night sky over the
   city's warm glow, and a soft glow at each hand (the playing hand amber, the effects hand rose). Drawn by the scene host's backdrop. */
export function standInRain(ctx, W, H, hands, cv){
  const g=ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, cv('rain-sky')); g.addColorStop(0.55, cv('rain-cloud')); g.addColorStop(0.8, cv('rain-glow')); g.addColorStop(1, cv('rain-stone'));
  ctx.fillStyle=g; ctx.fillRect(0, 0, W, H);
  for(const h of hands){ const r=Math.max(12, 46*(1.3-h.d)), gr=ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
    gr.addColorStop(0, cv(h.play ? 'rain-light' : 'rain-fx')); gr.addColorStop(1, cv('halo-a0')); ctx.fillStyle=gr; ctx.fillRect(h.x-r, h.y-r, 2*r, 2*r); }
}
