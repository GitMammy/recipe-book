/* コメント　
recipes.js（一覧画面のすべてを担当）
このファイルが担当するのは：

Supabase からレシピ一覧を取得
公開/非公開フィルタの適用
検索キーワードの適用
カードの描画
お気に入り（♡）・スター（★）の切り替え
detail.html への遷移
カウント表示（件数）

index.html の “メインロジック” 全部
*/ 

// ------------------------------
// レシピ一覧の読み込み
// ------------------------------
async function loadRecipes() {
  const grid = document.getElementById('recipeGrid');
  const countBar = document.getElementById('countBar');
  const searchBox = document.getElementById('searchBox');

  if (!grid) return;

  grid.innerHTML = '<p style="padding:20px;text-align:center;color:#888">読み込み中…</p>';

  // 検索キーワード
  const keyword = (searchBox?.value || '').trim();

  // Supabase から取得
  let { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    grid.innerHTML = '<p style="padding:20px;color:red">読み込みエラー</p>';
    return;
  }

  // 公開/非公開フィルタ
  const filter = window.currentFilter || 'all';
  recipes = recipes.filter(r => {
    if (filter === 'pub') return r.is_public === true;
    if (filter === 'priv') return r.is_public === false;
    return true;
  });

  // 検索フィルタ
  if (keyword) {
    recipes = recipes.filter(r =>
      (r.title || '').includes(keyword) ||
      (r.category || '').includes(keyword)
    );
  }

  // 件数表示
  if (countBar) {
    countBar.textContent = `${recipes.length} 件`;
  }

  // カード描画
  grid.innerHTML = recipes.map(r => renderRecipeCard(r)).join('');
}


// ------------------------------
// レシピカードの HTML
// ------------------------------
function renderRecipeCard(r) {
  const img = r.photos?.length ? r.photos[0] : null;
  const emoji = getCatEmoji(r.category);

  return `
    <div class="card" onclick="openDetail(${r.id})">
      ${img
        ? `<img src="${img}" class="card-img">`
        : `<div class="card-img-placeholder">${emoji}</div>`}

      <div class="card-body">
        <div class="card-top">
          <div class="card-title">${esc(r.title)}</div>

          <div class="hearts" onclick="event.stopPropagation()">
            <button class="heart-btn ${r.is_fav ? 'on' : ''}"
              onclick="toggleFav(event, ${r.id})">♡</button>
            <button class="star-btn ${r.is_star ? 'on' : ''}"
              onclick="toggleStar(event, ${r.id})">★</button>
          </div>
        </div>

        <div class="card-desc">${esc(r.category || '')}</div>
      </div>
    </div>
  `;
}


// ------------------------------
// 詳細画面へ遷移
// ------------------------------
function openDetail(id) {
  const url = isEditor
    ? `detail.html?id=${id}&key=${SECRET_KEY}`
    : `detail.html?id=${id}`;
  location.href = url;
}


// ------------------------------
// お気に入り（♡）切り替え
// ------------------------------
async function toggleFav(ev, id) {
  ev.stopPropagation();

  const btn = ev.currentTarget;
  const newVal = !btn.classList.contains('on');

  btn.classList.toggle('on', newVal);

  await supabase
    .from('recipes')
    .update({ is_fav: newVal })
    .eq('id', id);
}


// ------------------------------
// スター（★）切り替え
// ------------------------------
async function toggleStar(ev, id) {
  ev.stopPropagation();

  const btn = ev.currentTarget;
  const newVal = !btn.classList.contains('on');

  btn.classList.toggle('on', newVal);

  await supabase
    .from('recipes')
    .update({ is_star: newVal })
    .eq('id', id);
}


// ------------------------------
// 検索ボックスのイベント
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.addEventListener('input', () => loadRecipes());
  }
});
