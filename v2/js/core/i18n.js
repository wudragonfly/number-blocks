// i18n.js — bilingual strings and number verbalizers (DESIGN.md §8).
// Every user-facing string is a {en, zh} pair.

// ---------------------------------------------------------------- UI strings

export const STR = {
  appName: { zh: '数字方块', en: 'Number Blocks' },
  tagline: { zh: '和数字方块一起玩数学！', en: 'Play math with the number blocks!' },
  loading: { zh: '加载中…', en: 'Loading…' },
  home: { zh: '主页', en: 'Home' },
  settings: { zh: '设置', en: 'Settings' },
  language: { zh: '语言', en: 'Language' },
  bothLang: { zh: '双语', en: 'Both' },
  sound: { zh: '声音', en: 'Sound' },
  soundAll: { zh: '总开关', en: 'All sound' },
  voiceOpt: { zh: '语音朗读', en: 'Voice' },
  sfxOpt: { zh: '音效', en: 'Sound effects' },
  speed: { zh: '语速', en: 'Voice speed' },
  slow: { zh: '慢', en: 'Slow' },
  normal: { zh: '正常', en: 'Normal' },
  voiceEn: { zh: '英文声音', en: 'English voice' },
  voiceZh: { zh: '中文声音', en: 'Chinese voice' },
  autoVoice: { zh: '自动', en: 'Auto' },
  difficulty: { zh: '默认难度', en: 'Default level' },
  thisGame: { zh: '本游戏', en: 'This game' },
  levelN: { zh: '第{n}级', en: 'Level {n}' },
  ages: { zh: '{a}岁', en: 'Ages {a}' },
  starsEarned: { zh: '{n}颗星', en: '{n} stars' },
  resetProgress: { zh: '清除所有星星和进度', en: 'Reset all stars & progress' },
  resetDone: { zh: '已清除！', en: 'Progress cleared!' },
  playAgain: { zh: '再玩一次', en: 'Play again' },
  nextLevel: { zh: '下一级', en: 'Level up' },
  goHome: { zh: '回主页', en: 'Home' },
  wellDone: { zh: '真棒！', en: 'Well done!' },
  quizDone: { zh: '完成啦！', en: 'All done!' },
  scoreLine: { zh: '{a} / {b} 一次答对', en: '{a} / {b} right on the first try' },
  movesLine: { zh: '用了 {n} 步', en: 'Done in {n} moves' },
  answerIs: { zh: '答案是 {a}', en: 'The answer is {a}' },
  check: { zh: '确定', en: 'Check' },
  chooseLevel: { zh: '选择难度', en: 'Choose a level' },
  forAges: { zh: '适合 {a} 岁', en: 'ages {a}' },
};

export const PRAISES = [
  { zh: '太棒了！', en: 'Awesome!' },
  { zh: '答对了！', en: "That's right!" },
  { zh: '真聪明！', en: 'So smart!' },
  { zh: '好厉害！', en: 'Amazing!' },
  { zh: '完全正确！', en: 'Exactly right!' },
  { zh: '你真棒！', en: 'Great job!' },
];

export const ENCOURAGEMENTS = [
  { zh: '再试一次！', en: 'Try again!' },
  { zh: '差一点点！', en: 'So close!' },
  { zh: '加油，你可以的！', en: 'You can do it!' },
  { zh: '再想一想！', en: 'Think again!' },
];

// ------------------------------------------------------------- templating

/** fmt('Level {n}', {n: 3}) — params may be strings, numbers, or {en,zh} pairs. */
function fmtLang(str, params, lang) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    if (v == null) return '';
    if (typeof v === 'object') return v[lang] ?? '';
    return String(v);
  });
}

/** t('levelN', {n: 2}) → {zh: '第2级', en: 'Level 2'} */
export function t(key, params) {
  const pair = STR[key];
  if (!pair) return { en: key, zh: key };
  return fmtPair(pair, params);
}

export function fmtPair(pair, params) {
  return { en: fmtLang(pair.en, params, 'en'), zh: fmtLang(pair.zh, params, 'zh') };
}

// ------------------------------------------------------- number verbalizers

const ZH_D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function numZh(n) {
  n = Math.round(n);
  if (n < 0) return '负' + numZh(-n);
  if (n < 10) return ZH_D[n];
  if (n < 20) return '十' + (n % 10 ? ZH_D[n % 10] : '');
  if (n < 100) {
    const t10 = Math.floor(n / 10);
    return ZH_D[t10] + '十' + (n % 10 ? ZH_D[n % 10] : '');
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let s = ZH_D[h] + '百';
    if (r === 0) return s;
    if (r < 10) return s + '零' + ZH_D[r];
    if (r < 20) return s + '一十' + (r % 10 ? ZH_D[r % 10] : '');
    return s + numZh(r);
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    let s = ZH_D[th] + '千';
    if (r === 0) return s;
    if (r < 100) return s + '零' + (r < 10 ? ZH_D[r] : r < 20 ? '一十' + (r % 10 ? ZH_D[r % 10] : '') : numZh(r));
    return s + numZh(r);
  }
  return String(n);
}

const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const EN_TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numEn(n) {
  n = Math.round(n);
  if (n < 0) return 'minus ' + numEn(-n);
  if (n < 10) return EN_ONES[n];
  if (n < 20) return EN_TEENS[n - 10];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? '-' + EN_ONES[n % 10] : '');
  if (n < 1000) return EN_ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numEn(n % 100) : '');
  if (n < 10000) return numEn(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numEn(n % 1000) : '');
  return String(n);
}

/** numWords(23) → {en: 'twenty-three', zh: '二十三'} */
export function numWords(n) {
  return { en: numEn(n), zh: numZh(n) };
}

/** decWords(0.35) → {en: 'zero point three five', zh: '零点三五'} */
export function decWords(x) {
  const s = String(x);
  const [i, d] = s.split('.');
  const int = parseInt(i, 10) || 0;
  if (!d) return numWords(int);
  const enDigits = [...d].map((c) => EN_ONES[+c]).join(' ');
  const zhDigits = [...d].map((c) => ZH_D[+c]).join('');
  return { en: `${numEn(int)} point ${enDigits}`, zh: `${numZh(int)}点${zhDigits}` };
}

const EN_ORDINALS = {
  2: 'half', 3: 'third', 4: 'quarter', 5: 'fifth', 6: 'sixth', 7: 'seventh',
  8: 'eighth', 9: 'ninth', 10: 'tenth', 12: 'twelfth', 20: 'twentieth', 100: 'hundredth',
};

/** fracWords(3, 4) → {en: 'three quarters', zh: '四分之三'} */
export function fracWords(num, den) {
  let unit = EN_ORDINALS[den] || `${numEn(den)}th`;
  let en;
  if (num === 1) {
    en = `one ${unit}`;
  } else {
    if (unit === 'half') unit = 'halves';
    else unit += 's';
    en = `${numEn(num)} ${unit}`;
  }
  return { en, zh: `${numZh(den)}分之${numZh(num)}` };
}

/** mixed number: 1 and 3/4 → 一又四分之三 */
export function mixedWords(whole, num, den) {
  const f = fracWords(num, den);
  return { en: `${numEn(whole)} and ${f.en}`, zh: `${numZh(whole)}又${f.zh}` };
}

/** pctWords(35) → {en: 'thirty-five percent', zh: '百分之三十五'} */
export function pctWords(p) {
  const w = Number.isInteger(p) ? numWords(p) : decWords(p);
  return { en: `${w.en} percent`, zh: `百分之${w.zh}` };
}

export const OPS = {
  '+': { en: 'plus', zh: '加' },
  '-': { en: 'minus', zh: '减' },
  '×': { en: 'times', zh: '乘' },
  '÷': { en: 'divided by', zh: '除以' },
  '=': { en: 'equals', zh: '等于' },
};

/** askEq(3, '+', 4) → spoken question pair “3 加 4 等于几？ / What is 3 plus 4?” */
export function askEq(a, op, b) {
  const A = numWords(a);
  const B = numWords(b);
  const O = OPS[op];
  return {
    en: `What is ${A.en} ${O.en} ${B.en}?`,
    zh: `${A.zh}${O.zh}${B.zh}等于几？`,
  };
}

/** stateEq(3, '+', 4, 7) → “3 加 4 等于 7 / 3 plus 4 equals 7” */
export function stateEq(a, op, b, c) {
  const A = numWords(a);
  const B = numWords(b);
  const C = numWords(c);
  const O = OPS[op];
  return {
    en: `${A.en} ${O.en} ${B.en} equals ${C.en}`,
    zh: `${A.zh}${O.zh}${B.zh}等于${C.zh}`,
  };
}
