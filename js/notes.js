// ===== notes.js =====
// レシピ紐づきメモ（notes_and_tips, recipe_id あり）の追加・表示・削除

async function renderEditNoteList() {
  const listDiv = document.getElementById('editNoteList');
  if (!editId) {
    listDiv.innerHTML = '<p style="font-size:11px;color:#999">新規作成時は保存後にメモを追加できます。</p>';
    return;
  }
  listDiv.innerHTML = '<p style="font-size:11px;color:#999">読み込み中...</p>';
  const { data: notes } = await window.supabase
    .from('notes_and_tips').select('*').eq('recipe_id', editId);
  if (!notes || !notes.length) {
    listDiv.innerHTML = '<p style="font-size:11px;color:#999">登録されたメモはありません。</p>';
    return;
  }
  listDiv.innerHTML = notes.map(n => `
    <div style="font-size:12px;border-bottom:1px solid #eee;padding:5px 0;
                display:flex;justify-content:space-between;align-items:center">
      <span><strong>${esc(n.title)}</strong></span>
      <button onclick="deleteNote('${n.id}')"
        style="background:none;border:none;color:#D4537E;cursor:pointer;font-size:11px">削除</button>
    </div>`).join('');
}

async function addNote() {
  const title   = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if (!editId)        { alert('先にレシピ本体を保存してください'); return; }
  if (!title || !content) { alert('タイトルと内容を入力してください'); return; }
  const { error } = await window.supabase
    .from('notes_and_tips').insert({ recipe_id: editId, title, content, category: 'recipe' });
  if (error) { alert('メモの保存に失敗しました'); return; }
  document.getElementById('noteTitle').value   = '';
  document.getElementById('noteContent').value = '';
  renderEditNoteList();
}

async function deleteNote(noteId) {
  if (!confirm('このメモを削除しますか？')) return;
  const { error } = await window.supabase.from('notes_and_tips').delete().eq('id', noteId);
  if (error) alert('削除に失敗しました');
  else renderEditNoteList();
}
