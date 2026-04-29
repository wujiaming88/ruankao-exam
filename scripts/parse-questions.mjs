// Parse Markdown question banks under awesome-ruankao into structured JSON.
// Usage: node scripts/parse-questions.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ROOT = process.env.AWESOME_RUANKAO_PATH
  ? path.resolve(process.env.AWESOME_RUANKAO_PATH)
  : path.resolve(__dirname, '../../awesome-ruankao');
const OUT_FILE = path.resolve(__dirname, '../src/data/exams.json');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

// Split a merged question block into multiple individual questions
function splitMergedQuestion(block, startNo, endNo) {
  const count = endNo - startNo + 1;
  const result = [];

  // Extract the base question info (shared stem, options, explanation)
  const baseQ = extractQuestion(block, startNo);
  if (!baseQ) return result;

  // Try to split the answer into multiple parts
  // Format: "D、B" or "D,B" or "A、B、C、D、E"
  const answerText = baseQ.answer || '';
  const answerParts = answerText.split(/[、,，\s]+/).filter(a => /^[A-D]$/.test(a));

  // If we have exactly the right number of answers, distribute them
  if (answerParts.length === count) {
    for (let i = 0; i < count; i++) {
      const no = startNo + i;
      result.push({
        number: no,
        stem: `${baseQ.stem}（第${no}题）`,
        options: baseQ.options,
        answer: answerParts[i],
        explanation: baseQ.explanation,
      });
    }
  } else {
    // If answer count doesn't match, create separate questions with the full answer string
    for (let i = 0; i < count; i++) {
      const no = startNo + i;
      result.push({
        number: no,
        stem: `${baseQ.stem}（第${no}题，共${count}题）`,
        options: baseQ.options,
        answer: answerText, // Keep the full answer string
        explanation: baseQ.explanation,
      });
    }
  }

  return result;
}

// Parse a 综合知识 markdown: blocks split by `### 第N题` or `#### 第N题`.
function parseMultiChoice(content) {
  const result = [];
  // Match headers with optional range: "### 第1题", "### 第19-20题", "### 第71～75题"
  const parts = content.split(/^#{2,4}\s*第\s*\d+(?:[-~～]\d+)?\s*题[^\n]*\r?\n/m);
  const headers = [...content.matchAll(/^#{2,4}\s*第\s*(\d+)(?:[-~～](\d+))?\s*题[^\n]*/gm)];
  if (headers.length === 0) return result;

  // parts[0] is preamble, parts[i+1] corresponds to headers[i]
  for (let i = 0; i < headers.length; i++) {
    const startNo = parseInt(headers[i][1], 10);
    const endNo = headers[i][2] ? parseInt(headers[i][2], 10) : startNo;
    const block = parts[i + 1] || '';

    // Check if this is a merged header followed by individual headers
    // If the block contains individual headers for the same range, skip this merged header
    if (endNo > startNo) {
      const hasIndividualHeaders = new RegExp(`^#{2,4}\\s*第\\s*(${startNo})\\s*题`, 'm').test(block);
      if (hasIndividualHeaders) {
        // Skip this merged header, the individual headers will be processed separately
        continue;
      }
      // Otherwise, split the merged question
      const questions = splitMergedQuestion(block, startNo, endNo);
      result.push(...questions);
    } else {
      const q = extractQuestion(block, startNo);
      if (q) result.push(q);
    }
  }
  // Deduplicate by question number: prefer standalone questions (with real options) over merged splits
  const byNumber = new Map();
  for (const q of result) {
    const existing = byNumber.get(q.number);
    if (!existing) {
      byNumber.set(q.number, q);
    } else {
      // Prefer the one with more distinct option texts (standalone > merged split)
      const existingOptCount = existing.options?.length || 0;
      const newOptCount = q.options?.length || 0;
      // If new question stem does NOT contain "（第" marker it's a standalone question - prefer it
      const newIsStandalone = !q.stem?.includes('（第') && !q.stem?.includes('（共');
      const existingIsStandalone = !existing.stem?.includes('（第') && !existing.stem?.includes('（共');
      if (newIsStandalone && !existingIsStandalone) {
        byNumber.set(q.number, q);
      }
    }
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

function extractQuestion(block, number) {
  // Extract answer: match **答案**: X or **答案**：X
  // Support multiple answers separated by 、 or comma: "D、B" or "A,B,C"
  const ansMatch = block.match(/\*\*答案\*\*\s*[:：]\s*([A-D][、,，\s]*[A-D]*[、,，\s]*[A-D]*[、,，\s]*[A-D]*[、,，\s]*[A-D]*)/);
  // Extract stem: before the first option line. Stem can be in **题目**: XXX or just text.
  // Options: lines like "- A. ..." or "A、..." or "A. ..."
  const optMatches = [];
  const optRe = /^[-*]?\s*([A-D])[\.、]\s*(.+?)$/gm;
  let m;
  while ((m = optRe.exec(block)) !== null) {
    // Only accept the first 4 matches A-D
    const letter = m[1];
    const text = m[2].trim();
    // Skip option headers like "A、B、C、D" in the explanation text (contains 答案/解析 etc.)
    if (optMatches.find(o => o.key === letter)) continue;
    optMatches.push({ key: letter, text });
  }
  if (optMatches.length < 4) {
    // Try the format where options are on one line: A、xxx  B、xxx  C、xxx  D、xxx
    const flatRe = /([A-D])[\.、]\s*([^\n]+?)(?=\s+[A-D][\.、]|$)/g;
    const line = block.split(/\n/).find(l => /A[\.、]/.test(l) && /B[\.、]/.test(l));
    if (line) {
      optMatches.length = 0;
      let mm;
      const lineRe = /([A-D])[\.、]\s*([^A-D]+?)(?=\s+[A-D][\.、]|$)/g;
      while ((mm = lineRe.exec(line)) !== null) {
        optMatches.push({ key: mm[1], text: mm[2].trim() });
      }
    }
  }

  // Handle simplified format (no options, only stem + answer + explanation)
  // Used in 2024上半年, 2022下半年, 2020下半年 etc.
  if (optMatches.length < 4) {
    // Extract stem before **答案**
    const answerIdx = block.search(/\*\*答案\*\*\s*[:：]/);
    let stemRaw = answerIdx >= 0 ? block.substring(0, answerIdx) : block;
    // Remove **题目**: prefix
    stemRaw = stemRaw.replace(/^\s*\*\*题目\*\*\s*[:：]\s*/m, '');
    // Remove headers
    stemRaw = stemRaw.replace(/^#+\s.*$/gm, '').trim();
    const stem = stemRaw.trim();

    // Explanation
    const explMatch = block.match(/\*\*解析\*\*\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:\*\*[^*]|---|###|$))/);
    const explanation = explMatch ? explMatch[1].trim() : '';

    // Return simplified question without options
    return {
      number,
      stem,
      options: [], // Empty options for simplified format
      answer: ansMatch ? ansMatch[1] : '',
      explanation,
    };
  }

  optMatches.sort((a, b) => a.key.localeCompare(b.key));

  // Stem: everything before the first option
  const firstOptIdx = block.search(/^[-*]?\s*A[\.、]/m);
  let stemRaw = firstOptIdx >= 0 ? block.substring(0, firstOptIdx) : block;
  // Remove **题目**: prefix
  stemRaw = stemRaw.replace(/^\s*\*\*题目\*\*\s*[:：]\s*/m, '');
  // Remove lingering "题目描述" headers etc.
  stemRaw = stemRaw.replace(/^#+\s.*$/gm, '').trim();
  // Clean trailing bullets
  const stem = stemRaw.replace(/\s+$/g, '').trim();

  // Explanation
  const explMatch = block.match(/\*\*解析\*\*\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:\*\*[^*]|---|###|$))/);
  const explanation = explMatch ? explMatch[1].trim() : '';

  return {
    number,
    stem,
    options: optMatches,
    answer: ansMatch ? ansMatch[1] : '',
    explanation,
  };
}

// Parse an answer-only markdown file that may not contain options.
// Used for 模拟题 答案 files which only have answer + explanation per question.
function parseAnswersOnly(content) {
  const result = [];
  const headers = [...content.matchAll(/^#{2,4}\s*第\s*(\d+)(?:-(\d+))?\s*题/gm)];
  if (headers.length === 0) return result;
  const parts = content.split(/^#{2,4}\s*第\s*\d+(?:-\d+)?\s*题\s*\r?\n/m);
  for (let i = 0; i < headers.length; i++) {
    const no = parseInt(headers[i][1], 10);
    const block = parts[i + 1] || '';
    const ansMatch = block.match(/\*\*答案\*\*\s*[:：]\s*([A-D])/);
    const explMatch = block.match(/\*\*解析\*\*\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:\*\*[^*]|---|###|$))/);
    result.push({
      number: no,
      answer: ansMatch ? ansMatch[1] : '',
      explanation: explMatch ? explMatch[1].trim() : '',
    });
  }
  return result;
}

// Merge question list from 题目 file and 答案 file (used by 模拟题)
function mergeMockQuestions(stems, answers) {
  const ansByNo = new Map();
  for (const a of answers) ansByNo.set(a.number, a);
  return stems.map(s => {
    const a = ansByNo.get(s.number);
    return {
      ...s,
      answer: s.answer || (a?.answer || ''),
      explanation: s.explanation || (a?.explanation || ''),
    };
  });
}

// Parse case analysis markdown: split by `## 试题X` or `### N.M. 试题X`
function parseCaseAnalysis(content) {
  // Match both formats:
  // 1. ## 试题一：XXX (standard format)
  // 2. ### 2.1. 试题一：XXX (2024年下半年 format)
  const sectionRe = /^#{2,3}\s+(?:\d+\.\d+\.\s+)?试题([一二三四五六七八九十])[^\n]*$/gm;
  const matches = [...content.matchAll(sectionRe)];
  if (matches.length === 0) return [];
  const result = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.substring(start, end).trim();
    const titleMatch = body.match(/^#{2,3}\s+(?:\d+\.\d+\.\s+)?(试题[^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `试题${i + 1}`;
    const required = /必[答做]/.test(title);
    result.push({
      index: i + 1,
      title,
      required,
      content: body,
    });
  }
  return result;
}

// Parse paper/essay markdown: split by `## 试题X` or `## 论文X` or `### N.M. 试题X`
function parsePaper(content) {
  // Match both formats:
  // 1. ## 试题一：XXX (standard format)
  // 2. ### 3.2. 试题二：XXX (2024年下半年 format)
  const sectionRe = /^#{2,3}\s+(?:\d+\.\d+\.\s+)?(?:试题|论文)([一二三四五六七八九十])[^\n]*$/gm;
  const matches = [...content.matchAll(sectionRe)];
  if (matches.length === 0) return [];
  const result = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.substring(start, end).trim();
    const titleMatch = body.match(/^#{2,3}\s+(?:\d+\.\d+\.\s+)?([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `论文${i + 1}`;
    result.push({
      index: i + 1,
      title,
      content: body,
    });
  }
  return result;
}

function slug(s) {
  return s.replace(/[^\w一-龥]+/g, '_');
}

function buildExamId(kind, subject, year, volume) {
  return [kind, subject, year, volume].filter(Boolean).map(slug).join('__');
}

function main() {
  const realFiles = walk(path.join(SOURCE_ROOT, '真题'));
  const mockFiles = walk(path.join(SOURCE_ROOT, '模拟题'));

  // Group files: kind|subject|year(|volume) => { 综合知识, 案例分析, 论文 }
  const groups = new Map();

  function classify(p, kind) {
    const rel = path.relative(SOURCE_ROOT, p);
    const parts = rel.split(path.sep);
    // 真题: kind=真题, subject=parts[1], year=parts[2], file=parts[3]
    // 模拟题: parts = [模拟题, subject, year-month, 模拟卷X, file]
    let subject, year, volume, fname;
    if (kind === '真题') {
      subject = parts[1];
      year = parts[2];
      fname = parts[parts.length - 1];
    } else {
      subject = parts[1];
      year = parts[2];
      volume = parts[3];
      fname = parts[parts.length - 1];
    }
    const name = fname.replace('.md', '');
    // Skip README and other non-exam files
    if (/^readme$/i.test(name)) return null;
    if (/cnitpm样例|rkpass完整版/.test(name)) return null; // secondary files
    if (/cnitpm42题版/.test(name)) return null;
    // Determine paper type
    let paperType = null, variant = null;
    if (/^综合知识$/.test(name)) paperType = 'multi_choice';
    else if (/^综合知识_题目$/.test(name)) { paperType = 'multi_choice'; variant = 'stem'; }
    else if (/^综合知识_答案$/.test(name)) { paperType = 'multi_choice'; variant = 'answer'; }
    else if (/^案例分析$/.test(name)) paperType = 'case';
    else if (/^案例分析_题目$/.test(name)) { paperType = 'case'; variant = 'stem'; }
    else if (/^案例分析_答案$/.test(name)) { paperType = 'case'; variant = 'answer'; }
    else if (/^论文$/.test(name)) paperType = 'paper';
    else if (/^论文_题目$/.test(name)) { paperType = 'paper'; variant = 'stem'; }
    else if (/^论文_答案$/.test(name)) { paperType = 'paper'; variant = 'answer'; }
    if (!paperType) return null;
    return { kind, subject, year, volume, paperType, variant, file: p };
  }

  const allClassified = [];
  for (const f of realFiles) {
    const c = classify(f, '真题');
    if (c) allClassified.push(c);
  }
  for (const f of mockFiles) {
    const c = classify(f, '模拟题');
    if (c) allClassified.push(c);
  }

  for (const c of allClassified) {
    const key = [c.kind, c.subject, c.year, c.volume || ''].join('|');
    if (!groups.has(key)) {
      groups.set(key, {
        id: buildExamId(c.kind, c.subject, c.year, c.volume),
        kind: c.kind,
        subject: c.subject,
        year: c.year,
        volume: c.volume || null,
        multi_choice: null,
        case: null,
        paper: null,
      });
    }
    const g = groups.get(key);
    // We stash raw file paths, then parse in second pass
    const slot = g[c.paperType] || { files: [] };
    slot.files.push({ file: c.file, variant: c.variant || null });
    g[c.paperType] = slot;
  }

  // Parse each group's papers
  const exams = [];
  let multiCount = 0, caseCount = 0, paperCount = 0;

  for (const g of groups.values()) {
    const exam = {
      id: g.id,
      kind: g.kind,
      subject: g.subject,
      year: g.year,
      volume: g.volume,
      title: [g.year, g.subject, g.volume].filter(Boolean).join(' '),
      papers: {},
    };

    // Multi choice
    if (g.multi_choice) {
      const files = g.multi_choice.files;
      const single = files.find(f => !f.variant);
      const stemFile = files.find(f => f.variant === 'stem');
      const ansFile = files.find(f => f.variant === 'answer');
      let questions = [];
      if (single) {
        questions = parseMultiChoice(fs.readFileSync(single.file, 'utf8'));
      } else if (stemFile && ansFile) {
        const stems = parseMultiChoice(fs.readFileSync(stemFile.file, 'utf8'));
        const ans = parseAnswersOnly(fs.readFileSync(ansFile.file, 'utf8'));
        questions = mergeMockQuestions(stems, ans);
      } else if (stemFile) {
        questions = parseMultiChoice(fs.readFileSync(stemFile.file, 'utf8'));
      }
      if (questions.length >= 20) {
        exam.papers.multi_choice = {
          duration: 150,
          total: questions.length,
          questions,
        };
        multiCount++;
      }
    }

    // Case analysis
    if (g.case) {
      const files = g.case.files;
      const single = files.find(f => !f.variant);
      const stemFile = files.find(f => f.variant === 'stem');
      const ansFile = files.find(f => f.variant === 'answer');
      let cases = [];
      if (single) {
        cases = parseCaseAnalysis(fs.readFileSync(single.file, 'utf8'));
      } else if (stemFile) {
        cases = parseCaseAnalysis(fs.readFileSync(stemFile.file, 'utf8'));
        if (ansFile) {
          const answers = parseCaseAnalysis(fs.readFileSync(ansFile.file, 'utf8'));
          for (let i = 0; i < cases.length; i++) {
            const a = answers[i];
            if (a) cases[i].answer = a.content;
          }
        }
      }
      if (cases.length >= 3) {
        exam.papers.case = {
          duration: 90,
          required: 1,
          choose: 2,
          total_choose: 3,
          cases,
        };
        caseCount++;
      }
    }

    // Paper
    if (g.paper) {
      const files = g.paper.files;
      const single = files.find(f => !f.variant);
      const stemFile = files.find(f => f.variant === 'stem');
      const ansFile = files.find(f => f.variant === 'answer');
      let topics = [];
      if (single) {
        topics = parsePaper(fs.readFileSync(single.file, 'utf8'));
      } else if (stemFile) {
        topics = parsePaper(fs.readFileSync(stemFile.file, 'utf8'));
        if (ansFile) {
          const answers = parsePaper(fs.readFileSync(ansFile.file, 'utf8'));
          for (let i = 0; i < topics.length; i++) {
            const a = answers[i];
            if (a) topics[i].answer = a.content;
          }
        }
      }
      if (topics.length >= 2) {
        exam.papers.paper = {
          duration: 120,
          choose: 1,
          topics,
        };
        paperCount++;
      }
    }

    if (Object.keys(exam.papers).length > 0) exams.push(exam);
  }

  // Sort: kind(真题 first) then subject then year desc
  exams.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === '真题' ? -1 : 1;
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    return (a.volume || '').localeCompare(b.volume || '');
  });

  const output = {
    generated_at: new Date().toISOString(),
    stats: {
      exams: exams.length,
      multi_choice: multiCount,
      case: caseCount,
      paper: paperCount,
    },
    exams,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${exams.length} exams to ${OUT_FILE}`);
  console.log(`  multi_choice papers: ${multiCount}`);
  console.log(`  case papers:         ${caseCount}`);
  console.log(`  paper(essay) papers: ${paperCount}`);
}

main();
