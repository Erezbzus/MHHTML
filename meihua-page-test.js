const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('E:/Program Files/deepseek/meihua-guide.html', 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!blocks.length) { console.log('NO SCRIPT FOUND'); process.exit(1); }
const values = {};
const els = {};
function makeEl(id) {
  return {
    id,
    get value() { return values[id] !== undefined ? values[id] : ''; },
    innerHTML: '',
    textContent: '',
    children: [],
    addEventListener: () => {},
    appendChild(child) { this.children.push(child); },
    classList: { toggle: () => false },
  };
}
const ctx = {
  window: { addEventListener: () => {} },
  document: {
    getElementById: (id) => (els[id] || (els[id] = makeEl(id))),
    querySelector: () => ({ appendChild: () => {} }),
    createElement: () => ({ innerHTML: '', children: [], appendChild() { this.children.push(1); } }),
  },
  console,
};
vm.createContext(ctx);
blocks.forEach((code) => vm.runInContext(code, ctx));

function runCase(upper, lower, yao, expected) {
  values.upper = upper; values.lower = lower; values.yao = String(yao); values.season = '夏';
  vm.runInContext('compute()', ctx);
  const c = ctx.current;
  const hexName = (a, b) => ctx.HEX[a + b];
  const got = {
    body: c.body, use: c.use,
    bian: hexName(c.changedUpper, c.changedLower),
    hu: hexName(c.huUpper, c.huLower),
    cuo: hexName(c.cuoUpper, c.cuoLower),
    zong: hexName(c.zongUpper, c.zongLower),
  };
  const pass = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} [梅花] ${upper}上${lower}下 动爻${yao} -> ${JSON.stringify(got)}`);
  if (!pass) console.log('  期望:', JSON.stringify(expected));
}

runCase('离', '震', 2, { body: '离', use: '震', bian: '火泽睽', hu: '水山蹇', cuo: '水风井', zong: '山火贲' });
runCase('离', '离', 2, { body: '离', use: '离', bian: '火天大有', hu: '泽风大过', cuo: '坎为水', zong: '离为火' });
runCase('坎', '艮', 1, { body: '坎', use: '艮', bian: '水火既济', hu: '火水未济', cuo: '火泽睽', zong: '雷水解' });
runCase('乾', '坤', 6, { body: '坤', use: '乾', bian: '泽地萃', hu: '风山渐', cuo: '地天泰', zong: '地天泰' });

// ── 互卦详情输出断言（离为火 2爻动：下互巽、上互兑；体火受巽生、克兑；取数 8/7/4）──
values.upper = '离'; values.lower = '离'; values.yao = '2'; values.season = '夏';
vm.runInContext('compute()', ctx);
const outHtml = els['chartOutput'].innerHTML;
const huChecks = [
  ['下互拆解', outHtml.includes('下互（前段·内在）＝巽')],
  ['上互拆解', outHtml.includes('上互（后段·外在）＝兑')],
  ['下互生体', outHtml.includes('下互生体')],
  ['体克上互', outHtml.includes('体克上互')],
  ['取数 体+用+动爻=8', outHtml.includes('体＋用＋动爻＝8')],
  ['取数 下互+上互=7', outHtml.includes('下互＋上互＝7')],
  ['取数 变卦=4', outHtml.includes('变卦＝4')],
];
huChecks.forEach(([label, pass]) => console.log(`${pass ? 'PASS' : 'FAIL'} [互卦详情] ${label}`));


// ── 爻辞数据覆盖与抽查 ──
const guaCi = vm.runInContext('GUA_CI', ctx);
const yaoCi = vm.runInContext('YAO_CI', ctx);
const hexNames = Object.keys(vm.runInContext('HEX', ctx)).map((k) => vm.runInContext('HEX', ctx)[k]);
let missingGua = hexNames.filter((n) => !guaCi[n]);
let badYao = hexNames.filter((n) => !yaoCi[n] || yaoCi[n].length !== 6);
console.log(`${missingGua.length === 0 && badYao.length === 0 ? 'PASS' : 'FAIL'} [爻辞] 64卦卦辞覆盖=${64 - missingGua.length}/64，384爻辞覆盖=${hexNames.length - badYao.length}卦×6爻（缺失: ${[...missingGua, ...badYao].join(',') || '无'}）`);

function checkYaoCi(name, pos, expected) {
  const got = vm.runInContext(`yaoCiText('${name}', ${pos})`, ctx);
  const pass = got === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} [爻辞] ${name} 第${pos}爻 -> ${got}`);
  if (!pass) console.log('  期望:', expected);
}
checkYaoCi('火雷噬嗑', 2, '六二：噬肤灭鼻，无咎。');
checkYaoCi('离为火', 2, '六二：黄离，元吉。');
checkYaoCi('泽风大过', 2, '九二：枯杨生稊，老夫得其女妻，无不利。');
checkYaoCi('火天大有', 6, '上九：自天祐之，吉无不利。');
checkYaoCi('水山蹇', 2, '六二：王臣蹇蹇，匪躬之故。');
checkYaoCi('乾为天', 5, '九五：飞龙在天，利见大人。');
checkYaoCi('水风井', 6, '上六：井收勿幕，有孚元吉。');
const guaSpot = vm.runInContext("GUA_CI['火天大有']", ctx);
console.log(`${guaSpot === '大有：元亨。' ? 'PASS' : 'FAIL'} [卦辞] 火天大有 -> ${guaSpot}`);

// ── 白话简注覆盖与抽查 ──
const yaoZhu = vm.runInContext('YAO_ZHU', ctx);
const missingZhu = hexNames.filter((n) => !yaoZhu[n] || yaoZhu[n].length !== 6);
console.log(`${missingZhu.length === 0 ? 'PASS' : 'FAIL'} [白话] 384爻辞白话简注覆盖=${hexNames.length - missingZhu.length}卦×6爻（缺失: ${missingZhu.join(',') || '无'}）`);
function checkYaoZhu(name, pos, expected) {
  const got = vm.runInContext(`yaoZhuText('${name}', ${pos})`, ctx);
  const pass = got === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} [白话] ${name} 第${pos}爻 -> ${got}`);
  if (!pass) console.log('  期望:', expected);
}
checkYaoZhu('离为火', 2, '居中得正、如黄色中道，大吉。');
checkYaoZhu('火雷噬嗑', 2, '断案如噬嫩肉，虽深究亦无咎。');
checkYaoZhu('水山蹇', 5, '大难当前，朋友纷来相助。');
checkYaoZhu('火天大有', 6, '顺天而行，天自保佑，吉无不利。');
checkYaoZhu('乾为天', 1, '时机未到，宜潜藏蓄力，不急于出头。');
checkYaoZhu('泽风大过', 2, '枯杨发芽、老夫得少妻，无不利。');
checkYaoZhu('水风井', 6, '井成不覆、与民共用，诚信大吉。');
checkYaoZhu('火水未济', 5, '诚信之光、有孚而吉。');

// ── 白话卦辞与小象传覆盖与抽查 ──
const guaCiZhu = vm.runInContext('GUA_CI_ZHU', ctx);
const xiangYao = vm.runInContext('XIANG_YAO', ctx);
const missingGuaZhu = hexNames.filter((n) => !guaCiZhu[n]);
const missingXiang = hexNames.filter((n) => !xiangYao[n] || xiangYao[n].length !== 6);
console.log(`${missingGuaZhu.length === 0 ? 'PASS' : 'FAIL'} [白话卦辞] 覆盖=${64 - missingGuaZhu.length}/64（缺失: ${missingGuaZhu.join(',') || '无'}）`);
console.log(`${missingXiang.length === 0 ? 'PASS' : 'FAIL'} [小象传] 覆盖=${hexNames.length - missingXiang.length}卦×6爻（缺失: ${missingXiang.join(',') || '无'}）`);
function checkXiang(name, pos, expected) {
  const got = vm.runInContext(`xiangYaoText('${name}', ${pos})`, ctx);
  const pass = got === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} [小象] ${name} 第${pos}爻 -> ${got}`);
  if (!pass) console.log('  期望:', expected);
}
checkXiang('离为火', 2, '黄离元吉，得中道也。');
checkXiang('火雷噬嗑', 2, '噬肤灭鼻，乘刚也。');
checkXiang('乾为天', 1, '潜龙勿用，阳在下也。');
checkXiang('泽风大过', 2, '老夫女妻，过以相与也。');
checkXiang('水山蹇', 5, '大蹇朋来，以中节也。');
checkXiang('火天大有', 6, '大有上吉，自天祐也。');
checkXiang('水风井', 6, '元吉在上，大成也。');
checkXiang('风泽中孚', 2, '其子和之，中心愿也。');
function checkGuaZhu(name, expected) {
  const got = vm.runInContext(`guaCiZhuText('${name}')`, ctx);
  const pass = got === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'} [白话卦辞] ${name} -> ${got}`);
  if (!pass) console.log('  期望:', expected);
}
checkGuaZhu('火天大有', '盛大富有，大亨通。');
checkGuaZhu('水山蹇', '利西南，不利东北；利见大人，守正吉。');
checkGuaZhu('泽山咸', '亨通，利守正；娶女吉。');
checkGuaZhu('天风姤', '女子过于强壮，不宜娶。');

// ── 新增：推演结果「每一卦写清楚」（五张卦卡片）──
const cardCount = (outHtml.match(/class="hex-card"/g) || []).length;
console.log(`${cardCount === 5 ? 'PASS' : 'FAIL'} [卡片] 推演结果卦卡片数=${cardCount}（期望5）`);
['主卦（本卦）', '互卦（过程）', '变卦（结局）', '错卦（反面）', '综卦（倒看）'].forEach((lb) => {
  console.log(`${outHtml.includes(lb) ? 'PASS' : 'FAIL'} [卡片] ${lb}`);
});
console.log(`${outHtml.includes('离：利贞，亨。畜牝牛，吉。') ? 'PASS' : 'FAIL'} [卡片] 主卦卦辞原文`);
console.log(`${outHtml.includes('利于守正，亨通；养柔顺之牛，吉。') ? 'PASS' : 'FAIL'} [卡片] 主卦白话卦辞`);
const detailCount = (outHtml.match(/展开本卦六爻爻辞与白话/g) || []).length;
console.log(`${detailCount === 5 ? 'PASS' : 'FAIL'} [卡片] 六爻折叠块=${detailCount}（期望5）`);
console.log(`${outHtml.includes('上卦类象：') && outHtml.includes('下卦类象：') ? 'PASS' : 'FAIL'} [卡片] 上下卦类象行`);
console.log(`${outHtml.includes('第 4 爻') || outHtml.includes('第4爻') ? 'PASS' : 'FAIL'} [卡片] 六爻逐爻列出`);

// ── 新增：八卦类象表（查询时渲染，8 行 15 列）──
vm.runInContext('renderLeiXiangTable()', ctx);
const lxRows = (els['leixiangTable'] && els['leixiangTable'].children.length) || 0;
console.log(`${lxRows === 8 ? 'PASS' : 'FAIL'} [类象表] 渲染行数=${lxRows}（期望8）`);
const lxCellCount = els['leixiangTable'].children.length ? (els['leixiangTable'].children[0].innerHTML.match(/<td/g) || []).length : 0;
console.log(`${lxCellCount === 15 ? 'PASS' : 'FAIL'} [类象表] 列数=${lxCellCount}（期望15）`);

// ── 新增：六十四卦速查（查询时渲染 + 检索）──
vm.runInContext('renderHexTable()', ctx);
const allHex = (els['hexTable'].innerHTML.match(/class="hex-card"/g) || []).length;
console.log(`${allHex === 64 ? 'PASS' : 'FAIL'} [64卦] 全量条目=${allHex}（期望64）`);
console.log(`${els['hexTable'].innerHTML.includes('第 1 卦') && els['hexTable'].innerHTML.includes('乾为天') ? 'PASS' : 'FAIL'} [64卦] 文王卦序与卦名`);
console.log(`${els['hexTable'].innerHTML.includes('乾：元亨利贞。') && els['hexTable'].innerHTML.includes('大通顺，利于守正。') ? 'PASS' : 'FAIL'} [64卦] 卦辞+白话`);
values.hexSearch = '噬嗑';
vm.runInContext('renderHexTable()', ctx);
const one = (els['hexTable'].innerHTML.match(/class="hex-card"/g) || []).length;
console.log(`${one === 1 ? 'PASS' : 'FAIL'} [64卦] 检索「噬嗑」命中=${one}（期望1）`);
console.log(`${((els['hexCount'] && els['hexCount'].textContent) || '').includes('共 1 卦') ? 'PASS' : 'FAIL'} [64卦] 计数显示 -> ${els['hexCount'].textContent}`);
values.hexSearch = '';

// ── 新增：参考区默认隐藏（静态 + 行为双重验证）──
[
  ['类象区带 hidden 类', /id="leixiangBox"[^>]*class="[^"]*hidden/.test(html)],
  ['速查区带 hidden 类', /id="liushisiBox"[^>]*class="[^"]*hidden/.test(html)],
  ['类象展开按钮', html.includes('id="btnLeixiang"')],
  ['速查展开按钮', html.includes('id="btnLiushisi"')],
  ['类象表 15 列表头', html.includes('<th>脏腑</th>') && html.includes('<th>场所</th>') && html.includes('<th>旺令</th>')],
  ['速查区含检索框与计数', html.includes('id="hexSearch"') && html.includes('id="hexCount"')],
].forEach(([label, pass]) => console.log(`${pass ? 'PASS' : 'FAIL'} [默认隐藏/详细] ${label}`));

// ── 行为验证：未点击不渲染、点击展开、再点收起（独立沙盒 + 模拟点击）──
(function behaviorTest() {
  const v = {}, e = {};
  function mk(id) {
    const classes = new Set();
    return {
      id,
      get value() { return v[id] !== undefined ? v[id] : ''; },
      set value(val) { v[id] = val; },
      innerHTML: '', textContent: '', children: [], listeners: {},
      addEventListener(type, fn) { this.listeners[type] = fn; },
      appendChild(child) { this.children.push(child); },
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c) => (classes.has(c) ? (classes.delete(c), false) : (classes.add(c), true)),
      },
    };
  }
  const sandbox = {
    window: { addEventListener: (t, f) => { if (t === 'DOMContentLoaded') sandbox.__ready = f; } },
    document: {
      getElementById: (id) => (e[id] || (e[id] = mk(id))),
      querySelector: () => ({ appendChild: () => {} }),
      createElement: () => ({ innerHTML: '', children: [], appendChild() { this.children.push(1); } }),
    },
    console,
  };
  vm.createContext(sandbox);
  blocks.forEach((code) => vm.runInContext(code, sandbox));
  v.upper = '离'; v.lower = '离'; v.yao = '2'; v.season = '夏';
  sandbox.__ready();
  const boxL = sandbox.document.getElementById('leixiangBox');
  const boxS = sandbox.document.getElementById('liushisiBox');
  boxL.classList.add('hidden');
  boxS.classList.add('hidden');
  const notRendered = !e['leixiangTable'] || e['leixiangTable'].children.length === 0;
  console.log(`${notRendered ? 'PASS' : 'FAIL'} [行为] 未查询时类象表不渲染（行数=${e['leixiangTable'] ? e['leixiangTable'].children.length : 0}）`);
  e['btnLeixiang'].listeners.click.call(e['btnLeixiang']);
  const opened = boxL.classList.contains('hidden') === false;
  const rows = e['leixiangTable'].children.length;
  console.log(`${opened && rows === 8 ? 'PASS' : 'FAIL'} [行为] 点击后展开并渲染 8 行（行数=${rows}）`);
  console.log(`${e['btnLeixiang'].textContent === '收起八卦类象全表' ? 'PASS' : 'FAIL'} [行为] 按钮文案切换 -> ${e['btnLeixiang'].textContent}`);
  e['btnLiushisi'].listeners.click.call(e['btnLiushisi']);
  const hexCards = (e['hexTable'].innerHTML.match(/class="hex-card"/g) || []).length;
  console.log(`${boxS.classList.contains('hidden') === false && hexCards === 64 ? 'PASS' : 'FAIL'} [行为] 点击后展开速查并渲染 64 卦（卡片=${hexCards}）`);
  e['btnLeixiang'].listeners.click.call(e['btnLeixiang']);
  console.log(`${boxL.classList.contains('hidden') === true ? 'PASS' : 'FAIL'} [行为] 再次点击可收起`);
})();
