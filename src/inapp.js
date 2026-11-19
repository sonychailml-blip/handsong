/* ССЫЛКА, ОТКРЫТАЯ ВНУТРИ МЕССЕНДЖЕРА. Встроенный браузер приложения (Telegram, Instagram, Facebook, WhatsApp
   и подобные) часто молча отказывает в камере, а на iOS бывает и без звука. ЧИСТАЯ функция — ПЕРЕНЕСЕНА из
   Night (apps/night/pure/inapp.js) без изменения логики: какое это приложение (если это оно) и какая ОС.
   env: { ua, platform, touch (maxTouchPoints), standalone } → { inApp, app, os 'ios'|'android'|'other', phone }. */
export const IN_APPS=Object.freeze([
  ['telegram', /Telegram/i], ['instagram', /Instagram/], ['facebook', /FBAN|FBAV|FB_IAB|FBIOS|FB4A|FBSV|MessengerForiOS|Orca-Android/],
  ['whatsapp', /WhatsApp/i], ['line', /\bLine\/\d/], ['snapchat', /Snapchat/i], ['tiktok', /musical_ly|BytedanceWebview|TikTok|trill_/i],
  ['wechat', /MicroMessenger/], ['linkedin', /LinkedInApp/], ['twitter', /Twitter for|TwitterAndroid/i], ['vk', /VKAndroidApp|VKClient|com\.vkontakte/i],
  ['pinterest', /\bPinterest/], ['viber', /Viber/i], ['discord', /Discord/i], ['threads', /Barcelona|Threads/],
]);
export function inAppOf(env){
  const ua=String(env && env.ua || ''), touch=(env && env.touch)||0;
  const ios=/iPhone|iPad|iPod/.test(ua) || (env && env.platform==='MacIntel' && touch>1), android=/Android/.test(ua);
  const os= ios ? 'ios' : android ? 'android' : 'other', phone= ios || android;
  const hit=IN_APPS.find(([,re])=>re.test(ua));
  let app= hit ? hit[0] : null;
  /* имени приложения нет, но это голый web view: Android помечает его «; wv)», iOS выкидывает Safari-шное «Safari/»
     (Chrome, Firefox и Edge на iOS его оставляют); приложение с домашнего экрана — не оно */
  if(!app && android && /;\s?wv\)/.test(ua)) app='webview';
  if(!app && ios && /AppleWebKit/.test(ua) && !/Safari\//.test(ua) && !(env && env.standalone)) app='webview';
  return { inApp:!!app, app, os, phone };
}
