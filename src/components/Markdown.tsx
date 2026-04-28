import { useMemo } from 'react';

interface Props {
  content: string;
  className?: string;
}

// Lightweight markdown renderer for case/paper content.
// Handles: headers, bold, lists, paragraphs, code blocks, tables (basic), horizontal rules.
export default function Markdown({ content, className }: Props) {
  const html = useMemo(() => render(content), [content]);
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text: string): string {
  let out = escapeHtml(text);
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // Inline code `text`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

function render(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let listBuf: string[] = [];
  let paraBuf: string[] = [];
  let tableBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push('<p>' + inline(paraBuf.join(' ')) + '</p>');
      paraBuf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length) {
      out.push('<ul>' + listBuf.map(l => '<li>' + inline(l) + '</li>').join('') + '</ul>');
      listBuf = [];
    }
  };
  const flushTable = () => {
    if (tableBuf.length < 2) {
      // not a table, dump as para
      for (const r of tableBuf) paraBuf.push(r);
      tableBuf = [];
      return;
    }
    const rows = tableBuf.filter(r => !/^\|?\s*:?-+/.test(r));
    const parsed = rows.map(r =>
      r.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
    );
    if (parsed.length < 2) {
      tableBuf = [];
      return;
    }
    const [head, ...body] = parsed;
    let html = '<table class="md-table"><thead><tr>';
    for (const h of head) html += '<th>' + inline(h) + '</th>';
    html += '</tr></thead><tbody>';
    for (const row of body) {
      html += '<tr>';
      for (const c of row) html += '<td>' + inline(c) + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table>';
    out.push(html);
    tableBuf = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushTable();
  };

  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      if (inCode) {
        out.push('<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
        codeBuf = [];
        inCode = false;
      } else {
        flushAll();
        inCode = true;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }
    if (/^\s*$/.test(line)) {
      flushAll();
      i++;
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      flushAll();
      out.push('<hr/>');
      i++;
      continue;
    }
    const h = /^(#{1,6})\s+(.+)$/.exec(line);
    if (h) {
      flushAll();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      flushTable();
      listBuf.push(line.replace(/^\s*[-*]\s+/, ''));
      i++;
      continue;
    }
    if (/^\|.*\|/.test(line)) {
      flushPara();
      flushList();
      tableBuf.push(line);
      i++;
      continue;
    }
    if (/^\s*>\s*/.test(line)) {
      flushAll();
      out.push(
        '<blockquote>' + inline(line.replace(/^\s*>\s?/, '')) + '</blockquote>'
      );
      i++;
      continue;
    }
    flushList();
    flushTable();
    paraBuf.push(line);
    i++;
  }
  flushAll();
  if (inCode) {
    out.push('<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
  }

  return out.join('\n');
}
