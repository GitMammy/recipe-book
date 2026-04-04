// ===== ui.js =====
// 260404 1602
// オーバーレイ開閉・ライトボックス・イベントハンドラ設定・起動処理

function openOverlay(id)  { document.getElementById(id)?.classList.add('open'); }
function closeOverlay(id) { document.getElementById(id)?.classList.remove('open'); }

function openLightbox(idx) {
  const p = currentPhotos[idx];
  if (!p) return;
  document.getElementById('lightboxImg').src         = p.data;
  document.getElementById('lightboxCaption').textContent = p.title || '';
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

function setupEventHandlers() {
  // オーバーレイ背景クリックで閉じる
  ['overlayDetail','overlayTipDetail','overlayTipEdit'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target === e.currentTarget) closeOverlay(id);
    });
  });

  // 検索・フィルター
  document.getElementById('search').addEventListener('input', render);
  document.getElementById('filterCat').addEventListener('change', render);
  document.getElementById('filterPub').addEventListener('change', () => {
    render(); renderCommonTipList(); renderTipsCards();
  });

  // レシピ操作ボタン
  document.getElementById('btnOpenAdd').addEventListener('click', openAdd);
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnAddRowLast').addEventListener('click', addRowToLastPart);
  document.getElementById('btnAddPart').addEventListener('click', addNewPart);
  document.getElementById('btnSave').addEventListener('click', saveRecipe);
  document.getElementById('btnDelete').addEventListener('click', deleteRecipe);
  document.getElementById('btnAddNote').addEventListener('click', addNote);

  // 写真追加
  document.getElementById('btnAddPhoto').addEventListener('click', () => document.getElementById('photoInput').click());
  document.getElementById('photoInput').addEventListener('change', function () { handlePhotoAdd(this); });

  // 共通チップス
  document.getElementById('btnOpenCommonTips').addEventListener('click', openCommonTipsManager);
  document.getElementById('commonTipPhotoAddBtn').addEventListener('click', () => document.getElementById('commonTipPhotoInput').click());
  document.getElementById('commonTipPhotoInput').addEventListener('change', function () { handleCommonTipPhoto(this); });
  document.getElementById('commonTipAddBtn').addEventListener('click', addCommonTip);

  // tips編集モーダル
  document.getElementById('tipEditPhotoAddBtn').addEventListener('click', () => document.getElementById('tipEditPhotoInput').click());
  document.getElementById('tipEditPhotoInput').addEventListener('change', function () { handleTipEditPhoto(this); });
  document.getElementById('tipEditSaveBtn').addEventListener('click', saveTipEdit);
  document.getElementById('tipEditDeleteBtn').addEventListener('click', deleteTipFromEdit);
}

document.addEventListener('DOMContentLoaded', () => {
  if (isEditor) {
    document.body.classList.add('edit-mode');
    document.title = '🔑 おかしなぺぇじ【編集モード】';
    const favicon = document.getElementById('faviconLink');
    if (favicon) favicon.href = 'favicon-edit.ico';

    // TXTから追加ボタンを動的挿入
    const toolbar = document.querySelector('.toolbar-right');
    if (toolbar && !document.getElementById('btnOpenFromTxt')) {
      const txtInput = document.createElement('input');
      txtInput.type = 'file'; txtInput.accept = '.txt,text/plain';
      txtInput.style.display = 'none'; txtInput.id = 'txtFileInput';
      txtInput.addEventListener('change', function () { openFromTextFile(this); });

      const txtBtn = document.createElement('button');
      txtBtn.className = 'btn btn-sm'; txtBtn.id = 'btnOpenFromTxt';
      txtBtn.textContent = '📒追加';
      txtBtn.addEventListener('click', () => txtInput.click());

      toolbar.insertBefore(txtBtn, toolbar.firstChild);
      toolbar.appendChild(txtInput);
    }
  }

  setupEventHandlers();
  loadRecipes();
  loadCommonTips();
});
