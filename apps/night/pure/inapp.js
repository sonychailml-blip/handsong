/* NIGHT-11 part 2 — LINKS OPENED INSIDE A MESSENGER (audit W4). An app's own browser (Telegram, Instagram, Facebook, WhatsApp and similar) often
   refuses the camera without asking. Pure (the data row feeds it made-up devices): which app's browser this is, if any, and which device words fit.
   env: { ua, platform, touch (maxTouchPoints), standalone } → { inApp, app, os 'ios'|'android'|'other', phone }.
   A camera refusal that comes back faster than a person could answer a prompt (QUICK_DENY_MS) counts as «refused without asking» (quickDeny). */
export const IN_APPS=Object.freeze([
  ['telegram', /Telegram/i], ['instagram', /Instagram/], ['facebook', /FBAN|FBAV|FB_IAB|FBIOS|FB4A|FBSV|MessengerForiOS|Orca-Android/],
  ['whatsapp', /WhatsApp/i], ['line', /\bLine\/\d/], ['snapchat', /Snapchat/i], ['tiktok', /musical_ly|BytedanceWebview|TikTok|trill_/i],
  ['wechat', /MicroMessenger/], ['linkedin', /LinkedInApp/], ['twitter', /Twitter for|TwitterAndroid/i], ['vk', /VKAndroidApp|VKClient|com\.vkontakte/i],
  ['pinterest', /\bPinterest/], ['viber', /Viber/i], ['discord', /Discord/i], ['threads', /Barcelona|Threads/],
]);
export const QUICK_DENY_MS=450;
export function inAppOf(env){
  const ua=String(env && env.ua || ''), touch=(env && env.touch)||0;
  const ios=/iPhone|iPad|iPod/.test(ua) || (env && env.platform==='MacIntel' && touch>1), android=/Android/.test(ua);
  const os= ios ? 'ios' : android ? 'android' : 'other', phone= ios || android;
  const hit=IN_APPS.find(([,re])=>re.test(ua));
  let app= hit ? hit[0] : null;
  /* no app name, but a bare web view: Android marks it «; wv)», iOS leaves out Safari's own «Safari/» (Chrome, Firefox and Edge on iOS keep it);
     the home-screen app is not one */
  if(!app && android && /;\s?wv\)/.test(ua)) app='webview';
  if(!app && ios && /AppleWebKit/.test(ua) && !/Safari\//.test(ua) && !(env && env.standalone)) app='webview';
  return { inApp:!!app, app, os, phone };
}
/* a camera refusal (NotAllowedError) that came back within QUICK_DENY_MS of the request: no prompt was shown */
export const quickDeny=(name, ms)=>name==='NotAllowedError' && Number.isFinite(ms) && ms>=0 && ms<QUICK_DENY_MS;
