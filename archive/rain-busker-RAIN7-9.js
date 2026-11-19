/* RAIN-9 (2026-11-19): THE STREET MUSICIAN'S FIGURE REMOVED — the founder: still not seen (about 20 px tall on a laptop); moved nearer, the one place
   no crown hides in the depth map (x 23, z 32: 27 px) was still under the near trees' low crowns on screen, every other near place hidden or outside
   an upright phone's crop. Kept word for word, NOT LOADED. His notes in the music (rooms/rain/pure/busker.js, the bed) stay.
   rain.js: BUSKER=Object.freeze({ x:23.0, z:32 }) (RAIN-7: { x:38.3, z:52 }, RAIN-8: { x:36.0, z:55 }) and these two lines:
       if(bodiesOn && i<NL-4){ i=lightAt(i, [BUSKER.x+0.55, 0.45, BUSKER.z-0.2], 0.12, AMBER, 1.8, true); i=pool(i, BUSKER.x+0.2, BUSKER.z, 2.2, 2.2, AMBER, 0.7); }   // RAIN-9: the musician's lantern on the ground by the open case, its pool of light round him
         A.push({ kind:29, x:BUSKER.x, y:0, z:BUSKER.z, h:1.72, w:1.3, ph:Math.min(0.99, Math.max(0, (t-buskAt)/0.7)), c:3, a:1, lane:'busker' });   // RAIN-7: the street musician under the awning, strumming when his note is heard
   rain-glass.js LIFE_F, the branch: */
const LIFE_F_MUSICIAN=`  else if(k>28.5){   /* RAIN-7: the street musician with his guitar, standing under the awning; ph: time since his last note (0 = this moment: the strum) */
    float sw=clamp(vSoft, 0.02, 0.6), win=mix(1., 1.-smoothstep(0.6, 0.9, max(abs(vE.x), abs(vE.y))), uWin)*mix(1., vFade, uWin), st=exp(-ph*5.);
    float dp=person(p, -0.05, 0.25, 0.04, 1., 0.05, 0.), dg=min(el(p, vec2(0.02, 0.43), vec2(0.34, 0.15)), seg(p, vec2(0.18, 0.47), vec2(0.62, 0.66), 0.03)), da=seg(p, vec2(0.2, 0.66), vec2(0.1, 0.48-0.08*st), 0.05);
    dp=min(dp, min(el(p, vec2(-0.05, 0.93), vec2(0.36, 0.022)), el(p, vec2(-0.05, 0.965), vec2(0.2, 0.05))));   /* RAIN-8: his hat */
    float dc=el(p, vec2(0.62, 0.035), vec2(0.36, 0.035)), mc=smoothstep(sw, -sw, dc);   /* the open guitar case at his feet */
    float mp=smoothstep(sw, -sw, min(dp, da)), mg=smoothstep(sw, -sw, dg), lamp=0.55+0.45*smoothstep(0.2, 0.95, p.y);   /* lit from above by his lamp */
    vec3 col=mix(cloth(ci)*1.5+vec3(0.06, 0.04, 0.02), vec3(0.34, 0.18, 0.07)*(1.+0.7*st), mg)*lamp; col=mix(col, vec3(0.3, 0.12, 0.08), mc*(1.-max(mp, mg)));
    float al=max(max(mp, mg), mc);
    gl_FragColor=vec4(col*al*win*vK.w, al*win*vK.w); return; }
`;
