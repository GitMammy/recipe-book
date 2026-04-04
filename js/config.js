// ===== config.js =====
//　260404　1511
// Supabase 初期化・グローバル変数・編集モード判定

(function () {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('Supabase SDK が読み込まれていません。');
    return;
  }
  window.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
})();

// グローバル状態
let recipes = [];
let pendingPhotos = [];
let editId = null;
let dragSrc = null;
let currentPhotos = [];

// tips 編集用
let tipEditPendingPhoto = null;
let tipEditPhotoCleared = false;
let pendingCommonTipPhoto = null;

// 編集モード（ファイル読み込み時点で確定）
const SECRET_KEY = 'sakuramoti';
const isEditor = (new URLSearchParams(location.search)).get('key') === SECRET_KEY;
