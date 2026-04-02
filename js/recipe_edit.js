/* コメント　
recipe_edit.js が担当する機能

レシピ追加モーダルを開く
レシピ編集モーダルを開く
入力フォームへデータをセット
保存（insert / update）
削除
材料（ings / ing_parts / ing_rows）の処理
写真アップロード（storage.js と連携）
モーダルの閉じる処理

index.html の「編集モードの心臓部」
*/ 

// ------------------------------
// レシピ追加モーダルを開く
// ------------------------------
function openAddRecipe() {
  resetRecipeForm();
  showOverlay();
  document.getElementById('recipeModal').style.display = 'block';
}


// ------------------------------
// レシピ編集モーダルを開く
// ------------------------------
async function openEditRecipe(id) {
  showOverlay();
  document.getElementById('recipeModal').style.display = 'block';

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    alert('読み込みエラー');
    return;
  }

  fillRecipeForm(data);
}


// ------------------------------
// フォーム初期化
// ------------------------------
function resetRecipeForm() {
  const f = document.getElementById('recipeForm');
  if (!f) return;

  f.reset();
  f.dataset.id = '';
  document.getElementById('photoPreview').innerHTML = '';
}


// ------------------------------
// フォームにデータをセット
// ------------------------------
function fillRecipeForm(r) {
  const f = document.getElementById('recipeForm');
  if (!f) return;

  f.dataset.id = r.id;

  f.title.value = r.title || '';
  f.category.value = r.category || '';
  f.desc.value = r.desc || '';
  f.yield_amount.value = r.yield_amount || '';
  f.url.value = r.url || '';
  f.url_label.value = r.url_label || '';

  // 材料
  f.ings.value = JSON.stringify(r.ings || [], null, 2);
  f.ing_parts.value = JSON.stringify(r.ing_parts || [], null, 2);
  f.ing_rows.value = JSON.stringify(r.ing_rows || [], null, 2);

  // 写真
  const preview = document.getElementById('photoPreview');
  preview.innerHTML = '';
  (r.photos || []).forEach(url => {
    preview.innerHTML += `<img src="${url}" class="preview-img">`;
  });
}


// ------------------------------
// 保存（追加 or 更新）
// ------------------------------
async function saveRecipe() {
  const f = document.getElementById('recipeForm');
  if (!f) return;

  const id = f.dataset.id;

  const payload = {
    title: f.title.value.trim(),
    category: f.category.value.trim(),
    desc: f.desc.value.trim(),
    yield_amount: f.yield_amount.value.trim(),
    url: f.url.value.trim(),
    url_label: f.url_label.value.trim(),
    ings: parseJsonSafe(f.ings.value),
    ing_parts: parseJsonSafe(f.ing_parts.value),
    ing_rows: parseJsonSafe(f.ing_rows.value),
  };

  // 写真は storage.js 側で管理
  payload.photos = window.currentUploadedPhotos || [];

  let result;
  if (id) {
    result = await supabase.from('recipes').update(payload).eq('id', id);
  } else {
    result = await supabase.from('recipes').insert(payload);
  }

  if (result.error) {
    alert('保存エラー');
    return;
  }

  closeRecipeModal();
  loadRecipes();
}


// ------------------------------
// JSON パース安全版
// ------------------------------
function parseJsonSafe(str) {
  try {
    return JSON.parse(str || '[]');
  } catch {
    return [];
  }
}


// ------------------------------
// レシピ削除
// ------------------------------
async function deleteRecipe() {
  const f = document.getElementById('recipeForm');
  const id = f.dataset.id;
  if (!id) return;

  if (!confirm('本当に削除しますか？')) return;

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id);

  if (error) {
    alert('削除エラー');
    return;
  }

  closeRecipeModal();
  loadRecipes();
}


// ------------------------------
// モーダルを閉じる
// ------------------------------
function closeRecipeModal() {
  hideOverlay();
  document.getElementById('recipeModal').style.display = 'none';
}
