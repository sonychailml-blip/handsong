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
/* LIGHT-3b: the controls and their menus */
const K2=['light.key','light.a4','light.a4.note','light.scale','light.timbre','light.hands','light.left','light.right','light.fn.fx','light.fn.note','light.fn.hold','light.fn.therm',
  'light.field','light.field.rect','light.field.rows','light.oct.note','light.camera','light.sens','light.travel','light.short','light.long','light.fxsens','light.softer','light.stronger','light.close','light.camOne'];
const ROWS2={
  en:['Key','A above middle C (A4)','Usually 440. − and + change it by 1 Hz.','Scale','Sound','Hands','Left','Right','Effects','Notes','Notes held','Theremin',
    'Field','4 notes in a band','1 note in a band','Four octaves in a row, one per finger; the arrows move all four.','Camera','Sensitivity','Hand travel (reverb)','Short','Long','Effects','Softer','Stronger','Close','This device shows one camera only.'],
  ru:['Тональность','Ля первой октавы (A4)','Обычно 440. − и + меняют на 1 Гц.','Лад','Звук','Руки','Левая','Правая','Эффекты','Ноты','Ноты с удержанием','Терменвокс',
    'Поле','4 ноты в полосе','1 нота в полосе','Четыре октавы подряд, по одной на палец; стрелки сдвигают все четыре.','Камера','Чувствительность','Ход руки (ревер)','Короткий','Длинный','Эффекты','Мягче','Сильнее','Закрыть','На этом устройстве видна только одна камера.'],
  es:['Tonalidad','La central (A4)','Normalmente 440. − y + lo cambian de 1 Hz en 1 Hz.','Escala','Sonido','Manos','Izquierda','Derecha','Efectos','Notas','Notas sostenidas','Theremín',
    'Campo','4 notas por franja','1 nota por franja','Cuatro octavas seguidas, una por dedo; las flechas mueven las cuatro.','Cámara','Sensibilidad','Recorrido de la mano (reverberación)','Corto','Largo','Efectos','Más suave','Más fuerte','Cerrar','Este dispositivo solo muestra una cámara.'],
  pt:['Tonalidade','Lá central (A4)','Normalmente 440. − e + mudam de 1 Hz em 1 Hz.','Escala','Som','Mãos','Esquerda','Direita','Efeitos','Notas','Notas sustentadas','Teremim',
    'Campo','4 notas por faixa','1 nota por faixa','Quatro oitavas seguidas, uma por dedo; as setas movem as quatro.','Câmera','Sensibilidade','Percurso da mão (reverberação)','Curto','Longo','Efeitos','Mais suave','Mais forte','Fechar','Este dispositivo mostra só uma câmera.'],
  de:['Tonart','Kammerton A (A4)','Meist 440. − und + ändern ihn um 1 Hz.','Tonleiter','Klang','Hände','Links','Rechts','Effekte','Noten','Gehaltene Noten','Theremin',
    'Feld','4 Noten pro Streifen','1 Note pro Streifen','Vier Oktaven nacheinander, eine pro Finger; die Pfeile verschieben alle vier.','Kamera','Empfindlichkeit','Handweg (Hall)','Kurz','Lang','Effekte','Sanfter','Stärker','Schließen','Dieses Gerät zeigt nur eine Kamera.'],
  fr:['Tonalité','La du diapason (A4)','En général 440. − et + le changent de 1 Hz.','Gamme','Son','Mains','Gauche','Droite','Effets','Notes','Notes tenues','Thérémine',
    'Champ','4 notes par bande','1 note par bande','Quatre octaves à la suite, une par doigt ; les flèches déplacent les quatre.','Caméra','Sensibilité','Course de la main (réverbération)','Courte','Longue','Effets','Plus doux','Plus fort','Fermer','Cet appareil ne montre qu’une caméra.'],
  it:['Tonalità','La del diapason (A4)','Di solito 440. − e + lo cambiano di 1 Hz.','Scala','Suono','Mani','Sinistra','Destra','Effetti','Note','Note tenute','Theremin',
    'Campo','4 note per fascia','1 nota per fascia','Quattro ottave di fila, una per dito; le frecce spostano tutte e quattro.','Fotocamera','Sensibilità','Corsa della mano (riverbero)','Corta','Lunga','Effetti','Più morbido','Più forte','Chiudi','Questo dispositivo mostra una sola fotocamera.'],
  ka:['ტონალობა','პირველი ოქტავის ლა (A4)','ჩვეულებრივ 440. − და + ცვლის 1 ჰც-ით.','კილო','ხმა','ხელები','მარცხენა','მარჯვენა','ეფექტები','ნოტები','გაჩერებული ნოტები','თერმენვოქსი',
    'ველი','4 ნოტა ზოლში','1 ნოტა ზოლში','ოთხი ოქტავა ზედიზედ, თითო თითზე; ისრები ოთხივეს ერთად აჩოჩებს.','კამერა','მგრძნობელობა','ხელის სვლა (რევერბი)','მოკლე','გრძელი','ეფექტები','უფრო რბილად','უფრო ძლიერად','დახურვა','ამ მოწყობილობაზე მხოლოდ ერთი კამერა ჩანს.'],
};
/* LIGHT-4: the hand setup */
const K3=['light.cal.offerT','light.cal.offer','light.cal.set','light.cal.skip','light.cal.near','light.cal.wait','light.cal.hold','light.cal.back','light.cal.closer','light.cal.still',
  'light.cal.cancel','light.cal.doneT','light.cal.done','light.cal.failT','light.cal.fail','light.cal.again','light.cal.ok','light.cal.none'];
const ROWS3={
  en:['Set up your hand?','One step, about 10 seconds: show the camera the hand you play with. Then the reverb follows its movement more closely.','Set up','Later',
    'The nearest point','Hold your playing hand at the closest point it reaches while you play, the whole hand in the frame. From there it moves away.','Good. Hold your hand still…',
    'Your hand doesn’t fit the frame. Move it a little further from the camera.','The camera can’t see your hand clearly from this far. Come closer.','Your hand is moving. Hold it for a couple of seconds; you can rest your elbow on a table.',
    'Cancel','Done','Your hand is remembered. Nearer the camera, the sound is close and dry; farther, more reverb.','Not measured','The measurement didn’t work. Try again, holding your hand still.','Set up again','Your hand is set up','Your hand isn’t set up'],
  ru:['Настроить руку?','Один шаг, около 10 секунд: покажите камере руку, которой играете. Тогда ревер будет точнее следовать за её движением.','Настроить','Потом',
    'Ближняя точка','Держите играющую руку в самой близкой к камере точке, до которой она доходит во время игры, — вся рука в кадре. Отсюда она будет отходить.','Хорошо. Держите руку неподвижно…',
    'Рука не помещается в кадр. Отодвиньте её чуть дальше от камеры.','Камера плохо видит руку с такого расстояния. Подвиньтесь ближе.','Рука двигается. Подержите её пару секунд — можно опереться локтем о стол.',
    'Отмена','Готово','Рука запомнена. Ближе к камере — звук рядом и суше; дальше — больше ревера.','Не измерено','Замер не получился. Попробуйте ещё раз и держите руку неподвижно.','Настроить заново','Рука настроена','Рука не настроена'],
  es:['¿Ajustar tu mano?','Un paso, unos 10 segundos: muestra a la cámara la mano con la que tocas. Así la reverberación seguirá mejor su movimiento.','Ajustar','Más tarde',
    'El punto más cercano','Mantén la mano que toca en el punto más cercano a la cámara al que llega al tocar, toda la mano en el encuadre. Desde ahí se alejará.','Bien. Mantén la mano quieta…',
    'La mano no cabe en el encuadre. Aléjala un poco de la cámara.','Desde tan lejos la cámara no ve bien la mano. Acércate.','La mano se mueve. Mantenla un par de segundos; puedes apoyar el codo en la mesa.',
    'Cancelar','Listo','Tu mano está guardada. Cerca de la cámara, el sonido es cercano y seco; más lejos, más reverberación.','Sin medir','La medición no salió. Vuelve a intentarlo con la mano quieta.','Ajustar de nuevo','Tu mano está ajustada','Tu mano no está ajustada'],
  pt:['Ajustar sua mão?','Um passo, cerca de 10 segundos: mostre à câmera a mão com que você toca. Assim a reverberação acompanha melhor o movimento.','Ajustar','Depois',
    'O ponto mais próximo','Segure a mão que toca no ponto mais próximo da câmera a que ela chega ao tocar, a mão inteira no quadro. Dali ela vai se afastar.','Bom. Mantenha a mão parada…',
    'A mão não cabe no quadro. Afaste-a um pouco da câmera.','Daí a câmera não vê bem a mão. Chegue mais perto.','A mão está se mexendo. Segure-a por alguns segundos; pode apoiar o cotovelo na mesa.',
    'Cancelar','Pronto','Sua mão foi guardada. Perto da câmera, o som fica próximo e seco; mais longe, mais reverberação.','Não medido','A medição não deu certo. Tente de novo, com a mão parada.','Ajustar de novo','Sua mão está ajustada','Sua mão não está ajustada'],
  de:['Hand einrichten?','Ein Schritt, etwa 10 Sekunden: Zeig der Kamera die Hand, mit der du spielst. Dann folgt der Hall ihrer Bewegung genauer.','Einrichten','Später',
    'Der nächste Punkt','Halte die Spielhand an den Punkt, der der Kamera beim Spielen am nächsten kommt, die ganze Hand im Bild. Von dort entfernt sie sich.','Gut. Halte die Hand still…',
    'Die Hand passt nicht ins Bild. Halte sie etwas weiter von der Kamera weg.','Aus dieser Entfernung sieht die Kamera die Hand schlecht. Komm näher.','Die Hand bewegt sich. Halte sie ein paar Sekunden still; du kannst den Ellbogen auf den Tisch stützen.',
    'Abbrechen','Fertig','Deine Hand ist gespeichert. Nah an der Kamera klingt es nah und trocken, weiter weg mit mehr Hall.','Nicht gemessen','Die Messung hat nicht geklappt. Versuch es noch einmal und halte die Hand still.','Neu einrichten','Deine Hand ist eingerichtet','Deine Hand ist nicht eingerichtet'],
  fr:['Régler votre main ?','Une étape, environ 10 secondes : montrez à la caméra la main avec laquelle vous jouez. La réverbération suivra mieux son mouvement.','Régler','Plus tard',
    'Le point le plus proche','Tenez la main qui joue au point le plus proche de la caméra qu’elle atteint en jouant, toute la main dans le cadre. Elle s’éloignera de là.','Bien. Gardez la main immobile…',
    'La main ne tient pas dans le cadre. Éloignez-la un peu de la caméra.','De si loin, la caméra voit mal la main. Approchez-vous.','La main bouge. Tenez-la deux secondes ; vous pouvez poser le coude sur la table.',
    'Annuler','Terminé','Votre main est enregistrée. Près de la caméra, le son est proche et sec ; plus loin, plus de réverbération.','Non mesuré','La mesure n’a pas marché. Réessayez en gardant la main immobile.','Régler à nouveau','Votre main est réglée','Votre main n’est pas réglée'],
  it:['Impostare la mano?','Un passo, circa 10 secondi: mostra alla fotocamera la mano con cui suoni. Così il riverbero seguirà meglio il suo movimento.','Imposta','Più tardi',
    'Il punto più vicino','Tieni la mano che suona nel punto più vicino alla fotocamera che raggiunge suonando, tutta la mano nell’inquadratura. Da lì si allontanerà.','Bene. Tieni ferma la mano…',
    'La mano non sta nell’inquadratura. Allontanala un po’ dalla fotocamera.','Da così lontano la fotocamera vede male la mano. Avvicinati.','La mano si muove. Tienila ferma un paio di secondi; puoi appoggiare il gomito sul tavolo.',
    'Annulla','Fatto','La tua mano è salvata. Vicino alla fotocamera il suono è vicino e asciutto; più lontano, più riverbero.','Non misurato','La misura non è riuscita. Riprova tenendo ferma la mano.','Imposta di nuovo','La tua mano è impostata','La tua mano non è impostata'],
  ka:['ხელი მოვარგოთ?','ერთი ნაბიჯი, დაახლოებით 10 წამი: აჩვენეთ კამერას ხელი, რომლითაც უკრავთ. მაშინ რევერბი უფრო ზუსტად გაჰყვება მის მოძრაობას.','მორგება','მოგვიანებით',
    'უახლოესი წერტილი','დაიჭირეთ დამკვრელი ხელი კამერასთან უახლოეს წერტილში, სადამდეც დაკვრისას აღწევს, მთელი ხელი კადრში. იქიდან ის დაშორდება.','კარგია. გააჩერეთ ხელი…',
    'ხელი კადრში არ ეტევა. ოდნავ დააშორეთ კამერას.','ამ მანძილიდან კამერა ხელს კარგად ვერ ხედავს. მიუახლოვდით.','ხელი მოძრაობს. გააჩერეთ რამდენიმე წამით; შეგიძლიათ იდაყვი მაგიდას დააყრდნოთ.',
    'გაუქმება','მზადაა','ხელი დამახსოვრებულია. კამერასთან ახლოს ხმა ახლოა და მშრალი; შორს — მეტი რევერბი.','არ გაიზომა','გაზომვა ვერ მოხერხდა. სცადეთ ხელახლა, ხელი გააჩერეთ.','ხელახლა მორგება','ხელი მორგებულია','ხელი არ არის მორგებული'],
};
export const LIGHT_TEXTS=Object.freeze(Object.fromEntries(Object.entries(ROWS).map(([lang, row])=>{
  if(row.length!==K.length || !ROWS2[lang] || ROWS2[lang].length!==K2.length || !ROWS3[lang] || ROWS3[lang].length!==K3.length) throw new Error('[light] texts: '+lang+' is incomplete');
  return [lang, Object.freeze({ ...Object.fromEntries(K.map((k,i)=>[k, row[i]])), ...Object.fromEntries(K2.map((k,i)=>[k, ROWS2[lang][i]])), ...Object.fromEntries(K3.map((k,i)=>[k, ROWS3[lang][i]])) })]; })));
langsAdd(Object.keys(LIGHT_TEXTS));
for(const [lang, T] of Object.entries(LIGHT_TEXTS)) Object.assign(DICTS[lang], T);
