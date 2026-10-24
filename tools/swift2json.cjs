// Syncs FRETLAB iOS curriculum + scale library into the desktop app.
// Usage: npm run sync:ios -- /path/to/FretLab   (the folder containing Data/, Models/, Services/)
// Writes desktop/src/data/curriculum.json and scales.json. Mirrors the Swift models and buildFullRoutine helper.
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];      // .../FretLab
const OUT = process.argv[3] || path.join(__dirname, '..', 'desktop', 'src', 'data');

// ---------- Tokenizer ----------
function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') {
      let s = '';
      let interp = false;
      i++;
      while (src[i] !== '"') {
        if (src[i] === '\\') {
          const e = src[i + 1];
          if (e === 'n') s += '\n';
          else if (e === 't') s += '\t';
          else if (e === '"') s += '"';
          else if (e === '\\') s += '\\';
          else if (e === "'") s += "'";
          else if (e === '(') { interp = true; s += '\\('; }
          else if (e === 'u') { const m = src.slice(i).match(/^\\u\{([0-9a-fA-F]+)\}/); s += String.fromCodePoint(parseInt(m[1], 16)); i += m[0].length; continue; }
          else throw new Error('Unknown escape \\' + e);
          i += 2;
        } else { s += src[i]; i++; }
      }
      i++;
      toks.push({ t: 'str', v: s, interp });
      continue;
    }
    if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(src[i + 1]))) {
      const m = src.slice(i).match(/^-?[0-9]+(\.[0-9]+)?/);
      toks.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = src.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      toks.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if ('()[]{},:.'.includes(c)) { toks.push({ t: c }); i++; continue; }
    if (c === '-' && src[i + 1] === '>') { toks.push({ t: '->' }); i += 2; continue; }
    toks.push({ t: 'op', v: c }); i++;
  }
  return toks;
}

// ---------- Parser for a literal expression ----------
function parseExprAt(toks, pos) {
  let p = pos;
  const peek = () => toks[p];
  const expect = (t) => { if (toks[p].t !== t) throw new Error(`Expected ${t} got ${JSON.stringify(toks[p])} near ${JSON.stringify(toks.slice(p - 5, p + 5))}`); p++; };

  function expr() {
    const tk = peek();
    if (tk.t === 'str') { if (tk.interp) throw new Error('Interpolated string inside data: ' + tk.v); p++; return tk.v; }
    if (tk.t === 'num') { p++; return tk.v; }
    if (tk.t === '.') { p++; const id = peek(); expect('id'); return { $enum: id.v }; }
    if (tk.t === '[') return array();
    if (tk.t === '(') return tuple();
    if (tk.t === 'id') {
      if (tk.v === 'nil') { p++; return null; }
      if (tk.v === 'true') { p++; return true; }
      if (tk.v === 'false') { p++; return false; }
      p++;
      if (peek() && peek().t === '(') return call(tk.v);
      return { $ident: tk.v };
    }
    throw new Error('Unexpected token ' + JSON.stringify(tk) + ' near ' + JSON.stringify(toks.slice(p - 8, p + 8)));
  }
  function array() {
    expect('[');
    const out = [];
    while (peek().t !== ']') { out.push(expr()); if (peek().t === ',') p++; }
    expect(']');
    return out;
  }
  function tuple() {
    expect('(');
    const out = [];
    while (peek().t !== ')') { out.push(expr()); if (peek().t === ',') p++; }
    expect(')');
    return { $tuple: out };
  }
  function call(name) {
    expect('(');
    const args = {};
    const positional = [];
    while (peek().t !== ')') {
      if (peek().t === 'id' && toks[p + 1] && toks[p + 1].t === ':') {
        const label = peek().v; p += 2;
        args[label] = expr();
      } else positional.push(expr());
      if (peek().t === ',') p++;
    }
    expect(')');
    return { $call: name, args, positional };
  }
  const v = expr();
  return { value: v, end: p };
}

// ---------- Model conversion ----------
const en = (x) => (x && x.$enum) || x;
const enArr = (a) => (a || []).map(en);

function conv(node) {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(conv);
  if (node.$enum) return node.$enum;
  if (node.$call) {
    const a = node.args;
    switch (node.$call) {
      case 'Routine': return {
        id: a.id, courseLevel: en(a.courseLevel), weekNumber: a.weekNumber, name: a.name,
        theoryModuleName: a.theoryModuleName, connectionDescription: a.connectionDescription,
        skillThreads: enArr(a.skillThreads), sessionBlocks: conv(a.sessionBlocks), checkpointQuestions: conv(a.checkpointQuestions),
      };
      case 'SessionBlock': return {
        id: a.id, type: en(a.type), estimatedMinutes: a.estimatedMinutes,
        exercises: a.exercises === undefined ? null : conv(a.exercises),
        theoryLessons: a.theoryLessons === undefined ? null : conv(a.theoryLessons),
      };
      case 'Exercise': return {
        id: a.id, name: a.name, description: a.description, targetBPM: a.targetBPM,
        fretboardDiagram: conv(a.fretboardDiagram ?? null),
        fretboardDiagrams: a.fretboardDiagrams === undefined ? null : conv(a.fretboardDiagrams),
        tabNotation: conv(a.tabNotation ?? null), tips: a.tips || [], skillThreads: enArr(a.skillThreads),
      };
      case 'FretboardDiagram': return {
        title: a.title, subtitle: a.subtitle ?? null, startFret: a.startFret, endFret: a.endFret, highlights: conv(a.highlights),
      };
      case 'FretHighlight': return { string: a.string, fret: a.fret, label: a.label, isRoot: a.isRoot, color: en(a.color) };
      case 'TabNotation': return { tempo: a.tempo, lines: a.lines };
      case 'TheoryLesson': return {
        id: a.id, title: a.title, content: a.content, keyPoints: conv(a.keyPoints),
        fretboardDiagram: conv(a.fretboardDiagram ?? null), skillThreads: enArr(a.skillThreads),
      };
      case 'KeyPoint': return { term: a.term, definition: a.definition };
      case 'QuizQuestion': return {
        id: a.id, type: en(a.type), question: a.question, options: a.options ?? null, correctIndex: a.correctIndex ?? null,
        targetNote: a.targetNote ?? null, targetString: a.targetString ?? null, targetFret: a.targetFret ?? null,
        skillThreads: enArr(a.skillThreads), difficulty: a.difficulty,
      };
      case 'GuitarScale': return {
        id: a.id, name: a.name, category: en(a.category), intervals: a.intervals, degreeNames: a.degreeNames,
        description: a.description, genre: a.genre, mood: a.mood, isCustom: a.isCustom, fretPattern: a.fretPattern ?? null,
      };
      case 'buildFullRoutine': return buildFullRoutine(a);
      default: throw new Error('Unknown call ' + node.$call);
    }
  }
  throw new Error('Cannot convert ' + JSON.stringify(node).slice(0, 200));
}

// Exact port of CurriculumManager.buildFullRoutine (IntermediateWeeks6to10.swift)
function buildFullRoutine(a) {
  const id = a.id, threads = enArr(a.threads);
  const ex = a.exercises.map((t) => t.$tuple);
  const mkEx = (exId, e) => ({
    id: exId, name: e[0], description: e[1], targetBPM: e[2], fretboardDiagram: null, fretboardDiagrams: null,
    tabNotation: null, tips: [], skillThreads: enArr(e[3]),
  });
  const warmup = mkEx(`${id}-wu1`, ex[0]);
  const core = ex.slice(1).map((e, i) => mkEx(`${id}-ex${i + 1}`, e));
  const lessons = a.theoryLessons.map((t, i) => {
    const l = t.$tuple;
    return {
      id: `${id}-t${i + 1}`, title: l[0], content: l[1],
      keyPoints: l[2].map((kp) => ({ term: kp.$tuple[0], definition: kp.$tuple[1] })),
      fretboardDiagram: null, skillThreads: threads,
    };
  });
  const questions = a.questions.map((t, i) => {
    const q = t.$tuple;
    return {
      id: `${id}-q${i + 1}`, type: 'multipleChoice', question: q[0], options: q[1], correctIndex: q[2],
      targetNote: null, targetString: null, targetFret: null, skillThreads: enArr(q[3]), difficulty: q[4],
    };
  });
  return {
    id, courseLevel: en(a.level), weekNumber: a.week, name: a.name, theoryModuleName: a.theory,
    connectionDescription: a.connection, skillThreads: threads,
    sessionBlocks: [
      { id: `${id}-warmup`, type: 'warmUp', estimatedMinutes: 3, exercises: [warmup], theoryLessons: null },
      { id: `${id}-core`, type: 'corePractice', estimatedMinutes: 10, exercises: core, theoryLessons: null },
      { id: `${id}-theory`, type: 'theory', estimatedMinutes: 7, exercises: null, theoryLessons: lessons },
      { id: `${id}-check`, type: 'checkpoint', estimatedMinutes: 3, exercises: null, theoryLessons: null },
    ],
    checkpointQuestions: questions,
  };
}

// ---------- Extract routine builder functions ----------
const routines = {};
const files = fs.readdirSync(path.join(SRC, 'Data')).map((f) => path.join(SRC, 'Data', f)).concat([path.join(SRC, 'Services', 'CurriculumManager.swift')]);
for (const f of files) {
  const toks = tokenize(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < toks.length; i++) {
    // func <name>() -> Routine {  <expr>
    if (toks[i].t === 'id' && toks[i].v === 'func' && toks[i + 1].t === 'id') {
      const fname = toks[i + 1].v;
      if (fname === 'buildFullRoutine' || fname === 'buildRoutineStub') continue;
      if (toks[i + 2].t === '(' && toks[i + 3].t === ')' && toks[i + 4].t === '->' && toks[i + 5].v === 'Routine' && toks[i + 6].t === '{') {
        const first = toks[i + 7];
        if (first.t === 'id' && (first.v === 'Routine' || first.v === 'buildFullRoutine')) {
          const { value } = parseExprAt(toks, i + 7);
          routines[fname] = conv(value);
        }
      }
    }
  }
}

// Course order exactly as CurriculumManager.loadCurriculum()
const order = {
  foundation: ['buildFoundationWeek1', ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => `buildFoundationWeek${w}Full`)],
  intermediate: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => `buildIntermediateWeek${w}Full`),
  advanced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => `buildAdvancedWeek${w}Full`),
};
const courses = Object.entries(order).map(([level, fns]) => ({
  id: level, level,
  routines: fns.map((fn) => { if (!routines[fn]) throw new Error('Missing ' + fn); return routines[fn]; }),
}));

// ---------- Scales ----------
const scaleToks = tokenize(fs.readFileSync(path.join(SRC, 'Models', 'ScaleLibrary.swift'), 'utf8'));
let scales = [];
for (let i = 0; i < scaleToks.length; i++) {
  if (scaleToks[i].v === 'builtInScales' && scaleToks[i - 1].v === 'func') {
    let j = i; while (scaleToks[j].t !== '{') j++;
    const { value } = parseExprAt(scaleToks, j + 1);
    scales = conv(value);
    break;
  }
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'curriculum.json'), JSON.stringify(courses, null, 1));
fs.writeFileSync(path.join(OUT, 'scales.json'), JSON.stringify(scales, null, 1));

// ---------- Stats ----------
let ex = 0, th = 0, q = 0, fb = 0;
for (const c of courses) for (const r of c.routines) {
  q += r.checkpointQuestions.length;
  fb += r.checkpointQuestions.filter((x) => x.type === 'fretboardTap').length;
  for (const b of r.sessionBlocks) { ex += (b.exercises || []).length; th += (b.theoryLessons || []).length; }
}
console.log(JSON.stringify({ courses: courses.map((c) => [c.id, c.routines.length]), exercises: ex, theoryLessons: th, questions: q, fretboardTapQuestions: fb, scales: scales.length }));
