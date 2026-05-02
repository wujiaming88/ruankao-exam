// Fix answer format in awesome-ruankao markdown files
// Convert "66-D、67-B" to "D、B" for merged questions
// This is a dry-run script - shows what would be changed without modifying files
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ROOT = process.env.AWESOME_RUANKAO_PATH
  ? path.resolve(process.env.AWESOME_RUANKAO_PATH)
  : path.resolve(__dirname, '../../awesome-ruankao');

const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

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

function fixAnswerFormat(content) {
  const changes = [];

  // Pattern 1: "66-D、67-B" or "18-B、19-A、20-D、21-C"
  // Should be: "D、B" or "B、A、D、C"
  const pattern1 = /\*\*答案\*\*\s*[:：]\s*(\d+(?:-[A-D](?:[、,，]\s*\d+-[A-D])+))/g;
  let match;

  let newContent = content;

  while ((match = pattern1.exec(content)) !== null) {
    const fullAnswer = match[1];
    // Extract just the letters
    const letters = fullAnswer.match(/[A-D]/g);
    if (letters && letters.length > 0) {
      const simplified = letters.join('、');
      const oldText = match[0];
      const newText = `**答案**: ${simplified}`;

      changes.push({
        type: 'answer_format',
        old: oldText,
        new: newText,
        position: match.index,
      });

      newContent = newContent.replace(oldText, newText);
    }
  }

  // Pattern 2: "A B" (space separated) should be "A、B"
  const pattern2 = /\*\*答案\*\*\s*[:：]\s*([A-D])\s+([A-D])/g;

  while ((match = pattern2.exec(newContent)) !== null) {
    const oldText = match[0];
    const newText = `**答案**: ${match[1]}、${match[2]}`;

    changes.push({
      type: 'space_to_separator',
      old: oldText,
      new: newText,
      position: match.index,
    });

    newContent = newContent.replace(oldText, newText);
  }

  return { newContent, changes };
}

function analyzeAndFix(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(SOURCE_ROOT, filePath);

  const { newContent, changes } = fixAnswerFormat(content);

  if (changes.length === 0) {
    return null;
  }

  return {
    path: relPath,
    fullPath: filePath,
    changes,
    newContent,
  };
}

function main() {
  const realFiles = walk(path.join(SOURCE_ROOT, '真题'));

  // Filter to 综合知识 only
  const zhFiles = realFiles.filter(f => {
    const name = path.basename(f, '.md');
    return name === '综合知识' || name === '综合知识_题目';
  });

  console.log(`Analyzing ${zhFiles.length} 综合知识 files...`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'APPLY CHANGES'}\n`);

  const results = [];

  for (const file of zhFiles) {
    const result = analyzeAndFix(file);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    console.log('✅ No changes needed - all files are already in correct format!');
    return;
  }

  console.log('='.repeat(80));
  console.log(`FOUND ${results.length} FILES WITH FORMATTING ISSUES`);
  console.log('='.repeat(80));

  for (const result of results) {
    console.log(`\n📄 ${result.path}`);
    console.log(`   Changes: ${result.changes.length}`);

    for (const change of result.changes) {
      console.log(`   - ${change.type}:`);
      console.log(`     OLD: ${change.old}`);
      console.log(`     NEW: ${change.new}`);
    }

    if (!DRY_RUN) {
      fs.writeFileSync(result.fullPath, result.newContent, 'utf8');
      console.log(`   ✅ Applied changes`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Files with changes: ${results.length}`);
  console.log(`Total changes: ${results.reduce((sum, r) => sum + r.changes.length, 0)}`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. To apply changes, run:');
    console.log('   node scripts/fix-answer-format.mjs --apply');
  } else {
    console.log('\n✅ All changes have been applied!');
  }
}

main();
