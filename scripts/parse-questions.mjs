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

// Only process 系统架构设计师
const ALLOWED_SUBJECT = '系统架构设计师';

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

// Parse a 综合知识 markdown: blocks split by `### 第N题` or `#### 第N题`.
function parseMultiChoice(content) {
  const result = [];
  // Match headers: "### 第1题", "### 第68-72题", etc.
  const parts = content.split(/^#{2,4}\s*第\s*\d+(?:[-~～]\d+)?\s*题[^\n]*\r?\n/m);
  const headers = [...content.matchAll(/^#{2,4}\s*第\s*(\d+)(?:[-~～](\d+))?\s*题[^\n]*/gm)];
  if (headers.length === 0) return result;

  // parts[0] is preamble, parts[i+1] corresponds to headers[i]
  for (let i = 0; i < headers.length; i++) {
    const startNo = parseInt(headers[i][1], 10);
    const endNo = headers[i][2] ? parseInt(headers[i][2], 10) : startNo;
    const block = parts[i + 1] || '';

    // For merged headers (e.g., "第71-75题"):
    // Check if there are individual sub-headers for the same range anywhere in content
    if (endNo > startNo) {
      // Look for individual header for the start number in the full content
      const hasIndividualHeaders = new RegExp(`^#{3,4}\\s*第\\s*${startNo}\\s*题`, 'm').test(content);
      if (hasIndividualHeaders) {
        // Skip this merged header, individual headers will be processed
        continue;
      }
    }

    const q = extractQuestion(block, startNo);
    if (q) result.push(q);
  }

  // Deduplicate by question number
  const byNumber = new Map();
  for (const q of result) {
    if (!byNumber.has(q.number)) {
      byNumber.set(q.number, q);
    }
  }

  const finalQuestions = [...byNumber.values()].sort((a, b) => a.number - b.number);

  // Convert multi-blank questions to blanks array format
  const processed = [];
  for (const q of finalQuestions) {
    if (q.isMultiBlank && q.blankCount >= 2) {
      // Multi-blank: convert answers array to blanks array
      const blanks = (q.answers || []).map((ans, idx) => ({
        index: idx + 1,
        answer: ans,
      }));
      processed.push({
        number: q.number,
        stem: q.stem,
        options: q.options,
        blanks,
        explanation: q.explanation,
      });
    } else {
      // Single answer
      processed.push({
        number: q.number,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      });
    }
  }

  return processed;
}

function extractQuestion(block, number) {
  // Extract answer
  const ansMatch = block.match(/\*\*答案\*\*\s*[:：]\s*(.+?)(?=\n\n|\n\*\*|$)/s);
  let answerRaw = '';
  let isMultiBlank = false;
  let multiBlankAnswers = [];

  if (ansMatch) {
    const fullAnswer = ansMatch[1].trim();
    if (!/待补充/.test(fullAnswer)) {
      // Check if multi-blank: contains 、 or multiple letters with brackets
      // e.g., "A（Session Bean）、B（Entity Bean）、C（Message-driven Bean）"
      // or "C（信息设施）、B（信息功能）"
      if (/[A-D]\s*[（(].*?[）)]\s*[、,]\s*[A-D]/.test(fullAnswer)) {
        // Multi-blank format with explanations
        const matches = [...fullAnswer.matchAll(/([A-D])\s*[（(]/g)];
        multiBlankAnswers = matches.map(m => m[1]);
        isMultiBlank = multiBlankAnswers.length >= 2;
      } else if (/[A-D]\s*[、,]\s*[A-D]/.test(fullAnswer) && !/第\d+题/.test(fullAnswer)) {
        // Simple multi-blank: "D、A" or "C、B"
        const letters = fullAnswer.match(/[A-D]/g) || [];
        multiBlankAnswers = letters;
        isMultiBlank = letters.length >= 2;
      }

      if (!isMultiBlank) {
        // Single answer
        const match = fullAnswer.match(/[A-D]/);
        answerRaw = match ? match[0] : '';
      }
    }
  }

  // Extract stem
  const answerIdx = block.search(/\*\*答案\*\*\s*[:：]/);
  let stemRaw = answerIdx >= 0 ? block.substring(0, answerIdx) : block;
  stemRaw = stemRaw.replace(/^\s*\*\*题目\*\*\s*[:：]\s*/m, '');
  stemRaw = stemRaw.replace(/^#+\s.*$/gm, '').trim();

  // Remove "**选项**:" marker and all option lines that follow (markdown list format)
  // Keep everything before "**选项**:"
  const optMarkerIdx = stemRaw.search(/\n\n\*\*选项[^:]*\*\*\s*[:：]/);
  if (optMarkerIdx >= 0) {
    stemRaw = stemRaw.substring(0, optMarkerIdx).trim();
  }

  // Extract options
  const optMatches = [];
  const optRe = /^[-*]?\s*([A-D])[\.、]\s*(.+?)$/gm;
  let m;
  while ((m = optRe.exec(block)) !== null) {
    const letter = m[1];
    const text = m[2].trim();
    if (!optMatches.find(o => o.key === letter)) {
      optMatches.push({ key: letter, text });
    }
  }

  // Try inline format if no options found
  if (optMatches.length < 4) {
    const line = block.split(/\n/).find(l => /A[\.、]/.test(l) && /B[\.、]/.test(l));
    if (line) {
      optMatches.length = 0;
      const lineRe = /([A-D])[\.、]\s*([^A-D]+?)(?=\s+[A-D][\.、]|$)/g;
      let mm;
      while ((mm = lineRe.exec(line)) !== null) {
        optMatches.push({ key: mm[1], text: mm[2].trim() });
      }
    }
  }

  optMatches.sort((a, b) => a.key.localeCompare(b.key));

  // Extract explanation
  const explMatch = block.match(/\*\*解析\*\*\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:\*\*[^*]|---|###|$))/);
  const explanation = explMatch ? explMatch[1].trim() : '';

  // For multi-blank: verify blanks in stem
  if (isMultiBlank) {
    // Count blanks: （ ）or （数字）
    const blanks = (stemRaw.match(/[（(]\s*\d*\s*[）)]/g) || []).length;
    if (blanks === multiBlankAnswers.length) {
      return {
        number,
        stem: stemRaw.trim(),
        options: optMatches,
        answer: '', // Will be split later
        answers: multiBlankAnswers,
        explanation,
        isMultiBlank: true,
        blankCount: blanks,
      };
    }
  }

  return {
    number,
    stem: stemRaw.trim(),
    options: optMatches,
    answer: answerRaw,
    explanation,
  };
}

// Parse case analysis markdown
function parseCaseAnalysis(content) {
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

// Parse paper/essay markdown
function parsePaper(content) {
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

  // Group files: kind|subject|year|volume => { 综合知识, 案例分析, 论文 }
  const groups = new Map();

  function classify(p, kind) {
    const rel = path.relative(SOURCE_ROOT, p);
    const parts = rel.split(path.sep);
    const fname = parts[parts.length - 1];

    // 真题: kind=真题, subject=parts[1], year=parts[2], file=parts[3]
    // 模拟题: kind=模拟题, subject=parts[1], year=parts[2], volume=parts[3], file=parts[4]
    const subject = parts[1];
    const year = parts[2];
    const volume = kind === '模拟题' ? parts[3] : null;

    // Only process 系统架构设计师
    if (subject !== ALLOWED_SUBJECT) return null;

    const name = fname.replace(/_(题目|答案)\.md$/, '').replace('.md', '');
    // Skip README
    if (/^readme$/i.test(name)) return null;
    // Skip answer files, only process question files for mock exams
    if (kind === '模拟题' && fname.includes('答案')) return null;

    // Determine paper type
    let paperType = null;
    if (/^综合知识/.test(name)) paperType = 'multi_choice';
    else if (/^案例分析/.test(name)) paperType = 'case';
    else if (/^论文/.test(name)) paperType = 'paper';
    if (!paperType) return null;

    return { kind, subject, year, volume, paperType, file: p };
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
    const key = [c.kind, c.subject, c.year, c.volume].filter(Boolean).join('|');
    if (!groups.has(key)) {
      groups.set(key, {
        id: buildExamId(c.kind, c.subject, c.year, c.volume),
        kind: c.kind,
        subject: c.subject,
        year: c.year,
        volume: c.volume,
        multi_choice: null,
        case: null,
        paper: null,
      });
    }
    const g = groups.get(key);
    g[c.paperType] = { file: c.file };
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
      const content = fs.readFileSync(g.multi_choice.file, 'utf8');
      const questions = parseMultiChoice(content);
      if (questions.length >= 20) {
        exam.papers.multi_choice = {
          duration: 150,
          total: questions.length,
          questions,
        };
        multiCount++;
        console.log(`✅ ${g.year} 综合知识: ${questions.length} questions`);
      }
    }

    // Case analysis
    if (g.case) {
      const content = fs.readFileSync(g.case.file, 'utf8');
      const cases = parseCaseAnalysis(content);
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
      const content = fs.readFileSync(g.paper.file, 'utf8');
      const topics = parsePaper(content);
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

  // Sort by year desc
  exams.sort((a, b) => b.year.localeCompare(a.year));

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
  console.log(`\n✅ Wrote ${exams.length} exams to ${OUT_FILE}`);
  console.log(`  multi_choice papers: ${multiCount}`);
  console.log(`  case papers:         ${caseCount}`);
  console.log(`  paper(essay) papers: ${paperCount}`);
}

main();
