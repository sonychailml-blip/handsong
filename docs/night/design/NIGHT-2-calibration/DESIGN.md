# NIGHT-2: calibration screens in Night. Stage 1 design, approved 2026-11-03; built at stage 2

## Decisions (user, 2026-11-03), as built at stage 2
1. **How close:** «as close as you'd comfortably play, with the whole hand in frame» (CORE-1's wording), not the absolute closest.
2. **Saving:** «Играть» saves, «Ещё раз» repeats; the hands play on the result card.
3. **Order:** the offer first, then the ghost. After the offer closes, the ghost is armed to wait up to 10 s for the hand to leave the frame, then plays; a hand still there after that ends it.
4. **Icon:** ⓘ became a settings icon (drawn, `settings` in `core/icons.js`).
5. **Forest slider:** moved into settings (View).
6. **«Ход руки» before calibrating:** greyed out; «Сначала настройте руку» beside it opens the calibration.
7. **Reset:** one reset: the setup on every camera, both sliders and the saved playing hand.
8. **New camera:** offered once, the same way as on the first start (a list of offered cameras by the engine's camera key, `handsong.nightCalOffered`; small, so no backlog item).
9. **Names:** «Ход руки» (Короткий … Длинный); «Чуткость эффектов» (Мягче … Сильнее).
10. **Texts:** `core/i18n.js` for now (`night.set.*`, `night.cal.*`); a core backlog item moves app texts into app dictionaries later.
11. **Which hand:** the largest in view is calibrated; its side sets the roles (right hand calibrated: right plays, left shapes the sound; left: the other way). The side is voted over every frame of the hold where the locked hand is seen (the label of that hand), a tie or nothing seen keeps the roles; saved beside the calibration (`handsong.nightCalSide`), applied on every start, cleared by reset. Players who never calibrate keep the profile's roles. The development edition prints how sure the vote was on the result card.
12. **Landscape hint:** fixed in this run.
- **A. Hand points:** settings «Руки на экране»: «Кончики пальцев» (default, today's look) · «Все точки». During the calibration every point is drawn whatever the setting.
- **B. Graphics quality, later:** room left in the View section; Night backlog item says what it takes.

**One change from the stage-1 plan:** the step doesn't switch the background to the camera (that closes the forest, and reopening it takes 1–3 s on a phone). The overlay draws the camera picture itself, with the same crop and mirror as the camera layer, and the forest stays open underneath.

---
Stage 1 text below, as approved (answers above replace its questions).

No app code changed at stage 1. Mockup: `mock.html` in this folder, using Night's real tokens and stylesheet. Pictures: `tools/design/NIGHT-2-calibration/`, each screen at desktop 1280×800, phone portrait 393×851 and landscape 851×393, in Russian (`mock.html?screen=offer&lang=en` shows English). The hand is a drawn placeholder for the camera picture. Builds don't ship `docs/`.

**Screens:** `offer` first-launch offer · `wait`, `hold`, `back`, `closer`, `still` the step · `done` success · `fail` a failure · `settings`, `settingsnone`, `reset` the settings menu · `main` the main screen. On a phone in landscape, settings scroll a little.

The engine is CORE-1 (`core/handcal.js`, `core/pure/handcal.js`, design `docs/core/CORE-1-DESIGN.md` §6), the same one the dev panel uses. This run adds no engine behaviour.

## What the real UI has today
- **Main screen** (`apps/night/index.html`, `shell.js`): six round buttons in the capsule (Sound, Mood, Play with, Notes, Background, Sleep), a Forest slider below them, and an ⓘ button at the corner. That's seven icons, one over your limit.
- **Settings:** none. The ⓘ card is the nearest thing: privacy and headphones notes, Lantern, full note field, Lighter forest, first steps again, dev items.
- **First launch:** the start card with its first steps and «Начать» (`nightBegin`), then the camera, and the ghost light plays four notes if no real hand appears (`ghost.js`).
- **Texts:** `night.*` keys in `core/i18n.js`, English and Russian, by `t()` and `data-i18n`.
- **The landscape hint bug** (`docs/night/BACKLOG.md`): `#darkHint` sits at `top:64px`, centred on the whole screen, while the capsule stands on the right, so its OK button lands on the «Звук» label.

## The flow
1. **First launch.** «Начать» → camera starts → **offer card** over the camera picture. Offered once on a device.
   - «Настроить» → the step.
   - «Пропустить» → defaults stay; the ghost plays as today (question 3). Asked once only, and the settings menu still has it.
2. **The step.** The camera picture shows whatever background is chosen. A dashed frame and one line at the bottom say what to do; «Отмена» sits at the top right. Hands make no sound during it; the forest's ambience goes on and Night's volume isn't touched.
   - No hand yet: the instruction.
   - A hand: «Держите неподвижно», with a progress bar for about 2 s.
   - While it's going wrong, the line changes and the routine keeps trying: out of frame, too far, moving.
3. **Success.** «Готово» → «Играть» saves and returns to the chosen background; «Ещё раз» repeats. Hands play here so it can be felt (question 2).
4. **Failure.** A card with one short message, «Попробовать ещё раз» and «Позже». «Позже» keeps whatever was there before.
5. **Later.** Settings → «Настроить заново» runs the same step. «Сбросить настройки руки» asks once, then clears the setup and both sliders.

**Leaving the camera picture:** the chosen background returns after the step. On a phone, reopening the forest takes 1–3 s (RUN 9), so the picture stays on the camera until it's ready.

## The settings menu (proposed; there is none today)
The ⓘ button becomes a settings button and its card becomes «Настройки», holding everything the ⓘ card holds plus:
- **Рука:** state line, «Настроить» or «Настроить заново», «Ход руки», «Чуткость эффектов», «Сбросить настройки руки».
- **Вид:** «Что на экране»: Лес · Тёмный · Камера, moved from the main screen.

The main screen then has **5 round buttons + settings = 6 icons**. The capsule's rows become 3 + 2 in portrait and 2 + 2 + 1 in landscape.

## The two sliders
No numbers on screen; the positions are named at the ends.

| Slider | Left end | Right end | Engine | Middle |
|---|---|---|---|---|
| «Ход руки» | Короткий | Длинный | `handCalSetDepthSens(s)`: left s = 2, right s = 0.7 | s = 1, the default |
| «Чуткость эффектов» | Мягче | Сильнее | `handCalSetSens(v)`: left 0.5, right 2 | v = 1, the default |

**«Ход руки» reads naturally:** right means the hand travels farther. The engine value runs the other way, so the screen maps it: from the middle to the right s falls 1 → 0.7, and from the middle to the left it rises 1 → 2, each half evenly on a log scale. Default in the middle for both, though the engine's range isn't centred on 1 for depth. As measured at CORE-1: the far end is about 1.7× the near distance at the left end, 2.4× in the middle and 3× at the right end.

## Every state and its message
Russian first; English goes in the same dictionary. Reason codes are the engine's own.

| State | Russian | English |
|---|---|---|
| Offer, title | Настроим руку? | Set up your hand? |
| Offer, text | Один шаг, около 10 секунд: покажите камере руку, которой играете. Тогда лес будет точнее следовать за её движением. | One step, about 10 seconds: show the camera the hand you play with. Then the forest will follow its movement more closely. |
| Offer, note | Это можно сделать позже в настройках. | You can do this later in settings. |
| Offer, buttons | Настроить · Пропустить | Set up · Skip |
| Step, `waitHand` | Поднесите играющую руку так близко к камере, как вам удобно играть. Вся рука должна быть в кадре. | Bring your playing hand as close to the camera as you'd comfortably play, with the whole hand in the frame. |
| Step, `holdNear` | Отлично. Держите руку неподвижно… | Good. Hold your hand still… |
| Advice `back` | Рука не помещается в кадр. Отодвиньте её чуть дальше от камеры. | Your hand doesn't fit the frame. Move it a little further from the camera. |
| Advice `closer` | Рука далековато. Поднесите её ближе к камере. | Your hand is rather far away. Bring it closer to the camera. |
| Advice `still` | Рука двигается. Задержите её на пару секунд, можно опереться локтем о стол. | Your hand is moving. Hold it for a couple of seconds; you can rest your elbow on a table. |
| Step, button | Отмена | Cancel |
| Success, title and text | Готово. Рука запомнена. Ближе к камере — меньше леса, дальше — больше. | Done. Your hand is remembered. Closer to the camera means less forest, further means more. |
| Success, buttons | Играть · Ещё раз | Play · Again |
| Failure, title | Не получилось | That didn't work |
| Failure, buttons | Попробовать ещё раз · Позже | Try again · Later |
| `no-hand` | Руку не видно. Поднимите её перед камерой. | No hand in view. Raise it in front of the camera. |
| `not-still` | Рука всё время двигалась. Обопритесь локтем о стол и задержите её. | Your hand kept moving. Rest your elbow on a table and hold it still. |
| `out-of-frame` | Рука не помещалась в кадр. Отодвиньте её чуть дальше. | Your hand didn't fit the frame. Move it a little further away. |
| `too-far` | Рука была слишком далеко. Поднесите её ближе к камере. | Your hand was too far away. Bring it closer to the camera. |
| `hand-lost` | Рука пропала из кадра. Держите её перед камерой. | Your hand left the frame. Keep it in front of the camera. |
| `low-rate` | Камере не хватает света. Поставьте лампу сбоку от себя. | The camera needs more light. Put a lamp to one side of you. |
| `busy` | Сейчас не получится. Попробуйте чуть позже. | Not right now. Try again shortly. |
| `synthetic` | Сначала покажите камере свою руку. | Show the camera your own hand first. |
| `camera-changed` | Камера сменилась. Настройте руку для этой камеры. | The camera changed. Set up your hand for this one. |
| `cancelled` | no message: back to where it was | |
| Settings, title | Настройки | Settings |
| Section | Рука · Вид | Hand · View |
| State line | Рука настроена / Рука не настроена | Your hand is set up / Your hand isn't set up |
| Buttons | Настроить заново · Настроить | Set up again · Set up |
| Slider 1 | Ход руки: Короткий … Длинный | Hand travel: Short … Long |
| Slider 1, not set up | Сначала настройте руку | Set up your hand first |
| Slider 2 | Чуткость эффектов: Мягче … Сильнее | Effects sensitivity: Softer … Stronger |
| View | Что на экране: Лес · Тёмный · Камера | On screen: Forest · Dark · Camera |
| Reset | Сбросить настройки руки | Reset hand settings |
| Reset, asks | Сбросить настройки руки? Настройка и оба ползунка вернутся к исходным. Сбросить · Отмена | Reset hand settings? The setup and both sliders go back to their defaults. Reset · Cancel |
| Store blocked | Браузер не даёт сохранять настройки: они продержатся до закрытия страницы. | The browser won't save settings: they last until this page closes. |
| Store newer | Настройки сохранены более новой версией приложения. Сбросьте их, чтобы изменить. | These settings come from a newer version of the app. Reset them to change them. |

Damaged or partial stored settings need no message: the engine drops only the damaged part and defaults fill it in.

## What it needs from the engine, which already exists
`handCalOpen({ scope:'night' })` at start; `handCalStart()`, `onHandCal`, `handCalState`, `handCalAccept`, `handCalCancel`; `handCalSetDepthSens`, `handCalSetSens`, `handCalRead`, `handCalReset({ all:true })`; `ghostStop()` before starting; `setBackground('camera')` and back. No direction choice (§6). The profile gets no new field.

## Landscape hint bug
Fixing it goes with this run, since a second message must find room too. In Night's landscape, `#darkHint` moves into the free area left of the capsule (its centre at `calc((100vw - capsule width) / 2)`), the same place the idle line already uses. While the step runs, the low-light hint gives way (`body.dark-on` already does this for Night's top lines), because the step's own line and the `low-rate` message speak for it. Then the line in `MSG_KNOWN` is deleted as the backlog says.

## Size if approved
App code in `apps/night/` (a screen module, settings card, texts). Core stays as it is, except the texts, if the keys stay in `core/i18n.js` (question 10). Test list: step 125's own cases, on the real screens, closing it for Night.

## Open questions
1. **How close?** You said as close to the camera as they can. CORE-1's panel and page say «as close as you want to play», and the engine's near point sets where forest depth starts. If someone calibrates at their closest but plays farther back, their whole playing range starts deeper in the forest, with less travel left. Whole-hand-in-frame also becomes tight at the closest point: an estimate at CORE-1 put a whole hand at 0.86 of the frame's height at the desktop's measured near size. The texts here follow your wording. Which do you want?
2. **Save at once, or try first?** The engine can hold the new point in review, audible but unsaved, until «Играть» saves it. I drew it that way: one screen, no extra step, and «Ещё раз» still available. If you meant saving the moment the hold ends, it's a small change.
3. **Calibration or ghost first, on first launch?** §6 and the backlog say stop the ghost first. I propose the offer first, then the ghost after it closes, so a new player gets both. If they calibrate, a real hand has just been seen, which today ends the ghost, so it would need re-arming.
4. **The ⓘ button.** I propose changing its icon to a settings icon, since it now opens settings, with privacy and headphones notes at the bottom of that card. OK?
5. **The Forest slider on the main screen.** It stays where it is in this design, and I counted it as not an icon, though it has a small one in today's code. Keep it there, or move it to settings too?
6. **«Ход руки» before calibrating.** In the engine, the depth slider only acts on a calibrated hand, so after «Пропустить» it would do nothing. I greyed it out with «Сначала настройте руку». «Чуткость эффектов» works either way. Is that right, or should the slider work with the defaults, which is a core change?
7. **What reset clears.** I drew one reset: the setup on every camera and both sliders. Is one reset enough?
8. **A different camera.** The engine remembers each camera separately, so a new one falls back to the defaults. Offer again automatically, or only in settings? I drew nothing automatic.
9. **The names:** «Ход руки» (Короткий … Длинный) and «Чуткость эффектов» (Мягче … Чутче). The obvious Russian word for the soft end contains the old product's name, which the project's name check forbids, so I used «Мягче». Are these plain enough?
10. **Where the texts live.** Night's texts are in `core/i18n.js` today, against core rules 2 and 8 for anything new. I propose adding these there, alongside the existing `night.*` keys, unless you want a separate app dictionary first, which would be its own small core run.
11. **Which hand.** The engine can lock to the left or right label, or take the largest hand in view. I propose the largest, because labels can flip between frames, and the words say «играющую руку». OK?
12. **§6 and your message differ on one thing only:** question 1. Everything else in your list matches §6 and the backlogs.
