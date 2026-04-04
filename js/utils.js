// ===== utils.js =====
//260404 1753
// 共通ユーティリティ関数

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ツールチップ記法：[表示テキスト](補足説明) → <span title="補足説明">表示テキスト</span>
// 手順・アレンジ欄の表示時に使用する（保存データはそのまま）
function renderWithTooltip(str) {
  if (str == null) return '';
  // まず全体をエスケープしてから記法だけ変換
  return esc(str).replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, tip) => `<span class="tooltip-word" title="${tip}">${text}</span>`
  );
}

function markdownToHtml(md) {
  if (!md) return '';
  return esc(md).replace(/\n/g, '<br>');
}

function getCatEmoji(cat) {
  if (!cat) return '🍰';
  if (cat.includes('焼き菓子')) return '🍪';
  if (cat.includes('おやつ'))   return '🥞';
  if (cat.includes('パート'))   return '🥣';
  if (cat.includes('ヘルシー')) return '🌿';
  if (cat.includes('揚げ菓子')) return '🍩';
  if (cat.includes('パン'))     return '🥐';
  if (cat.includes('冷菓'))     return '🍮';
  if (cat.includes('氷菓'))     return '🍧';
  if (cat.includes('飲み'))     return '🥤';
  return '🍰';
}
