# TT Tube Zapper

[![TT Tube Zapper title screen](docs/screenshot.jpg)](https://adong.github.io/tube-zapper-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 隧道激光：一条发光的玩具隧道，有 16 条跑道。你的激光炮在隧道口的边上，← 逆时针转，→ 顺时针转（边上的箭头指方向），空格顺着跑道发激光。果冻怪从隧道深处往上爬，在它们爬到边上之前把它们变成小星星！跳跳怪会换跑道，双胞胎怪一打就分成两个。每关都是新形状的隧道：圆形、方形、星星、爱心、平桥……叫兄弟来，他会用超级激光扫光整条隧道。

## Play

An arcade game in our own style, starring Teddy and Tommy. You look down a glowing toy tube made of 16 lanes. Your zapper sits on the rim with a brother riding it; jelly critters climb up the lanes from the far end. Zap them into sparkles before they reach the rim. Nobody gets hurt: a zapped critter pops into sparkles and confetti, and one that reaches the rim only walks over and tickles you (TEE-HEE!), which costs a life.

A 3D game for the boys, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. There are no image, model or audio files: every texture is painted on a canvas and every sound is synthesised. The name, the critters, the tubes, the art and the sounds are our own.

- **Single page:** open `dist/tube-zapper-tt.html` (double-click works offline), or `index.html` with the `js/` and `kit/` folders next to it.
- **Players:** 1 player (Teddy or Tommy, and the other brother comes whenever you call him), or 2 players taking turns.
- **Level:** 🐣 **EASY** is the default, for Tommy (5): slower critters, fewer of them, a longer moment before a rim critter tickles, 2 super zaps a level and 5 lives. 🔥 **NORMAL** is for Teddy (8): faster critters and more of them, hoppers from the start, 1 super zap a level and 3 lives.
- **Score:** a jelly is 100, a hopper 150, a splitter 200 and each half 50 (+50 for one zapped on the rim). Clearing level n is n × 500. An extra life every 10,000. HI-SCORE and the TOP ZAPPERS board (with Foxy 🦊 and Froggy 🐸, who cheer from the corners) are kept for each level.

## The tubes

- **16 lanes** on every tube. Each level is a new shape: a circle, a square, a star, a heart, a flat bridge, a flower, a rainbow and a diamond. Between levels the old tube melts into the new one. Clear all 8 and you've won.
- **Going round:** ← moves the zapper one lane counter-clockwise, → one lane clockwise; hold to keep going. Two arrows on the rim beside the zapper show where each key goes, with its key on them (◀ ▶ on a touch screen). Every level starts on the top lane, so the first → goes to the right. The bridge and the rainbow are open: their ends stop the zapper (the arrow there goes away), and they sit at the top so clockwise is to the right there too.
- **Zap:** Space zaps down your own lane, and only that lane. A zap pops the first critter it meets. Hold Space to keep zapping.
- **Critters:** pink jellies climb straight up; green hoppers with springy antennae hop to the next lane now and then; orange peanut-shaped splitters split in two when zapped, one small yellow half in each lane beside it.
- **The rim:** a critter that gets to the rim walks along it toward your zapper. If it sits in your lane for a moment, it tickles you: a life goes, and every other critter near the top slides back down the tube. Zap it in that moment and you're safe.
- **Super zap:** ↓ pops every critter on the tube at once (a splitter goes whole). 2 a level on EASY, 1 on NORMAL.
- **A level ends** when every critter is gone: none on the tube and none still to come.
- **2 players** take turns, each with his own score, lives and level. The turn passes when a life is lost or a level is cleared.

## Controls

| | keys |
|---|---|
| round the rim | ← counter-clockwise, → clockwise (or A D) |
| zap down your lane (hold to keep zapping) | Space, ↑ or W |
| super zap | ↓, S or Z |
| call your brother · high five | T (or Enter) |
| pause · sound | P or Esc · M |

2 players take turns, so both use the same keys. On the title: 1 / 2 players, E easy, N normal, C (or ← →) picks who plays, Enter starts.

**Touch:** touch the tube and the zapper walks the short way round to that lane and keeps zapping while your finger is down (a mouse works the same). Or use ◀ ↺ and ▶ ↻ bottom left, and ⚡ (hold), 💫 (super zap) and your brother's face bottom right. The tube fits the free part of the screen, beside or above the buttons, on phones and iPads.

## Call your brother (companion mode)

- **Any time, as often as you like:** press **T** or tap his face (1 player). Calling again while he's here gets ONE MORE ZAP.
- **He pops in** on the rim at his own size, does his signature move (Teddy's boxing or 🏀 jump shot, Tommy's ✌️ Y pose) and tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌, +100).
- **Then he super-zaps the whole tube:** "TOMMY SAYS: SUPER ZAP!" and every critter on it sparkles away. It's free: your own super zaps stay.
- **While he's here, nothing can tickle you.**
- **2 players:** T is a high five (+50), and the waiting brother pops over to the rim for it.

## The end

Every level clear is a little party: the rider turns round and does his signature move, with confetti. When the lives run out or all 8 tubes are zapped: the winner (the top scorer) does his signature move in front of the tube with his brother waving beside him, confetti, GREAT ZAPPING! (or ALL 8 TUBES ZAPPED!, or TEDDY WINS! in 2 players), the TOP ZAPPERS board and PLAY AGAIN.

## How it's tested

- **The rules** (`js/sim.js`, with the tubes in `js/shapes.js`) run without drawing in fixed 1/60 s steps, so the page, the autopilot (`js/bot.js`) and the checks share them.
- **The headless check:** `node tools/check.js` (or `game.check()` in the page) checks the brief's rules on the real rules: every tube has 16 lanes that all go clockwise, none crossing; on every tube a zap down each of the 16 lanes pops only that lane's critter (and only the nearest one); splitters split into the two lanes beside them, and hoppers hop one lane at a time and are hit where they are now; a level ends exactly once, only when every critter is gone; and on every tube, from every lane, → moves clockwise and ← counter-clockwise (held keys, open ends and fingers too). Plus super zaps, lives and tickles, the companion, 2 players' turns, and the autopilot clearing all 8 tubes on EASY and NORMAL, 1 and 2 players.
- **It can fail:** `node tools/check.js --fail` turns on 16 sabotages one at a time (a lane missing, a tube drawn the other way round, ← and → swapped, zaps that hit the next lane or everything in theirs, splitters that don't split or split into one lane, hoppers that never hop or jump two, levels that end early or never, useless super zaps, too few lives, a zapper stuck after a tickle, a brother who never zaps, no turns); each must be caught.
- **Real keys:** `game.playCheck()` (run by `node tools/shoot.js tools/keys.json`) presses real `keydown`/`keyup` events on `window` and taps the touch buttons and the tube with pointer events, never the autopilot. On all 8 tubes, EASY and NORMAL, for Teddy, Tommy and both brothers' turns in 2 players, from every lane: → moves the zapper clockwise on the screen and the way the → rim arrow points, ← counter-clockwise and the way the ← arrow points (A D and ◀ ▶ too), the open ends stop it, and every level's first → goes right. Space zaps its own lane only, holding it keeps zapping, ⚡ and 💫 and ↓ work, a finger on the tube walks there and zaps. And nothing leaves him stuck: a tickle, a key held through pause, a lost window, a cancelled touch, the brother's visit, the next tube, the 2 player turn change, the bridge's end, and a keyboard kid mashing keys on every tube. `game.playCheck('mirror')` and `game.playCheck('stuck')` must fail.
- **中文:** `node tools/shoot.js tools/zh.json` visits every screen and message in 中文 (`Kit.lang.untranslated()` is empty on each) and checks English mode shows no Chinese. `tools/layout.json` checks every tube at phone portrait and landscape and iPad sizes with touch: no overlaps, no scrolling. `tools/dist.json` checks the single page from `file://`.
- **docs/screenshot.jpg:** `node tools/shoot.js tools/shots.json docs 1200 750`.
- Tests run muted; sound is checked in code (`game.state().sfx` counts every effect).

## Not verified

- **Sound:** every sound is synthesised and counted in code, but nobody has listened to it (tests ran muted).
- **Real devices:** touch was driven with synthetic pointer events in emulated phones and iPads, not on a real iPad or iPhone. Frame rate was only seen in headless software rendering, not on an older iPad.
- **Real kids:** how hard EASY and NORMAL feel was only judged with an autopilot (which never loses a life on either), not with Teddy and Tommy. On a closed tube → is clockwise, so at the bottom of the tube it moves the zapper to the left; the rim arrows show this, but whether a 5-year-old follows it is untested (touching the tube needs no directions at all).
- **A real Finder double-click,** the home-screen icon on a real iPad, and the offline font fallback.
