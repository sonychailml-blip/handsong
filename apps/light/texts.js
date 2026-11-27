/* LIGHT-2 — LIGHT'S OWN TEXTS. Light-only strings live in this app (core rule 3): imported first by main.js, they join the shared dictionaries
   (core/i18n.js DICTS — t() and [data-i18n] read them like any other key). Every key has a text in each of Light's eight languages (the
   same as Night's: en, ru, es, pt, de, fr, it, ka); the shared start messages fall back to English in the six added ones for now (LIGHT-6). */
import { DICTS, langsAdd } from '../../core/i18n.js';

const K=['light.title','light.tag','light.play','light.privacy','light.how','light.how.play','light.how.vol','light.how.fx','light.how.menu','light.ok'];
const ROWS={
  en:['Handsong','Play music with your hands, in front of the camera.','Play','Your camera picture never leaves this device. Nothing is sent anywhere.',
    'How to play','Right hand: raise or lower it to pick a row of notes, pinch a finger to the thumb to play a note.','Move it left or right for volume, nearer or farther for reverb.',
    'Left hand: each finger is an effect — pinch it and move up or down.','Take your hands out of view to see the buttons.','Got it'],
  ru:['Handsong','Играйте музыку руками — перед камерой.','Играть','Картинка с камеры не покидает ваше устройство. Ничего не отправляется.',
    'Как играть','Правая рука: поднимайте и опускайте её, чтобы выбрать ряд нот; сведите палец с большим — прозвучит нота.','Вправо-влево — громкость, ближе-дальше — ревер.',
    'Левая рука: каждый палец — эффект. Сведите его с большим и ведите вверх или вниз.','Уберите руки из кадра — появятся кнопки.','Понятно'],
  es:['Handsong','Toca música con las manos, delante de la cámara.','Tocar','La imagen de tu cámara nunca sale de este dispositivo. No se envía nada.',
    'Cómo tocar','Mano derecha: súbela o bájala para elegir una fila de notas; junta un dedo con el pulgar para tocar una nota.','Muévela a izquierda o derecha para el volumen, más cerca o más lejos para la reverberación.',
    'Mano izquierda: cada dedo es un efecto; júntalo con el pulgar y muévelo arriba o abajo.','Saca las manos del encuadre para ver los botones.','Entendido'],
  pt:['Handsong','Toque música com as mãos, diante da câmera.','Tocar','A imagem da sua câmera nunca sai deste dispositivo. Nada é enviado.',
    'Como tocar','Mão direita: suba ou desça para escolher uma fileira de notas; junte um dedo ao polegar para tocar uma nota.','Mova para a esquerda ou a direita para o volume, para perto ou para longe para a reverberação.',
    'Mão esquerda: cada dedo é um efeito; junte-o ao polegar e mova para cima ou para baixo.','Tire as mãos do quadro para ver os botões.','Entendi'],
  de:['Handsong','Spiele Musik mit deinen Händen vor der Kamera.','Spielen','Dein Kamerabild verlässt dieses Gerät nie. Es wird nichts gesendet.',
    'So spielst du','Rechte Hand: heben oder senken, um eine Notenreihe zu wählen; einen Finger an den Daumen führen, um eine Note zu spielen.','Nach links oder rechts für die Lautstärke, näher oder weiter für den Hall.',
    'Linke Hand: jeder Finger ist ein Effekt – an den Daumen führen und nach oben oder unten bewegen.','Nimm die Hände aus dem Bild, um die Knöpfe zu sehen.','Verstanden'],
  fr:['Handsong','Jouez de la musique avec vos mains, devant la caméra.','Jouer','L’image de votre caméra ne quitte jamais cet appareil. Rien n’est envoyé.',
    'Comment jouer','Main droite : levez-la ou baissez-la pour choisir une rangée de notes ; joignez un doigt au pouce pour jouer une note.','Vers la gauche ou la droite pour le volume, plus près ou plus loin pour la réverbération.',
    'Main gauche : chaque doigt est un effet ; joignez-le au pouce et montez ou descendez.','Sortez les mains du cadre pour voir les boutons.','Compris'],
  it:['Handsong','Suona musica con le mani, davanti alla fotocamera.','Suona','L’immagine della fotocamera non lascia mai questo dispositivo. Non viene inviato nulla.',
    'Come suonare','Mano destra: alzala o abbassala per scegliere una fila di note; unisci un dito al pollice per suonare una nota.','Spostala a sinistra o a destra per il volume, più vicino o più lontano per il riverbero.',
    'Mano sinistra: ogni dito è un effetto; uniscilo al pollice e muovilo su o giù.','Togli le mani dall’inquadratura per vedere i pulsanti.','Capito'],
  ka:['Handsong','დაუკარით მუსიკა ხელებით, კამერის წინ.','დაკვრა','კამერის გამოსახულება ამ მოწყობილობას არასდროს ტოვებს. არაფერი იგზავნება.',
    'როგორ დავუკრათ','მარჯვენა ხელი: აწიეთ ან დაწიეთ ნოტების რიგის ასარჩევად; შეაერთეთ თითი ცერთან — ნოტა გაჟღერდება.','მარცხნივ ან მარჯვნივ — ხმა, ახლოს ან შორს — რევერბი.',
    'მარცხენა ხელი: ყოველი თითი ეფექტია — შეაერთეთ ცერთან და ამოძრავეთ ზემოთ ან ქვემოთ.','გაიტანეთ ხელები კადრიდან — გამოჩნდება ღილაკები.','გასაგებია'],
};
export const LIGHT_TEXTS=Object.freeze(Object.fromEntries(Object.entries(ROWS).map(([lang, row])=>{
  if(row.length!==K.length) throw new Error('[light] texts: '+lang+' has '+row.length+' of '+K.length);
  return [lang, Object.freeze(Object.fromEntries(K.map((k,i)=>[k, row[i]])))]; })));
langsAdd(Object.keys(LIGHT_TEXTS));
for(const [lang, T] of Object.entries(LIGHT_TEXTS)) Object.assign(DICTS[lang], T);
