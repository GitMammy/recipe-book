// ===== ui.js =====

//　260427-1852
// 
// オーバーレイ開閉・ライトボックス・スクロールボタン・イベントハンドラ設定・起動処理

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

// ----- フローティングスクロールボタン -----
function setupScrollButtons() {
  const wrap = document.createElement('div');
  wrap.id = 'scrollBtns';
  wrap.style.cssText =
    'position:fixed;right:14px;bottom:20px;z-index:900;display:flex;flex-direction:column;gap:6px;';

  const isMobile = () => window.innerWidth <= 600;
  const SCROLL_AMOUNT = Math.round(window.innerHeight * 0.6);

  // ▲ ボタン（PC・スマホ共通：トップへ）
  const btnUp = document.createElement('button');
  btnUp.textContent = '▲';
  btnUp.title = 'ページ上へ';
  btnUp.style.cssText =
    'width:38px;height:38px;border-radius:50%;border:1px solid #ccc;background:#fff;' +
    'font-size:14px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.15);color:#888;' +
    'display:none;align-items:center;justify-content:center;';
  btnUp.onclick = () => {
    if (isMobile()) window.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
  };

  // ▼ ボタン（PCのみ）
  const btnDown = document.createElement('button');
  btnDown.textContent = '▼';
  btnDown.title = 'ページ下へ';
  btnDown.style.cssText =
    'width:38px;height:38px;border-radius:50%;border:1px solid #ccc;background:#fff;' +
    'font-size:14px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.15);color:#888;' +
    'display:none;align-items:center;justify-content:center;';
  btnDown.onclick = () => window.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });

  wrap.appendChild(btnUp);
  wrap.appendChild(btnDown);
  document.body.appendChild(wrap);

  // スクロール量に応じてボタン表示切替
  const updateBtns = () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (isMobile()) {
      // スマホ：▲ のみ、スクロールしたら表示
      btnUp.style.display   = scrollY > 200 ? 'flex' : 'none';
      btnDown.style.display = 'none';
    } else {
      // PC：▲▼ 両方、スクロール位置に応じて
      btnUp.style.display   = scrollY > 200 ? 'flex' : 'none';
      btnDown.style.display = scrollY < maxScroll - 100 ? 'flex' : 'none';
    }
  };
  window.addEventListener('scroll', updateBtns, { passive: true });
  window.addEventListener('resize', updateBtns);
  updateBtns();
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
    render(); renderTipsCards();
  });

  // レシピ操作ボタン
  document.getElementById('btnOpenAdd').addEventListener('click', openAdd);
  document.getElementById('btnExport').addEventListener('click', exportData);
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
  setupScrollButtons();
  loadRecipes();
  loadCommonTips();
  refreshTipsCache(); // [[チップス名]] リンク用キャッシュ

  // オフライン保存ボタン
  document.getElementById('btnOffline')?.addEventListener('click', openOfflineModal);
  document.getElementById('offlineSaveBtn')?.addEventListener('click', execOfflineSave);

  // バナー：保存済みデータがある場合はオンラインでも表示
  getOfflineSavedAt().then(savedAt => {
    if (savedAt && !navigator.onLine) showOfflineBanner(savedAt);
  });
});
