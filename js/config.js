// --- Supabase 設定 ---
window.SUPABASE_URL = 'https://aoxgiqjcfbzrhdonknvc.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ← 省略

window.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// --- 編集モード判定 ---
window.SECRET_KEY = 'sakuramoti';
window.isEditor = (new URLSearchParams(location.search)).get('key') === SECRET_KEY;

// --- 編集モードのタイトル・favicon ---
(function () {
  if (!isEditor) return;
  document.title = '🔑 おかしなぺぇじ【編集モード】';
  const link = document.getElementById('faviconLink');
  if (link) {
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = 'favicon-edit.ico';
  }
})();
