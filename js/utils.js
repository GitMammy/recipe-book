// ===== utils.js =====
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
