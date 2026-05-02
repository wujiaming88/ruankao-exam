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
// answerContent is optional - for mock exams with separate answer files
function parseMultiChoice(questionContent, answerContent = null) {
  // First, extract answers from answer file if provided
  const answerMap = new Map();
  if (answerContent) {
    const answerHeaders = [...answerContent.matchAll(/^#{2,4}\s*第\s*(\d+)\s*题[^\n]*/gm)];
    const answerParts = answerContent.split(/^#{2,4}\s*第\s*\d+\s*题[^\n]*\r?\n/m);

    for (let i = 0; i < answerHeaders.length; i++) {
      const qNum = parseInt(answerHeaders[i][1], 10);
      const block = answerParts[i + 1] || '';

      // Extract answer
      const ansMatch = block.match(/\*\*答案\*\*\s*[:：]\s*([A-D])/);
      if (ansMatch) {
        answerMap.set(qNum, ansMatch[1]);
      }
    }
  }

  const result = [];
  // Match headers: "### 第1题", "### 第68-72题", etc.
  const parts = questionContent.split(/^#{2,4}\s*第\s*\d+(?:[-~～]\d+)?\s*题[^\n]*\r?\n/m);
  const headers = [...questionContent.matchAll(/^#{2,4}\s*第\s*(\d+)(?:[-~～](\d+))?\s*题[^\n]*/gm)];
  if (headers.length === 0) return result;

  // parts[0] is preamble, parts[i+1] corresponds to headers[i]
  for (let i = 0; i < headers.length; i++) {
    const startNo = parseInt(headers[i][1], 10);
    const endNo = headers[i][2] ? parseInt(headers[i][2], 10) : startNo;
    const block = parts[i + 1] || '';

    // For merged headers (e.g., "第71-75题" or "第14～15题"):
    if (endNo > startNo) {
      // Check if there are individual sub-headers for the same range anywhere in content
      const hasIndividualHeaders = new RegExp(`^#{3,4}\\s*第\\s*${startNo}\\s*题`, 'm').test(questionContent);
      if (hasIndividualHeaders) {
        // Skip this merged header, individual headers will be processed
        continue;
      }

      // No individual headers - need to split the merged question
      // Try to extract separate per-question options and answers
      const questions = extractMergedQuestions(block, startNo, endNo, answerMap);
      if (questions.length > 0) {
        result.push(...questions);
        continue;
      }
    }

    const q = extractQuestion(block, startNo, answerMap);
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

  // Split multi-blank questions into separate single-choice questions
  const processed = [];
  for (const q of finalQuestions) {
    if (q.isMultiBlank && q.blankCount >= 2 && q.answers && q.answers.length >= 2) {
      // Split into separate questions, one for each blank
      for (let i = 0; i < q.answers.length; i++) {
        const blankIndex = i + 1;
        const questionNumber = q.number + i * 0.1;

        // Clean stem: remove option markers and add blank indicator
        let cleanStem = q.stem;
        // Add blank number indicator to stem
        cleanStem = cleanStem.trim();
        if (cleanStem.endsWith('）') || cleanStem.endsWith(')')) {
          // Already has some parenthesis, insert before it
          cleanStem = `${cleanStem}（本题为第${blankIndex}空）`;
        } else {
          cleanStem = `${cleanStem}（本题为第${blankIndex}空）`;
        }

        processed.push({
          number: questionNumber,
          stem: cleanStem,
          options: q.options, // Share same options
          answer: q.answers[i],
          explanation: q.explanation,
        });
      }
    } else {
      // Single answer question
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

// Extract merged questions from a block with format like "第14～15题"
// where each sub-question has its own options section
function extractMergedQuestions(block, startNo, endNo, answerMap = null) {
  const questions = [];

  // Extract main stem
  const answerIdx = block.search(/\*\*答案\*\*\s*[:：]/);
  let mainStem = answerIdx >= 0 ? block.substring(0, answerIdx) : block;
  mainStem = mainStem.replace(/^\s*\*\*题目\*\*\s*[:：]\s*/m, '');
  mainStem = mainStem.replace(/^#+\s.*$/gm, '').trim();

  // Remove per-question option sections from main stem
  mainStem = mainStem.replace(/\n\n\*\*[（(]第\d+题[）)]选项\*\*[:：][\s\S]*$/m, '').trim();

  // Extract answers for each question
  const answerBlock = block.substring(answerIdx >= 0 ? answerIdx : block.length);
  const answersByNumber = new Map();

  // Try to parse "第N题 X，第M题 Y" format
  const answerMatches = [...answerBlock.matchAll(/第\s*(\d+)\s*题\s*[^A-D]*([A-D])/g)];
  for (const m of answerMatches) {
    const qNum = parseInt(m[1], 10);
    const ans = m[2];
    answersByNumber.set(qNum, ans);
  }

  // Extract options for each sub-question
  for (let qNum = startNo; qNum <= endNo; qNum++) {
    // Find options section for this question: **（第N题）选项**: or **(第N题)选项**:
    // Use simpler approach: split by lines and look for the marker
    const lines = block.split(/\r?\n/);
    let inOptionsSection = false;
    let currentQuestion = -1;
    const optMatches = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // Check if this is an options header for current question
      const optHeaderMatch = line.match(/\*\*[（(]第(\d+)题[）)]选项\*\*\s*[:：]/);
      if (optHeaderMatch) {
        currentQuestion = parseInt(optHeaderMatch[1], 10);
        inOptionsSection = currentQuestion === qNum;
        continue;
      }

      // Check if we hit next section (answer or next question's options)
      if (/\*\*答案\*\*/.test(line) || (/\*\*[（(]第\d+题[）)]选项\*\*/.test(line) && currentQuestion !== qNum)) {
        inOptionsSection = false;
      }

      // Extract option if in correct section
      if (inOptionsSection) {
        const optMatch = line.match(/^[-*]?\s*([A-D])[\.、]\s*(.+?)$/);
        if (optMatch) {
          const letter = optMatch[1];
          const text = optMatch[2].trim();
          if (!optMatches.find(o => o.key === letter)) {
            optMatches.push({ key: letter, text });
          }
        }
      }
    }

    if (optMatches.length < 2) {
      continue;
    }

    // Get answer
    let answer = answersByNumber.get(qNum) || (answerMap ? answerMap.get(qNum) : null) || '';

    // Build stem with blank indicator
    const stemWithBlank = mainStem.replace(new RegExp(`[（(]\\s*${qNum}\\s*[）)]`, 'g'), '（ ）');

    questions.push({
      number: qNum,
      stem: stemWithBlank.trim(),
      options: optMatches,
      answer,
      explanation: '', // Explanation is typically shared for merged questions
    });
  }

  return questions;
}

function extractQuestion(block, number, answerMap = null) {
  // Extract answer - first try from answerMap (for mock exams), then from block
  let answerRaw = '';
  let isMultiBlank = false;
  let multiBlankAnswers = [];

  // Try answerMap first (for mock exams with separate answer files)
  if (answerMap && answerMap.has(number)) {
    answerRaw = answerMap.get(number);
  } else {
    // Try to extract from block (for real exams)
    const ansMatch = block.match(/\*\*答案\*\*\s*[:：]\s*(.+?)(?=\n\n|\n\*\*|$)/s);
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

  // Remove any remaining option text from stem (markdown list format)
  // Match lines like "- A. xxx" or "A. xxx" after the main stem
  stemRaw = stemRaw.replace(/\n\n[-*]?\s*[A-D][\.、]\s*.+$/s, '').trim();

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

  // Check if we missed multi-blank case: multiple answers but marked as single
  if (!isMultiBlank && !answerRaw && multiBlankAnswers.length >= 2) {
    const blanks = (stemRaw.match(/[（(]\s*\d*\s*[）)]/g) || []).length;
    if (blanks === multiBlankAnswers.length) {
      return {
        number,
        stem: stemRaw.trim(),
        options: optMatches,
        answer: '',
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

    // For mock exams: track both question and answer files
    const isQuestionFile = fname.includes('题目');
    const isAnswerFile = fname.includes('答案');

    // Determine paper type
    let paperType = null;
    if (/^综合知识/.test(name)) paperType = 'multi_choice';
    else if (/^案例分析/.test(name)) paperType = 'case';
    else if (/^论文/.test(name)) paperType = 'paper';
    if (!paperType) return null;

    return { kind, subject, year, volume, paperType, file: p, isQuestionFile, isAnswerFile };
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

    // For mock exams: track both question and answer files
    if (c.kind === '模拟题') {
      if (!g[c.paperType]) {
        g[c.paperType] = { questionFile: null, answerFile: null };
      }
      if (c.isQuestionFile) {
        g[c.paperType].questionFile = c.file;
      } else if (c.isAnswerFile) {
        g[c.paperType].answerFile = c.file;
      }
    } else {
      // For real exams: single file contains both questions and answers
      g[c.paperType] = { file: c.file };
    }
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
      let questions = [];
      if (g.kind === '模拟题') {
        // Mock exams: merge question and answer files
        if (g.multi_choice.questionFile && g.multi_choice.answerFile) {
          const questionContent = fs.readFileSync(g.multi_choice.questionFile, 'utf8');
          const answerContent = fs.readFileSync(g.multi_choice.answerFile, 'utf8');
          questions = parseMultiChoice(questionContent, answerContent);
        } else if (g.multi_choice.questionFile) {
          // Only question file exists
          const content = fs.readFileSync(g.multi_choice.questionFile, 'utf8');
          questions = parseMultiChoice(content);
        }
      } else {
        // Real exams: single file with both questions and answers
        const content = fs.readFileSync(g.multi_choice.file, 'utf8');
        questions = parseMultiChoice(content);
      }

      if (questions.length >= 20) {
        exam.papers.multi_choice = {
          duration: 150,
          total: questions.length,
          questions,
        };
        multiCount++;
        console.log(`✅ ${g.year} ${g.volume || ''} 综合知识: ${questions.length} questions`);
      }
    }

    // Case analysis
    if (g.case) {
      const caseFile = g.kind === '模拟题' ? g.case.questionFile : g.case.file;
      if (caseFile) {
        const content = fs.readFileSync(caseFile, 'utf8');
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
    }

    // Paper
    if (g.paper) {
      const paperFile = g.kind === '模拟题' ? g.paper.questionFile : g.paper.file;
      if (paperFile) {
        const content = fs.readFileSync(paperFile, 'utf8');
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
