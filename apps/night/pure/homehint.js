/* NIGHT-7c — WHO GETS THE «ADD TO HOME SCREEN» CARD (pure: the data row and the cards row feed it made-up devices). Only Safari on an
   iPhone, iPod or iPad (iPadOS reports a Mac with touch) that has no full-screen door of its own, outside the home-screen app. Other iOS
   browsers, Android, computers and the home-screen app never get it. env: { ua, platform, touch (maxTouchPoints), standalone, fsApi }. */
const OTHER_IOS=/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|YaBrowser|DuckDuckGo|Instagram|FBAN|FBAV/;
export function homeHintFor(env){
  const ua=String(env && env.ua || ''), ios=/iPhone|iPad|iPod/.test(ua) || (env && env.platform==='MacIntel' && (env.touch||0)>1);
  const safari=/Safari\//.test(ua) && /Version\//.test(ua) && !OTHER_IOS.test(ua);
  return !!(ios && safari && !env.standalone && !env.fsApi);
}
