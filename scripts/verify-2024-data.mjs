#!/usr/bin/env node
// Verify that 2024年下半年 architecture cases and papers are correctly parsed
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('src/data/exams.json', 'utf8'));
const exam = data.exams.find(x => 
  x.id.includes('2024年下半年') && x.subject === '系统架构设计师'
);

if (!exam) {
  console.error('❌ 找不到 2024年下半年 系统架构设计师考试数据');
  process.exit(1);
}

const caseCount = exam.papers?.case?.cases?.length ?? 0;
const paperCount = exam.papers?.paper?.topics?.length ?? 0;

console.log('2024年下半年 系统架构设计师:');
console.log(`  案例分析: ${caseCount} 题`);
console.log(`  论文写作: ${paperCount} 题`);

if (caseCount === 0) {
  console.error('❌ 案例分析题数为 0，解析失败');
  process.exit(1);
}

if (paperCount === 0) {
  console.error('❌ 论文题数为 0，解析失败');
  process.exit(1);
}

// Verify case analysis content
const case1 = exam.papers.case.cases[0];
if (!case1.title.includes('质量属性')) {
  console.error(`❌ 案例分析第一题标题异常: ${case1.title}`);
  process.exit(1);
}
if (case1.content.length < 1000) {
  console.error(`❌ 案例分析第一题内容过短: ${case1.content.length} 字符`);
  process.exit(1);
}

// Verify paper content
const paper1 = exam.papers.paper.topics[0];
if (!paper1.title.includes('软件维护')) {
  console.error(`❌ 论文第一题标题异常: ${paper1.title}`);
  process.exit(1);
}
if (paper1.content.length < 2000) {
  console.error(`❌ 论文第一题内容过短: ${paper1.content.length} 字符`);
  process.exit(1);
}

console.log('✅ 所有验证通过');
console.log(`\n案例分析题目:`);
exam.papers.case.cases.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.title}`);
});

console.log(`\n论文题目:`);
exam.papers.paper.topics.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.title}`);
});
