// ===== offline.js =====
//　2026/04/30-1602
// IndexedDB によるオフラインデータ管理・PWAインストール制御

const DB_NAME    = 'okashi-offline';
const DB_VERSION = 1;
const STORE_NAME = 'snapshot';
const SNAPSHOT_KEY = 'latest';

// ----- PWAインストールプロンプト制御 -----
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); // 自動バナーを止める
  _installPrompt = e;
  updateInstallBtn();
});

window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  updateInstallBtn();
});

function updateInstallBtn() {
  const btn = document.getElementById('btnInstallApp');
  if (!btn) return;
  // インストール済み（standalone モード）の場合は非表示
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  btn.style.display = (!isStandalone && _installPrompt) ? '' : 'none';
}

async function execInstallApp() {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') {
    _installPrompt = null;
    updateInstallBtn();
  }
}

// ----- DB 初期化 -----
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ----- 保存 -----
async function saveOfflineSnapshot() {
  const { data: recipeData } = await window.supabase
    .from('recipes').select('*').order('created_at', { ascending: false });
  const { data: notesData } = await window.supabase
    .from('notes_and_tips').select('*').order('created_at', { ascending: true });

  const now = new Date();
  const dateStr = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('/');

  const snapshot = {
    saved_at: dateStr,
    recipes:  recipeData || [],
    notes:    notesData  || []
  };

  const db    = await openOfflineDB();
  const tx    = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(snapshot, SNAPSHOT_KEY);

  await new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror    = () => rej(tx.error);
  });

  return dateStr;
}

// ----- 読み込み -----
async function loadOfflineSnapshot() {
  try {
    const db    = await openOfflineDB();
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return await new Promise((res, rej) => {
      const req  = store.get(SNAPSHOT_KEY);
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => rej(req.error);
    });
  } catch {
    return null;
  }
}

// ----- 保存日時だけ取得 -----
async function getOfflineSavedAt() {
  const snap = await loadOfflineSnapshot();
  return snap ? snap.saved_at : null;
}

// ----- オフラインモーダルを開く -----
async function openOfflineModal() {
  const savedAt = await getOfflineSavedAt();
  const statusEl = document.getElementById('offlineStatus');
  if (savedAt) {
    statusEl.innerHTML =
      `<div class="offline-saved-badge">📦 ${savedAt} に保存したデータがあります</div>`;
  } else {
    statusEl.innerHTML =
      `<div style="color:#888;font-size:13px">まだオフライン用データは保存されていません。</div>`;
  }
  updateInstallBtn();
  openOverlay('overlayOffline');
}

// ----- 保存ボタン処理 -----
async function execOfflineSave() {
  const btn = document.getElementById('offlineSaveBtn');
  btn.disabled = true; btn.textContent = '保存中...';
  try {
    const dateStr = await saveOfflineSnapshot();
    document.getElementById('offlineStatus').innerHTML =
      `<div class="offline-saved-badge">📦 ${dateStr} に保存したデータがあります</div>`;
    showOfflineBanner(dateStr);
    alert(`${dateStr} のデータを保存しました！\nオフライン時もこのデータで閲覧できます。`);
  } catch (err) {
    alert('保存に失敗しました: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = '保存する';
  }
}

// ----- オフラインバナー表示 -----
function showOfflineBanner(savedAt) {
  let banner = document.getElementById('offlineBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offlineBanner';
    banner.style.cssText =
      'background:#FFF8E1;border-bottom:1px solid #FFD54F;padding:6px 16px;' +
      'font-size:12px;color:#7B5800;text-align:center;position:sticky;top:0;z-index:500;';
    document.body.insertBefore(banner, document.body.firstChild);
  }
  banner.textContent = `📦 ${savedAt} に保存したデータを表示中`;
}

// ----- 起動時：オフライン判定 -----
let _offlineNotes = null; // オフライン時のnotesキャッシュ

async function initOfflineMode() {
  if (!navigator.onLine) {
    const snap = await loadOfflineSnapshot();
    if (snap && snap.recipes) {
      recipes = snap.recipes;
      _offlineNotes = snap.notes || [];
      updateSelects();
      render();
      showOfflineBanner(snap.saved_at);
      renderTipsCardsFromData(_offlineNotes);
      return true;
    }
  }
  return false;
}

// ----- オフライン時のnotes取得（openDetailから呼ぶ） -----
// オフライン時はキャッシュから返す。オンライン時はnullを返す（Supabaseから取得）
function getOfflineNotes(recipeId) {
  if (_offlineNotes === null) return null;
  return _offlineNotes.filter(n => n.recipe_id === String(recipeId));
}

// ----- オフラインデータからチップスを描画 -----
function renderTipsCardsFromData(notes) {
  const area     = document.getElementById('tipsArea');
  const tipsGrid = document.getElementById('tipsGrid');
  if (!area || !tipsGrid) return;

  const tips = notes.filter(n => !n.recipe_id && (isEditor || n.pub));
  if (!tips.length) { area.style.display = 'none'; return; }
  area.style.display = 'block';

  tipsGrid.innerHTML = tips.map(t => {
    const preview = t.content
      ? `<div style="font-size:12px;color:#555;line-height:1.5;margin-top:4px">${esc(t.content.length > 60 ? t.content.slice(0, 60) + '…' : t.content)}</div>` : '';
    return `
      <div class="card card-tips" style="cursor:pointer" onclick="openTipDetail('${t.id}')">
        <div class="card-body">
          <div style="font-size:14px;font-weight:500;color:#1a1a1a;margin-bottom:4px">${esc(t.title)}</div>
          ${preview}
        </div>
      </div>`;
  }).join('');
}
