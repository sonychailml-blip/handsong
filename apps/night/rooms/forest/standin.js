/* NIGHT-3: the forest's 2D STAND-IN — the «low» level and the fallback without WebGL (or after a lost context): the night's two colours and a soft
   glow at each hand (the playing hand lime, the effects hand blue). Drawn by the scene host's backdrop on the 2D canvas; was host.js's own code. */
export function standInForest(ctx, W, H, hands, cv){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0, cv('forest-fog')); g.addColorStop(1, cv('forest-ground')); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(const h of hands){ const r=Math.max(12, 46*(1.3-h.d)), gr=ctx.createRadialGradient(h.x,h.y,0,h.x,h.y,r);
    gr.addColorStop(0, cv(h.play?'forest-light':'forest-fx')); gr.addColorStop(1, cv('halo-a0')); ctx.fillStyle=gr; ctx.fillRect(h.x-r,h.y-r,2*r,2*r); }
}
