/* 中文 for TT Tube Zapper. The page translates itself from this dictionary (kit/lang.js); names stay English.
   The brief's words: 隧道 (tube), 激光 (laser, the zap), 果冻怪 (jelly critters), 跑道 (lanes). */
(function () {
  Kit.lang.keep(['TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', 'Foxy', 'Froggy', 'Claude Code', 'Esc', 'T']);
  const SHAPE = { CIRCLE: '圆形', SQUARE: '方形', STAR: '星星', HEART: '爱心', BRIDGE: '平桥', FLOWER: '花朵', RAINBOW: '彩虹', DIAMOND: '菱形' };
  const shape = (s) => SHAPE[s] || s;
  Kit.lang.add(Object.assign({}, SHAPE, {
    [TZ.TITLE]: TZ.ZH,
    // title
    'Zap the jelly critters into sparkles before they climb out!': '在果冻怪爬出隧道之前，用激光把它们变成小星星！',
    PLAYERS: '玩家', PLAYER: '谁来玩', LEVEL: '难度',
    '1 PLAYER': '1 个人', '2 PLAYERS': '2 个人',
    'call your brother any time': '随时叫兄弟来帮忙',
    'Teddy & Tommy take turns': 'Teddy 和 Tommy 轮流玩',
    'boxing champ': '拳击冠军', 'peace sign pro': '比耶高手',
    EASY: '简单', NORMAL: '普通',
    'slow critters · 2 super zaps · 5 lives': '果冻怪慢 · 2 次超级激光 · 5 条命',
    'faster critters · 1 super zap · 3 lives': '果冻怪快 · 1 次超级激光 · 3 条命',
    '▶ ZAP!': '▶ 发射！',
    'round the rim (the arrows show the way)': '沿着边转（箭头指方向）',
    'zap down the lane (hold to keep zapping)': '顺着跑道发激光（按住连发）',
    'super zap: the whole tube': '超级激光：整条隧道',
    'call your brother': '叫兄弟来', 'pause · sound': '暂停 · 声音', or: '或',
    "Touch the tube to zap down that lane, or ◀ ▶ and ⚡. 💫 is the super zap. Tap your brother's face to call him!":
      '点隧道，就顺着那条跑道发激光；也可以用 ◀ ▶ 和 ⚡。💫 是超级激光。点兄弟的脸叫他来！',
    '↻ Turn sideways for a bigger screen!': '↻ 横过来玩，屏幕更大！',
    'built with': '制作工具：',
    Players: '玩家', 'Who plays': '谁来玩', Difficulty: '难度',
    // HUD and touch
    'HI-SCORE': '最高分', 'SUPER ZAP': '超级激光', 'HIGH FIVE': '击掌', CALL: '叫人', ZAP: '激光', SUPER: '超级',
    'Pause (P)': '暂停 (P)', Pause: '暂停', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开或关', 'Sound on / off (M)': '声音 开 / 关 (M)',
    'Counter-clockwise': '逆时针', Clockwise: '顺时针',
    // big words, pops, toasts
    'READY?': '准备好了吗？', 'GO!': '出发！', 'LEVEL CLEAR!': '过关啦！', 'GAME OVER': '游戏结束',
    'SUPER ZAP!': '超级激光！', 'SPARKLE!': '亮晶晶！', 'POP!': '啵！', 'BLOOP!': '噗噜！', 'TWINKLE!': '闪闪！', 'FIZZ!': '滋滋！',
    'SPLIT!': '分成两个！', 'ON THE RIM!': '爬上边啦！', 'TEE-HEE! TICKLE!': '嘻嘻！挠痒痒！', 'ONE MORE ZAP!': '再来一发！',
    'HIGH FIVE! ✋ +50': '击掌！✋ +50', 'EXTRA LIFE!': '多一条命！', 'NO SUPER ZAPS LEFT': '超级激光用完啦',
    'ALL TUBES ZAPPED!': '所有隧道都过关啦！',
    // pause and results
    PAUSED: '暂停中', '▶ RESUME': '▶ 继续', MENU: '菜单', 'P · Esc · Space to go on · Q for the menu · M sound': 'P · Esc · 空格 继续 · Q 回菜单 · M 声音',
    'GREAT ZAPPING!': '激光真棒！', 'ALL 8 TUBES ZAPPED!': '8 条隧道全过关！', "IT'S A TIE!": '平手！',
    '🐣 TOP ZAPPERS': '🐣 激光高手榜', '🔥 TOP ZAPPERS': '🔥 激光高手榜', '⭐ NEW HI-SCORE!': '⭐ 新纪录！', '⭐ ON THE BOARD!': '⭐ 上榜啦！',
    '↻ PLAY AGAIN': '↻ 再玩一次', 'Enter: play again · Esc: menu': '回车：再玩一次 · Esc：菜单',
    'LOADING…': '加载中…',
    // the ? panel
    'round the rim: ← counter-clockwise, → clockwise (the arrows on the rim show the way)': '沿着边转：← 逆时针，→ 顺时针（边上的箭头指方向）',
    'zap down your lane (hold to keep zapping)': '顺着你的跑道发激光（按住连发）',
    'super zap: every critter on the tube (2 a level on easy, 1 on normal)': '超级激光：隧道里所有果冻怪（简单每关 2 次，普通 1 次）',
    'call your brother: he super-zaps the whole tube (2 players: high five)': '叫兄弟来：他用超级激光扫光整条隧道（双人：击掌）',
    'title: 1 or 2 players · easy · normal · who plays': '标题页：1 或 2 人 · 简单 · 普通 · 谁来玩',
    'Jelly critters climb up the lanes. Zap them into sparkles before they reach the rim! On the rim they walk to your zapper and tickle you (a life). Hoppers hop to the next lane; splitters split in two. Every level is a new tube shape. 2 players take turns: the turn passes when a life is lost or a level is cleared. Call your brother as often as you like.':
      '果冻怪顺着跑道往上爬。在它们爬到边上之前，用激光把它们变成小星星！爬上边的果冻怪会走到你的激光炮旁边挠你痒痒（少一条命）。跳跳怪会跳到旁边的跑道，双胞胎怪会分成两个。每一关都是新形状的隧道。双人轮流玩：少一条命或者过一关，就换人。兄弟想叫几次就叫几次。',
    "Touch the tube: your zapper goes to that lane and zaps. Or ◀ ▶ to go round and ⚡ to zap. 💫 is the super zap, and your brother's face calls him.":
      '点隧道：激光炮会去那条跑道并发射。也可以用 ◀ ▶ 转圈，⚡ 发射。💫 是超级激光，点兄弟的脸叫他来。',
  }));
  Kit.lang.rule(/^LEVEL (\d+)$/, '第 $1 关');
  Kit.lang.rule(/^LEVEL (\d+) · ([A-Z]+)$/, (m, n, s) => `第 ${n} 关 · ${shape(s)}`);
  Kit.lang.rule(/^([A-Z]+) · READY\?$/, (m, s) => `${shape(s)} · 准备好了吗？`);
  Kit.lang.rule(/^NEXT: ([A-Z]+)$/, (m, s) => `下一关：${shape(s)}`);
  Kit.lang.rule(/^HI-SCORE ([\d,]+) · (\S+)$/, '最高分 $1 · $2');
  Kit.lang.rule(/^CALL (\S+)$/, '叫 $1');
  Kit.lang.rule(/^(\S+) SAYS: SUPER ZAP!$/, '$1 说：超级激光！');
  Kit.lang.rule(/^(\S+)'S TURN!$/, '轮到 $1 啦！');
  Kit.lang.rule(/^(\S+) FIRST!$/, '$1 先玩！');
  Kit.lang.rule(/^(\S+) WINS!$/, '$1 赢啦！');
  Kit.lang.rule(/^(\S+) ZAPPED ALL 8 TUBES!$/, '$1 把 8 条隧道全过关啦！');
  Kit.lang.rule(/^(\S+): (\d+) LIVES? LEFT$/, '$1：还剩 $2 条命');
  Kit.lang.rule(/^(\S+) IS OUT OF LIVES$/, '$1 没有命啦');
  Kit.lang.rule(/^NO SUPER ZAPS LEFT · CALL (\S+)!$/, '超级激光用完啦 · 叫 $1 来！');
  Kit.lang.rule(/^(\d+) MORE THIS LEVEL$/, '这关还有 $1 次');
  Kit.lang.rule(/^SUPER ×(\d+)$/, '超级 ×$1');
  Kit.lang.rule(/^([\d,]+) points · level (\d+)$/, '$1 分 · 第 $2 关');
  Kit.lang.rule(/^(\S+) ([\d,]+) · (\S+) ([\d,]+)$/, '$1 $2 · $3 $4');
  Kit.lang.rule(/^(\S+) (\+\d+)$/, '$1 $2');
})();
