/* コメント　*/ 
tips.js が担当する機能

Tips の読み込み（レシピ詳細画面）
Tips の一覧表示（index の Tips カード）
Tips の追加
Tips の編集
Tips の削除
公開/非公開の切り替え
Markdown → HTML の変換（utils.js と連携）
編集モードの UI 切り替え
*/ 

// ------------------------------
// Tips 一覧を読み込む（レシピ詳細画面）
// ------------------------------
async function loadTips(recipeId) {
  const list = document.getElementById('tipsList');
  if (!list) return;

  list.innerHTML = '<p style="padding:10px;color:#888">読み込み中…</p>';

  let { data: tips, error } = await supabase
    .from('tips')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('updated_at', { ascending: false });

  if (error) {
    list.innerHTML = '<p style="color:red">読み込みエラー</p>';
    return;
  }

  // 公開/非公開フィルタ（閲覧モードでは非公開を隠す）
  if (!isEditor) {
    tips = tips.filter(t => t.is_public === true);
  }

  list.innerHTML = tips.map(t => renderTipItem(t)).join('');
}


// ------------------------------
// Tips の HTML
// ------------------------------
function renderTipItem(t) {
  const pubBadge = t.is_public
    ? `<span class="tip-badge tip-pub">公開</span>`
    : `<span class="tip-badge tip-priv">非公開</span>`;

  const editBtns = isEditor
    ? `
      <div class="tip-edit-btns">
        <button class="btn-sm" onclick="openEditTip(${t.id})">編集</button>
        <button class="btn-sm" onclick="deleteTip(${t.id})">削除</button>
        <button class="btn-sm" onclick="toggleTipPublic(${t.id}, ${t.is_public})">
          ${t.is_public ? '非公開にする' : '公開にする'}
        </button>
      </div>
    `
    : '';

  return `
    <div class="tip-item">
      <div class="tip-header">
        <div class="tip-title">${esc(t.title || '')}</div>
        ${isEditor ? pubBadge : ''}
      </div>

      <div class="tip-body">
        ${markdownToHtml(t.body || '')}
      </div>

      ${editBtns}
    </div>
  `;
}


// ------------------------------
// Tips 追加モーダル
// ------------------------------
function openAddTip(recipeId) {
  resetTipForm();
  const f = document.getElementById('tipForm');
  f.dataset.recipeId = recipeId;

  showOverlay();
  document.getElementById('tipModal').style.display = 'block';
}


// ------------------------------
// Tips 編集モーダル
// ------------------------------
async function openEditTip(id) {
  showOverlay();
  document.getElementById('tipModal').style.display = 'block';

  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    alert('読み込みエラー');
    return;
  }

  fillTipForm(data);
}


// ------------------------------
// フォーム初期化
// ------------------------------
function resetTipForm() {
  const f = document.getElementById('tipForm');
  f.reset();
  f.dataset.id = '';
  f.dataset.recipeId = '';
}


// ------------------------------
// フォームにデータをセット
// ------------------------------
function fillTipForm(t) {
  const f = document.getElementById('tipForm');
  f.dataset.id = t.id;
  f.dataset.recipeId = t.recipe_id;

  f.title.value = t.title || '';
  f.body.value = t.body || '';
}


// ------------------------------
// Tips 保存（追加 or 更新）
// ------------------------------
async function saveTip() {
  const f = document.getElementById('tipForm');
  const id = f.dataset.id;
  const recipeId = f.dataset.recipeId;

  const payload = {
    recipe_id: recipeId,
    title: f.title.value.trim(),
    body: f.body.value.trim(),
  };

  let result;
  if (id) {
    result = await supabase.from('tips').update(payload).eq('id', id);
  } else {
    result = await supabase.from('tips').insert(payload);
  }

  if (result.error) {
    alert('保存エラー');
    return;
  }

  closeTipModal();
  loadTips(recipeId);
}


// ------------------------------
// Tips 削除
// ------------------------------
async function deleteTip(id) {
  if (!confirm('削除しますか？')) return;

  const { data, error } = await supabase
    .from('tips')
    .select('recipe_id')
    .eq('id', id)
    .single();

  if (error) return;

  const recipeId = data.recipe_id;

  await supabase.from('tips').delete().eq('id', id);

  loadTips(recipeId);
}


// ------------------------------
// 公開/非公開切り替え
// ------------------------------
async function toggleTipPublic(id, current) {
  const newVal = !current;

  const { data, error } = await supabase
    .from('tips')
    .update({ is_public: newVal })
    .eq('id', id)
    .select('recipe_id')
    .single();

  if (error) return;

  loadTips(data.recipe_id);
}


// ------------------------------
// モーダルを閉じる
// ------------------------------
function closeTipModal() {
  hideOverlay();
  document.getElementById('tipModal').style.display = 'none';
}
