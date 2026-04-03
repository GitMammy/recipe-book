/* コメント
detail.js が担当する機能

URL の id を取得
Supabase からレシピ詳細を取得
タイトル・カテゴリ・説明の表示
材料テーブルの描画（ing_parts / ing_rows）
写真ギャラリーの表示
Tips の読み込み（tips.js と連携）
編集モードの UI 切り替え
編集モーダル（recipe_edit.js）を開く
*/ 

// --------------------------------------
// 初期化
// --------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    alert('ID がありません');
    return;
  }

  window.currentRecipeId = id;
  loadRecipeDetail(id);
});


// --------------------------------------
// レシピ詳細を読み込む
// --------------------------------------
async function loadRecipeDetail(id) {
  const { data: r, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !r) {
    alert('読み込みエラー');
    return;
  }

  renderRecipeDetail(r);

  // Tips 読み込み（tips.js）
  if (typeof loadTips === "function") {
    loadTips(id);
  }
}


// --------------------------------------
// レシピ詳細の描画
// --------------------------------------
function renderRecipeDetail(r) {
  document.getElementById('detailTitle').textContent = r.title || r.name || '';

  document.getElementById('detailCategory').textContent = r.category || r.cat || '';

  const descBox = document.getElementById('detailDesc');
  if (descBox) {
    if (r.desc && r.desc.trim()) {
      descBox.textContent = r.desc;
      descBox.style.display = 'block';
    } else {
      descBox.style.display = 'none';
    }
  }

  const yieldBox = document.getElementById('detailYield');
  if (yieldBox) {
    if (r.yield_amount) {
      yieldBox.querySelector('p').textContent = r.yield_amount;
      yieldBox.style.display = 'block';
    } else {
      yieldBox.style.display = 'none';
    }
  }

  const urlBox = document.getElementById('detailUrl');
  if (urlBox) {
    if (r.url) {
      const label = r.url_label || '参考レシピ';
      urlBox.innerHTML = `<h3>参考レシピ</h3><a href="${r.url}" target="_blank">${esc(label)}</a>`;
      urlBox.style.display = 'block';
    } else {
      urlBox.style.display = 'none';
    }
  }

  renderIngredients(r);
  renderPhotos(r.photos || []);
  setupDetailEditorUI(r);
}


// --------------------------------------
// 材料テーブルの描画
// --------------------------------------
function renderIngredients(r) {
  const wrap = document.getElementById('detailIngredients');
  if (!wrap) return;

  const parts = r.ing_parts || r.ingParts || [];
  const rows = r.ing_rows || r.ingRows || [];

  let html = '<h3>材料</h3>';

  parts.forEach(part => {
    html += `<div class="ing-part-label">${esc(part)}</div>`;

    html += `<table class="ing-table"><tbody>`;

    rows
      .filter(row => row.part === part)
      .forEach(row => {
        html += `
          <tr>
            <td>${esc(row.name || '')}</td>
            <td>${esc(row.amount || row.amt || '')}</td>
          </tr>
        `;
      });

    html += `</tbody></table>`;
  });

  wrap.innerHTML = html;
}


// --------------------------------------
// 写真ギャラリー
// --------------------------------------
function renderPhotos(photos) {
  const box = document.getElementById('detailPhotos');
  if (!box) return;

  if (!photos.length) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';
  box.innerHTML =
    '<h3>写真</h3>' +
    photos
      .map(p => `<img src="${p.data || p}" class="detail-photo">`)
      .join('');
}


// --------------------------------------
// 編集モード UI
// --------------------------------------
function setupDetailEditorUI(r) {
  const editBtn = document.getElementById('editRecipeBtn');

  if (window.isEditor) {
    if (editBtn) {
      editBtn.style.display = 'inline-block';
      editBtn.onclick = () => openEditRecipe(r.id);
    }
  } else {
    if (editBtn) editBtn.style.display = 'none';
  }
}


/* コメント
| **config.js** | supabase / isEditor |
| **utils.js** | esc() |
| **ui.js** | showOverlay/hideOverlay（編集時） |
| **tips.js** | loadTips() |
| **recipe_edit.js** | openEditRecipe() |
*/ 
