// Scan all source data for multi-blank questions and analyze root causes.
// Usage: node scripts/scan-multiblank.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ROOT = process.env.AWESOME_RUANKAO_PATH
  ? path.resolve(process.env.AWESOME_RUANKAO_PATH)
  : path.resolve(__dirname, '../../awesome-ruankao');

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

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(SOURCE_ROOT, filePath);
  const issues = [];

  // Extract all question headers and blocks
  const parts = content.split(/^#{2,4}\s*第\s*\d+(?:[-~～]\d+)?\s*题[^\n]*\r?\n/m);
  const headers = [...content.matchAll(/^#{2,4}\s*第\s*(\d+)(?:[-~～](\d+))?\s*题[^\n]*/gm)];

  if (headers.length === 0) return issues;

  for (let i = 0; i < headers.length; i++) {
    const startNo = parseInt(headers[i][1], 10);
    const endNo = headers[i][2] ? parseInt(headers[i][2], 10) : startNo;
    const block = parts[i + 1] || '';
    const headerText = headers[i][0];

    // Skip if this is a merged header but individual headers exist
    if (endNo > startNo) {
      const hasIndividualHeaders = new RegExp(`^#{3,4}\\s*第\\s*${startNo}\\s*题`, 'm').test(content);
      if (hasIndividualHeaders) {
        continue; // Will be processed as individual questions
      }
    }

    // Extract answer
    const ansMatch = block.match(/\*\*答案\*\*\s*[:：]\s*(.+?)(?=\n\n|\n\*\*|$)/s);
    if (!ansMatch) continue;

    const fullAnswer = ansMatch[1].trim();
    if (/待补充/.test(fullAnswer)) continue;

    // Extract stem
    const answerIdx = block.search(/\*\*答案\*\*\s*[:：]/);
    let stemRaw = answerIdx >= 0 ? block.substring(0, answerIdx) : block;
    stemRaw = stemRaw.replace(/^\s*\*\*题目\*\*\s*[:：]\s*/m, '');
    stemRaw = stemRaw.replace(/^#+\s.*$/gm, '').trim();
    const optMarkerIdx = stemRaw.search(/\n\n\*\*选项[^:]*\*\*\s*[:：]/);
    if (optMarkerIdx >= 0) {
      stemRaw = stemRaw.substring(0, optMarkerIdx).trim();
    }

    // Count blanks in stem
    const blanks = (stemRaw.match(/[（(]\s*\d*\s*[）)]/g) || []).length;

    // Analyze answer format
    let rootCause = null;
    let answerCount = 0;
    let answerLetters = [];

    // Check for merged question range in header
    if (endNo > startNo) {
      rootCause = 'MERGED_HEADER';
      answerLetters = fullAnswer.match(/[A-D]/g) || [];
      answerCount = answerLetters.length;
    }
    // Check multi-blank answer with explanations: "A（...）、B（...）"
    else if (/[A-D]\s*[（(].*?[）)]\s*[、,]\s*[A-D]/.test(fullAnswer)) {
      const matches = [...fullAnswer.matchAll(/([A-D])\s*[（(]/g)];
      answerLetters = matches.map(m => m[1]);
      answerCount = answerLetters.length;
      rootCause = 'MULTI_ANSWER_WITH_EXPLANATION';
    }
    // Check simple multi-answer: "D、A" or "C、B"
    else if (/[A-D]\s*[、,]\s*[A-D]/.test(fullAnswer) && !/第\d+题/.test(fullAnswer)) {
      answerLetters = fullAnswer.match(/[A-D]/g) || [];
      answerCount = answerLetters.length;
      rootCause = 'MULTI_ANSWER_SIMPLE';
    }

    // Only report if there are multiple answers
    if (answerCount >= 2) {
      issues.push({
        file: relativePath,
        header: headerText.trim(),
        questionNumber: startNo,
        questionRange: endNo > startNo ? `${startNo}-${endNo}` : startNo.toString(),
        blanksInStem: blanks,
        answerCount,
        answers: answerLetters.join('、'),
        rootCause,
        rawAnswer: fullAnswer,
        stemPreview: stemRaw.substring(0, 100) + (stemRaw.length > 100 ? '...' : ''),
      });
    }
  }

  return issues;
}

function main() {
  console.log('🔍 Scanning for multi-blank questions in 系统架构设计师...\n');
  console.log(`Source root: ${SOURCE_ROOT}\n`);

  const realFiles = walk(path.join(SOURCE_ROOT, '真题', ALLOWED_SUBJECT));
  const mockFiles = walk(path.join(SOURCE_ROOT, '模拟题', ALLOWED_SUBJECT));
  const allFiles = [...realFiles, ...mockFiles];

  // Only scan 综合知识 files
  const multiChoiceFiles = allFiles.filter(f => /综合知识/.test(path.basename(f)));

  console.log(`Found ${multiChoiceFiles.length} 综合知识 files to scan\n`);
  console.log('─'.repeat(100));

  const allIssues = [];

  for (const file of multiChoiceFiles) {
    const issues = scanFile(file);
    if (issues.length > 0) {
      allIssues.push(...issues);
    }
  }

  // Generate report
  console.log(`\n📊 SCAN RESULTS: Found ${allIssues.length} multi-blank questions\n`);
  console.log('═'.repeat(100));

  // Group by file
  const byFile = new Map();
  for (const issue of allIssues) {
    if (!byFile.has(issue.file)) {
      byFile.set(issue.file, []);
    }
    byFile.get(issue.file).push(issue);
  }

  // Print detailed report
  for (const [file, issues] of byFile.entries()) {
    console.log(`\n📄 ${file}`);
    console.log('─'.repeat(100));

    for (const issue of issues) {
      console.log(`\n  题号: ${issue.header}`);
      console.log(`  问题范围: ${issue.questionRange}`);
      console.log(`  题干中空格数: ${issue.blanksInStem}`);
      console.log(`  答案数量: ${issue.answerCount}`);
      console.log(`  答案: ${issue.answers}`);
      console.log(`  根因: ${issue.rootCause}`);
      console.log(`  原始答案: ${issue.rawAnswer}`);
      console.log(`  题干预览: ${issue.stemPreview}`);
      console.log('');
    }
  }

  // Summary by root cause
  console.log('\n═'.repeat(100));
  console.log('\n📈 SUMMARY BY ROOT CAUSE:\n');

  const byCause = new Map();
  for (const issue of allIssues) {
    const cause = issue.rootCause;
    if (!byCause.has(cause)) {
      byCause.set(cause, []);
    }
    byCause.get(cause).push(issue);
  }

  for (const [cause, issues] of byCause.entries()) {
    console.log(`\n${cause}: ${issues.length} questions`);
    const desc = {
      'MERGED_HEADER': '题目标题合并了多道题（如"第10-11题"）',
      'MULTI_ANSWER_WITH_EXPLANATION': '答案包含多个字母并带解释（如"A（...）、B（...）"）',
      'MULTI_ANSWER_SIMPLE': '答案包含多个字母（如"D、A"）',
    };
    console.log(`  说明: ${desc[cause] || '未知'}`);
    console.log(`  影响题目: ${issues.map(i => `${i.file}#${i.questionNumber}`).join(', ')}`);
  }

  // Write JSON report
  const reportPath = path.resolve(__dirname, '../multiblank-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    scanTime: new Date().toISOString(),
    totalIssues: allIssues.length,
    byFile: Array.from(byFile.entries()).map(([file, issues]) => ({
      file,
      issueCount: issues.length,
      issues,
    })),
    byCause: Array.from(byCause.entries()).map(([cause, issues]) => ({
      cause,
      count: issues.length,
      issues: issues.map(i => ({ file: i.file, questionNumber: i.questionNumber, range: i.questionRange })),
    })),
  }, null, 2));

  console.log(`\n\n✅ Detailed report written to: ${reportPath}`);
  console.log('\n═'.repeat(100));
}

main();
