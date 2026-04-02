/* コメント
このファイルでは、主に次のような処理を担当する：

DOMContentLoaded 後の初期化
編集モード UI の表示/非表示
公開/非公開フィルタの表示切り替え
オーバーレイ（モーダル背景）の ON/OFF
ボタンのイベント登録（フィルタボタンなど）

あなたのコードを読み込んだ上で、
index/detail どちらでも動くように安全に書き換えたバージョンを作ったよ。
*/ 

// ------------------------------
// UI 初期化
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupEditorUI();
  setupFilterUI();
});


// ------------------------------
// 編集モード UI の切り替え
// ------------------------------
function setupEditorUI() {
  const pubFilterArea = document.getElementById('pubFilterArea');
  const editorTools = document.getElementById('editorTools');

  // pubFilterArea（公開/非公開フィルタ）
  if (pubFilterArea) {
    pubFilterArea.style.display = isEditor ? 'block' : 'none';
  }

  // editorTools（編集ツール）
  if (editorTools) {
    editorTools.style.display = isEditor ? 'flex' : 'none';
  }
}


// ------------------------------
// 公開/非公開フィルタの UI
// ------------------------------
function setupFilterUI() {
  const filterAll = document.getElementById('filterAll');
  const filterPub = document.getElementById('filterPub');
  const filterPriv = document.getElementById('filterPriv');

  if (filterAll) filterAll.addEventListener('click', () => applyFilter('all'));
  if (filterPub) filterPub.addEventListener('click', () => applyFilter('pub'));
  if (filterPriv) filterPriv.addEventListener('click', () => applyFilter('priv'));
}


// ------------------------------
// フィルタ適用（index.html 用）
// ------------------------------
function applyFilter(mode) {
  window.currentFilter = mode;

  // recipes.js 側の loadRecipes() を呼ぶ
  if (typeof loadRecipes === 'function') {
    loadRecipes();
  }
}


// ------------------------------
// オーバーレイ（モーダル背景）
// ------------------------------
function showOverlay() {
  const ov = document.getElementById('overlay');
  if (ov) ov.style.display = 'block';
}

function hideOverlay() {
  const ov = document.getElementById('overlay');
  if (ov) ov.style.display = 'none';
}
