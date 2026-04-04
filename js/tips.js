// ===== tips.js =====
// 共通チップス管理（overlayCommonTips）・index画面tipsカード・tips編集モーダル

// ----- 共通チップス管理モーダル -----
function openCommonTipsManager() {
  pendingCommonTipPhoto = null;
  document.getElementById('commonTipPhotoPreview').innerHTML = '';
  renderCommonTipList();
  openOverlay('overlayCommonTips');
}

function handleCommonTipPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  resizeImageFile(file).then(data => {
    pendingCommonTipPhoto = data;
    document.getElementById('commonTipPhotoPreview').innerHTML =
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
         <img src="${data}" style="width:52px;height:40px;object-fit:cover;border-radius:5px;border:1px solid #ddd">
         <button type="button" onclick="clearCommonTipPhoto()"
           style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px">✕</button>
       </div>`;
  });
  input.value = '';
}

function clearCommonTipPhoto() {
  pendingCommonTipPhoto = null;
  document.getElementById('commonTipPhotoPreview').innerHTML = '';
}

async function renderCommonTipList() {
  const listDiv = document.getElementById('commonTipList');
  let { data: tips } = await window.supabase
    .from('notes_and_tips').select('*').is('recipe_id', null).order('created_at', { ascending: true });
  tips = tips || [];

  if (!isEditor) {
    tips = tips.filter(t => t.pub);
  } else {
    const p = document.getElementById('filterPub').value;
    if (p === '1') tips = tips.filter(t =>  t.pub);
    if (p === '0') tips = tips.filter(t => !t.pub);
  }

  if (!tips.length) { listDiv.innerHTML = '<p style="font-size:11px;color:#999;text-align:center">なし</p>'; return; }

  listDiv.innerHTML = tips.map(t => {
    const imgHtml = t.image_url
      ? `<img src="${t.image_url}" style="width:36px;height:36px;object-fit:cover;border-radius:5px;margin-right:6px;flex-shrink:0">`
      : '';
    return `
      <div style="font-size:12px;border-bottom:1px solid #eee;padding:8px 0;
                  display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center">
          ${imgHtml}
          <div>
            <strong>${esc(t.title)}</strong>
            <div style="font-size:11px;color:#666;margin-top:2px">
              ${esc(t.content.length > 40 ? t.content.slice(0, 40) + '…' : t.content)}
            </div>
          </div>
        </div>
        <button onclick="deleteCommonTip('${t.id}')"
          style="background:none;border:none;color:#638C3E;cursor:pointer;font-size:11px;flex-shrink:0;margin-left:8px">削除</button>
      </div>`;
  }).join('');
}

async function addCommonTip() {
  const title   = document.getElementById('commonTipTitle').value.trim();
  const content = document.getElementById('commonTipContent').value.trim();
  if (!title || !content) { alert('タイトルと内容を入力してください'); return; }
  const addBtn = document.getElementById('commonTipAddBtn');
  addBtn.disabled = true; addBtn.textContent = '追加中...';
  try {
    const imageUrl = pendingCommonTipPhoto ? await uploadToStorage({ data: pendingCommonTipPhoto }) : null;
    await window.supabase.from('notes_and_tips')
      .insert({ recipe_id: null, title, content, image_url: imageUrl, category: 'tips' });
    document.getElementById('commonTipTitle').value   = '';
    document.getElementById('commonTipContent').value = '';
    clearCommonTipPhoto();
    loadCommonTips();
  } catch (err) {
    alert('追加に失敗しました: ' + err.message);
  } finally {
    addBtn.disabled = false; addBtn.textContent = '共通チップスを追加';
  }
}

async function deleteCommonTip(id) {
  if (!confirm('削除しますか？')) return;
  const { data: tip } = await window.supabase.from('notes_and_tips').select('image_url').eq('id', id).single();
  if (tip && tip.image_url) await deleteStoragePhotos([tip.image_url]);
  await window.supabase.from('notes_and_tips').delete().eq('id', id);
  loadCommonTips();
}

// ----- index画面 tipsカード -----
async function renderTipsCards() {
  const area     = document.getElementById('tipsArea');
  const tipsGrid = document.getElementById('tipsGrid');
  if (!area || !tipsGrid) return;

  let { data: tips } = await window.supabase
    .from('notes_and_tips').select('*').is('recipe_id', null).order('created_at', { ascending: true });
  tips = (tips || []).filter(t => isEditor || t.pub);

  if (!tips.length) { area.style.display = 'none'; return; }
  area.style.display = 'block';

  tipsGrid.innerHTML = tips.map(t => {
    const imgHtml = t.image_url
      ? `<img src="${t.image_url}" style="width:100%;height:100px;object-fit:cover;display:block">`
      : `<div style="width:100%;height:60px;display:flex;align-items:center;justify-content:center;font-size:28px;background:#f5fbf2">💡</div>`;
    const pubBadge = isEditor
      ? `<span class="tag ${t.pub ? 't-pub' : 't-priv'}" style="font-size:10px">${t.pub ? '公開' : '非公開'}</span>` : '';
    const editBtn = isEditor
      ? `<button onclick="event.stopPropagation();openTipEdit('${t.id}')"
           style="font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;color:#555;margin-top:4px">
           ✏️ 編集</button>` : '';
    const preview = t.content
      ? `<div style="font-size:12px;color:#555;line-height:1.5;margin-top:4px">${esc(t.content.length > 60 ? t.content.slice(0, 60) + '…' : t.content)}</div>` : '';
    return `
      <div class="card" style="cursor:default">
        ${imgHtml}
        <div class="card-body">
          <div style="font-size:14px;font-weight:500;color:#1a1a1a;margin-bottom:4px">${esc(t.title)}</div>
          ${preview}
          <div style="margin-top:6px;display:flex;gap:4px;align-items:center;flex-wrap:wrap">${pubBadge}${editBtn}</div>
        </div>
      </div>`;
  }).join('');
}

// 両方まとめて再描画（他ファイルから呼ぶ共通関数）
function loadCommonTips() {
  renderCommonTipList();
  renderTipsCards();
}

// ----- tips 編集モーダル -----
async function openTipEdit(tipId) {
  const { data: t, error } = await window.supabase.from('notes_and_tips').select('*').eq('id', tipId).single();
  if (error || !t) { alert('チップスの読み込みに失敗しました'); return; }
  tipEditPendingPhoto  = null;
  tipEditPhotoCleared  = false;
  document.getElementById('tipEditId').value      = t.id;
  document.getElementById('tipEditTitle').value   = t.title || '';
  document.getElementById('tipEditContent').value = t.content || '';
  document.getElementById('tipEditPub').checked   = !!t.pub;

  const prev     = document.getElementById('tipEditPhotoPreview');
  const clearBtn = document.getElementById('tipEditPhotoClearBtn');
  if (t.image_url) {
    prev.innerHTML = `<img src="${t.image_url}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;border:1px solid #ddd">`;
    clearBtn.style.display = 'inline'; clearBtn.textContent = '写真を削除';
  } else {
    prev.innerHTML = ''; clearBtn.style.display = 'none';
  }
  openOverlay('overlayTipEdit');
}

function handleTipEditPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  resizeImageFile(file).then(data => {
    tipEditPendingPhoto = data; tipEditPhotoCleared = false;
    document.getElementById('tipEditPhotoPreview').innerHTML =
      `<img src="${data}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;border:1px solid #ddd">`;
    const cb = document.getElementById('tipEditPhotoClearBtn');
    cb.style.display = 'inline'; cb.textContent = '選択をキャンセル';
  });
  input.value = '';
}

function clearTipEditPhoto() {
  tipEditPendingPhoto = null; tipEditPhotoCleared = true;
  document.getElementById('tipEditPhotoPreview').innerHTML = '<p style="font-size:11px;color:#aaa;margin:0">写真なし</p>';
  document.getElementById('tipEditPhotoClearBtn').style.display = 'none';
}

async function saveTipEdit() {
  const id      = document.getElementById('tipEditId').value;
  const title   = document.getElementById('tipEditTitle').value.trim();
  const content = document.getElementById('tipEditContent').value.trim();
  const pub     = document.getElementById('tipEditPub').checked;
  const updateData = { title, content, pub };
  if      (tipEditPhotoCleared)   updateData.image_url = null;
  else if (tipEditPendingPhoto)   updateData.image_url = tipEditPendingPhoto;
  await window.supabase.from('notes_and_tips').update(updateData).eq('id', id);
  closeOverlay('overlayTipEdit');
  loadCommonTips();
}

async function deleteTipFromEdit() {
  if (!confirm('このチップスを削除しますか？')) return;
  const tipId = document.getElementById('tipEditId').value;
  const { data: tip } = await window.supabase.from('notes_and_tips').select('image_url').eq('id', tipId).single();
  if (tip && tip.image_url) await deleteStoragePhotos([tip.image_url]);
  await window.supabase.from('notes_and_tips').delete().eq('id', tipId);
  closeOverlay('overlayTipEdit');
  loadCommonTips();
}
