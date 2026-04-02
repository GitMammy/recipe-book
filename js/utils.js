// HTMLエスケープ
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

// カテゴリ → 絵文字
function getCatEmoji(cat) {
  if (!cat) return '🍰';
  if (cat.includes('焼き菓子')) return '🍪';
  if (cat.includes('おやつ')) return '🥞';
  if (cat.includes('パート')) return '🥣';
  if (cat.includes('ヘルシー？')) return '🌿';
  if (cat.includes('揚げ菓子')) return '🍩';
  if (cat.includes('パン')) return '🥐';
  if (cat.includes('冷菓')) return '🍮';
  if (cat.includes('氷菓')) return '🍧';
  if (cat.includes('飲み')) return '🥤';
  return '🍰';
}

// Markdown → HTML（Tips用）
function markdownToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let result = [];
  let inUl = false;

  lines.forEach(line => {
    const trimmed = line.trim();

    if (/^[・•\-]\s*/.test(trimmed)) {
      if (!inUl) {
        result.push('<ul>');
        inUl = true;
      }
      const content = trimmed.replace(/^[・•\-]\s*/, '');
      result.push('<li>' + applyInlineMarkdown(content) + '</li>');
      return;
    }

    if (inUl) {
      result.push('</ul>');
      inUl = false;
    }

    if (trimmed === '') {
      result.push('<br>');
      return;
    }

    result.push('<p>' + applyInlineMarkdown(trimmed) + '</p>');
  });

  if (inUl) result.push('</ul>');

  return '<div class="tip-md">' + result.join('') + '</div>';
}

function applyInlineMarkdown(text) {
  if (!text) return '';
  text = esc(text);
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`(.+?)`/g,
    '<code style="background:#f0f0f0;padding:0 3px;border-radius:3px;font-size:11px">$1</code>'
  );
  return text;
}
