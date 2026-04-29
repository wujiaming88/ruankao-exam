# 📝 软考机考仿真系统

> 高仿真软考（计算机技术与软件专业技术资格考试）机考模拟练习系统，覆盖 5 个高级科目、39 套试卷。

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-6-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特性

- 🎯 **高仿真界面** — 深蓝导航栏 + 左侧科目导航 + 右侧试卷卡片 + 题号面板 + 分屏布局，贴近真实机考环境
- 📋 **三种题型** — 综合知识（75 题单选）、案例分析（5 题问答）、论文写作（4 选 1）
- ⏱️ **考试模式** — 严格倒计时 150 分钟，交卷不可逆，综合知识自动评分
- 📖 **练习模式** — 选择即出答案，案例/论文可查看参考答案
- 🔖 **标记功能** — 标记存疑题目，题号面板橙色高亮
- 💾 **自动保存** — 答题进度实时存入 localStorage，刷新不丢失
- 📊 **历史记录** — 每次考试成绩存档，支持回顾
- ❌ **错题本** — 自动收集综合知识错题，针对性复习

## 📚 试卷数据

| 科目 | 套数 | 类型 |
|------|------|------|
| 系统架构设计师 | 15 | 8 套真题 + 7 套模拟 |
| 信息系统项目管理师 | 7 | 真题 |
| 系统分析师 | 7 | 真题 |
| 系统规划与管理师 | 5 | 真题 |
| 网络规划设计师 | 5 | 真题 |
| **合计** | **39** | |

试卷数据来源：[awesome-ruankao](https://github.com/wujiaming88/awesome-ruankao)

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9（或 pnpm / yarn）

### 安装依赖

```bash
git clone https://github.com/wujiaming88/ruankao-exam.git
cd ruankao-exam
npm install
```

### 开发模式

```bash
npm run dev
```

浏览器打开 http://localhost:5173

支持 HMR 热更新，修改代码即时生效。

### 构建生产版本

```bash
npm run build
```

产物输出到 `dist/` 目录。

### 本地预览构建产物

```bash
npm run preview
```

浏览器打开 http://localhost:4173

## 🖥️ 部署方式

### 方式一：静态文件部署（推荐）

构建后 `dist/` 是纯静态文件，可部署到任何静态托管服务：

```bash
npm run build
```

然后将 `dist/` 目录部署到：

- **GitHub Pages** — 推送 `dist/` 到 `gh-pages` 分支
- **Vercel / Netlify** — 连接仓库，构建命令 `npm run build`，输出目录 `dist`
- **Nginx** — 将 `dist/` 复制到 web 目录

<details>
<summary>Nginx 配置参考</summary>

```nginx
server {
    listen 80;
    server_name exam.example.com;
    root /var/www/ruankao-exam/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

</details>

### 方式二：Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
docker build -t ruankao-exam .
docker run -p 8080:80 ruankao-exam
```

### 方式三：Node.js 直接运行

```bash
# 开发环境
npm run dev -- --host 0.0.0.0 --port 3000

# 生产预览
npm run build
npm run preview -- --host 0.0.0.0 --port 3000
```

## 📁 项目结构

```
ruankao-exam/
├── src/
│   ├── pages/
│   │   ├── Home.tsx              # 首页（左侧科目导航 + 右侧试卷卡片网格）
│   │   ├── Exam.tsx              # 考试入口（模式选择 + 路由）
│   │   ├── exam/
│   │   │   ├── MultiChoiceExam.tsx  # 综合知识（75 题选择）
│   │   │   ├── CaseExam.tsx         # 案例分析（分屏问答）
│   │   │   └── PaperExam.tsx        # 论文写作（4 选 1）
│   │   ├── Result.tsx            # 成绩详情
│   │   ├── History.tsx           # 历史记录
│   │   └── Mistakes.tsx          # 错题本
│   ├── components/
│   │   └── Markdown.tsx          # Markdown 渲染
│   ├── data/
│   │   ├── exams.json            # 试卷数据（39 套）
│   │   └── index.ts              # 数据加载
│   ├── storage.ts                # localStorage 封装
│   ├── types.ts                  # TypeScript 类型定义
│   └── App.tsx                   # 路由配置
├── scripts/
│   ├── parse-questions.mjs       # 题库 MD → JSON 解析器
│   └── verify-2024-data.mjs      # 数据验证脚本
├── dist/                         # 构建产物
└── package.json
```

## 🔧 数据更新

试卷数据从 [awesome-ruankao](https://github.com/wujiaming88/awesome-ruankao) 的 Markdown 文件解析生成。

如需更新或新增试卷：

```bash
# 1. 确保 awesome-ruankao 在同级目录
# 2. 运行解析器
node scripts/parse-questions.mjs

# 3. 验证数据完整性
node scripts/verify-2024-data.mjs
```

## 🌐 浏览器兼容

| 浏览器 | 版本 |
|--------|------|
| Chrome | ≥ 90 |
| Edge | ≥ 90 |
| Firefox | ≥ 90 |
| Safari | ≥ 15 |

> 推荐使用 Chrome，与真实机考环境一致。

## 📜 License

MIT
