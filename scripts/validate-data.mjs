// Data quality validation script
// Checks all questions across all exams for completeness and consistency
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../src/data/exams.json');

function validateData() {
  console.log('🔍 Starting data quality validation...\n');

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const stats = {
    totalExams: 0,
    totalQuestions: 0,
    missingStems: [],
    missingAnswers: [],
    missingOptions: [],
    invalidOptionCount: [],
    invalidQuestionNumbers: [],
    totalMismatch: [],
    multiBlankQuestions: [],
    answerFormatIssues: [],
    emptyExplanations: 0,
  };

  for (const exam of data.exams) {
    stats.totalExams++;

    // Only validate multi_choice papers
    if (!exam.papers.multi_choice) continue;

    const paper = exam.papers.multi_choice;
    const questions = paper.questions;
    const expectedTotal = paper.total;
    const actualTotal = questions.length;

    stats.totalQuestions += actualTotal;

    // Check if declared total matches actual count
    if (expectedTotal !== actualTotal) {
      stats.totalMismatch.push({
        exam: exam.title,
        expected: expectedTotal,
        actual: actualTotal,
      });
    }

    // Track seen question numbers to detect duplicates/gaps
    const seenNumbers = new Set();

    for (const q of questions) {
      const qId = `${exam.title} - Q${q.number}`;

      // Check for duplicate/gap in numbering
      if (seenNumbers.has(q.number)) {
        stats.invalidQuestionNumbers.push({
          exam: exam.title,
          issue: 'duplicate',
          number: q.number,
        });
      }
      seenNumbers.add(q.number);

      // P0.1: Check stem exists
      if (!q.stem || q.stem.trim() === '') {
        stats.missingStems.push(qId);
      }

      // P0.2: Check answer exists and format
      // Question can have either `answer` (single) or `blanks` (multi-blank)
      const hasAnswer = q.answer && q.answer.trim() !== '';
      const hasBlanks = q.blanks && Array.isArray(q.blanks) && q.blanks.length > 0;

      if (!hasAnswer && !hasBlanks) {
        stats.missingAnswers.push(qId);
      } else {
        // Check format
        if (hasBlanks) {
          // Multi-blank: validate each blank
          for (const blank of q.blanks) {
            if (!blank.answer || !/^[A-D]$/.test(blank.answer)) {
              stats.answerFormatIssues.push({
                question: qId,
                answer: blank.answer,
                issue: `invalid blank ${blank.index} answer`,
              });
            }
          }
        } else if (hasAnswer) {
          // Single answer: should be single letter A-D
          const trimmed = q.answer.trim();
          if (!/^[A-D]$/.test(trimmed)) {
            stats.answerFormatIssues.push({
              question: qId,
              answer: q.answer,
              issue: 'not a single letter A-D',
            });
          }
        }
      }

      // P0.3: Check options (skip for simplified format questions)
      if (q.options && q.options.length > 0) {
        if (q.options.length !== 4) {
          stats.invalidOptionCount.push({
            question: qId,
            count: q.options.length,
          });
        }
        // Check each option has key and text
        for (const opt of q.options) {
          if (!opt.key || !opt.text || opt.text.trim() === '') {
            stats.missingOptions.push({
              question: qId,
              option: opt.key || 'unknown',
            });
          }
        }
      }

      // P0.6: Track multi-blank questions
      if (q.blanks && q.blanks.length >= 2) {
        stats.multiBlankQuestions.push({
          exam: exam.title,
          number: q.number,
          blankCount: q.blanks.length,
          answerValue: q.blanks.map(b => b.answer).join(','),
        });
      }

      // Track empty explanations (not critical but good to know)
      if (!q.explanation || q.explanation.trim() === '') {
        stats.emptyExplanations++;
      }
    }

    // Check for number gaps
    const sortedNumbers = [...seenNumbers].sort((a, b) => a - b);
    for (let i = 0; i < sortedNumbers.length - 1; i++) {
      if (sortedNumbers[i + 1] - sortedNumbers[i] > 1) {
        stats.invalidQuestionNumbers.push({
          exam: exam.title,
          issue: 'gap',
          range: `${sortedNumbers[i]} -> ${sortedNumbers[i + 1]}`,
        });
      }
    }
  }

  // Print report
  console.log('📊 VALIDATION REPORT\n');
  console.log('═'.repeat(80));
  console.log(`Total exams: ${stats.totalExams}`);
  console.log(`Total questions checked: ${stats.totalQuestions}`);
  console.log('═'.repeat(80));

  console.log('\n🔴 P0: DATA COMPLETENESS ISSUES\n');

  console.log(`[P0.1] Missing stems: ${stats.missingStems.length}`);
  if (stats.missingStems.length > 0) {
    stats.missingStems.slice(0, 10).forEach(q => console.log(`  - ${q}`));
    if (stats.missingStems.length > 10) {
      console.log(`  ... and ${stats.missingStems.length - 10} more`);
    }
  }

  console.log(`\n[P0.2] Missing answers: ${stats.missingAnswers.length}`);
  if (stats.missingAnswers.length > 0) {
    stats.missingAnswers.slice(0, 20).forEach(q => console.log(`  - ${q}`));
    if (stats.missingAnswers.length > 20) {
      console.log(`  ... and ${stats.missingAnswers.length - 20} more`);
    }
  }

  console.log(`\n[P0.3] Invalid option count (not 4): ${stats.invalidOptionCount.length}`);
  if (stats.invalidOptionCount.length > 0) {
    stats.invalidOptionCount.slice(0, 10).forEach(item =>
      console.log(`  - ${item.question}: has ${item.count} options`)
    );
    if (stats.invalidOptionCount.length > 10) {
      console.log(`  ... and ${stats.invalidOptionCount.length - 10} more`);
    }
  }

  console.log(`\n[P0.4] Invalid question numbering: ${stats.invalidQuestionNumbers.length}`);
  if (stats.invalidQuestionNumbers.length > 0) {
    stats.invalidQuestionNumbers.forEach(item =>
      console.log(`  - ${item.exam}: ${item.issue} ${item.range || item.number}`)
    );
  }

  console.log(`\n[P0.5] Total count mismatch: ${stats.totalMismatch.length}`);
  if (stats.totalMismatch.length > 0) {
    stats.totalMismatch.forEach(item =>
      console.log(`  - ${item.exam}: declared ${item.expected}, actual ${item.actual}`)
    );
  }

  console.log(`\n[P0.6] Multi-blank questions: ${stats.multiBlankQuestions.length}`);
  if (stats.multiBlankQuestions.length > 0) {
    stats.multiBlankQuestions.forEach(item =>
      console.log(`  - ${item.exam} Q${item.number}: ${item.blankCount} blanks, answer=${JSON.stringify(item.answerValue)}`)
    );
  }

  console.log(`\n[P0.7] Answer format issues: ${stats.answerFormatIssues.length}`);
  if (stats.answerFormatIssues.length > 0) {
    stats.answerFormatIssues.slice(0, 10).forEach(item =>
      console.log(`  - ${item.question}: "${item.answer}" (${item.issue})`)
    );
    if (stats.answerFormatIssues.length > 10) {
      console.log(`  ... and ${stats.answerFormatIssues.length - 10} more`);
    }
  }

  console.log(`\n\n📝 INFO\n`);
  console.log(`Empty explanations: ${stats.emptyExplanations} (not critical)`);

  console.log('\n═'.repeat(80));

  // Summary
  const criticalIssues =
    stats.missingStems.length +
    stats.missingAnswers.length +
    stats.invalidOptionCount.length +
    stats.invalidQuestionNumbers.length +
    stats.totalMismatch.length +
    stats.answerFormatIssues.length;

  if (criticalIssues === 0) {
    console.log('\n✅ All validation checks passed!');
    return true;
  } else {
    console.log(`\n❌ Found ${criticalIssues} critical issues that need fixing.`);
    return false;
  }
}

// Run validation
const success = validateData();
process.exit(success ? 0 : 1);
