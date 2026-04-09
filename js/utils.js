// ===== utils.js =====
//　260409-1615-
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
// レシピ・チップスリンク記法：[[名前]] → クリックでレシピ詳細 or チップス詳細を開くリンク
// 手順・アレンジ欄の表示時に使用する（保存データはそのまま）

// チップス一覧キャッシュ（renderWithTooltip から参照）
let _tipsCache = [];
async function refreshTipsCache() {
  const { data } = await window.supabase
    .from('notes_and_tips').select('id,title').is('recipe_id', null);
  _tipsCache = data || [];
}

function renderWithTooltip(str) {
  if (str == null) return '';
  // まず全体をエスケープ
  let result = esc(str);
  // ① [[名前]] → レシピリンク or チップスリンク（ツールチップより先に処理）
  result = result.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    // レシピを先に探す
    const recipe = (typeof recipes !== 'undefined' ? recipes : [])
      .find(r => r.name === name);
    if (recipe) {
      return `<span class="recipe-link" onclick="openDetail('${recipe.id}')">${name}</span>`;
    }
    // 次にチップスを探す
    const tip = _tipsCache.find(t => t.title === name);
    if (tip) {
      return `<span class="recipe-link" style="color:#638C3E;border-color:#638C3E" onclick="openTipDetail('${tip.id}')">💡${name}</span>`;
    }
    // マッチしなければ [[名前]] のままテキスト表示
    return `[[${name}]]`;
  });
  // ② [表示テキスト](補足説明) → ツールチップ
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, tip) => `<span class="tooltip-word" title="${tip}">${text}</span>`
  );
  return result;
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
