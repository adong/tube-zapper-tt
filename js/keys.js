/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: TZ.TITLE, // the name lives in js/title.js
  keys: [
    ['round the rim: ← counter-clockwise, → clockwise (the arrows on the rim show the way)', '← → or A D'],
    ['zap down your lane (hold to keep zapping)', 'Space or ↑ or W'],
    ['super zap: every critter on the tube (2 a level on easy, 1 on normal)', '↓ or S or Z'],
    ['call your brother: he super-zaps the whole tube (2 players: high five)', 'T or Enter'],
    ['pause · sound', 'P or Esc · M'],
    ['title: 1 or 2 players · easy · normal · who plays', '1 2 · E · N · C'],
  ],
  note: 'Jelly critters climb up the lanes. Zap them into sparkles before they reach the rim! On the rim they walk to your zapper and tickle you (a life). Hoppers hop to the next lane; splitters split in two. Every level is a new tube shape. 2 players take turns: the turn passes when a life is lost or a level is cleared. Call your brother as often as you like.',
  touch: 'Touch the tube: your zapper goes to that lane and zaps. Or ◀ ▶ to go round and ⚡ to zap. 💫 is the super zap, and your brother\'s face calls him.',
});
