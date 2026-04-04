// ===== tips.js =====
// 260404 1752
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

// image_urlカラムにJSONまたは単一URLが混在する場合に対応して配列を返す
function parseTipPhotos(t) {
  if (!t || !t.image_url) return [];
  try {
    const parsed = JSON.parse(t.image_url);
    if (Array.isArray(parsed)) return parsed;
    return [t.image_url]; // 古い単一URL形式
  } catch {
    return [t.image_url]; // 単一URL文字列
  }
}
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
    const pubBadge = isEditor
      ? `<span class="tag ${t.pub ? 't-pub' : 't-priv'}" style="font-size:10px">${t.pub ? '公開' : '非公開'}</span>` : '';
    const preview = t.content
      ? `<div style="font-size:12px;color:#555;line-height:1.5;margin-top:4px">${esc(t.content.length > 60 ? t.content.slice(0, 60) + '…' : t.content)}</div>` : '';
    return `
      <div class="card card-tips" style="cursor:pointer" onclick="openTipDetail('${t.id}')">
        <div class="card-body">
          <div style="font-size:14px;font-weight:500;color:#1a1a1a;margin-bottom:4px">${esc(t.title)}</div>
          ${preview}
          ${pubBadge ? `<div style="margin-top:6px">${pubBadge}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ----- Tips 詳細モーダル -----
async function openTipDetail(tipId) {
  const { data: t, error } = await window.supabase.from('notes_and_tips').select('*').eq('id', tipId).single();
  if (error || !t) return;

  const photos = parseTipPhotos(t);
  const photosHtml = photos.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
        ${photos.map((url, i) => `<img src="${url}" onclick="openTipLightbox(${i})" style="width:100px;height:78px;object-fit:cover;border-radius:8px;border:1px solid #ddd;cursor:pointer">`).join('')}
       </div>`
    : '';
  currentTipPhotos = photos;

  const pubBadge = isEditor
    ? `<span class="tag ${t.pub ? 't-pub' : 't-priv'}" style="font-size:10px;margin-left:6px">${t.pub ? '公開' : '非公開'}</span>` : '';
  const editBtn = isEditor
    ? `<button class="btn btn-sm btn-accent" onclick="closeOverlay('overlayTipDetail');openTipEdit('${t.id}')">編集</button>` : '';

  document.getElementById('tipDetailContent').innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:18px;font-weight:600;margin-bottom:4px">💡 ${esc(t.title)}${pubBadge}</div>
      <div style="white-space:pre-wrap;font-size:13px;line-height:1.8;color:#333">${esc(t.content)}</div>
      ${photosHtml}
    </div>
    <div class="modal-btns"><div></div><div class="modal-btns-right">
      <button class="btn btn-sm" onclick="closeOverlay('overlayTipDetail')">閉じる</button>
      ${editBtn}
    </div></div>`;
  openOverlay('overlayTipDetail');
}

let currentTipPhotos = [];
function openTipLightbox(idx) {
  const url = currentTipPhotos[idx];
  if (!url) return;
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightboxCaption').textContent = '';
  document.getElementById('lightbox').classList.add('open');
}

// 両方まとめて再描画（他ファイルから呼ぶ共通関数）
function loadCommonTips() {
  renderCommonTipList();
  renderTipsCards();
}

// ----- tips 編集モーダル -----
let tipEditPendingPhotos = []; // 複数枚管理

async function openTipEdit(tipId) {
  const { data: t, error } = await window.supabase.from('notes_and_tips').select('*').eq('id', tipId).single();
  if (error || !t) { alert('チップスの読み込みに失敗しました'); return; }

  document.getElementById('tipEditId').value      = t.id;
  document.getElementById('tipEditTitle').value   = t.title || '';
  document.getElementById('tipEditContent').value = t.content || '';
  document.getElementById('tipEditPub').checked   = !!t.pub;

  // 既存写真を配列で読み込み
  const existingUrls = parseTipPhotos(t);
  tipEditPendingPhotos = existingUrls.map(url => ({ data: url, isNew: false }));
  renderTipEditPhotoList();
  openOverlay('overlayTipEdit');
}

function renderTipEditPhotoList() {
  const list = document.getElementById('tipEditPhotoList');
  if (!list) return;
  list.innerHTML = '';
  tipEditPendingPhotos.forEach((photo, i) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block';
    const img = document.createElement('img');
    img.src = photo.data;
    img.style.cssText = 'width:80px;height:62px;object-fit:cover;border-radius:6px;border:1px solid #ddd;display:block';
    const del = document.createElement('button');
    del.textContent = '✕';
    del.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#D4537E;color:#fff;border:none;border-radius:999px;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0';
    del.onclick = () => { tipEditPendingPhotos.splice(i, 1); renderTipEditPhotoList(); };
    wrap.appendChild(img); wrap.appendChild(del);
    list.appendChild(wrap);
  });
}

function handleTipEditPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  resizeImageFile(file).then(data => {
    tipEditPendingPhotos.push({ data, isNew: true });
    renderTipEditPhotoList();
  });
  input.value = '';
}

// 旧関数（互換性のため残す）
function clearTipEditPhoto() {}

async function saveTipEdit() {
  const id      = document.getElementById('tipEditId').value;
  const title   = document.getElementById('tipEditTitle').value.trim();
  const content = document.getElementById('tipEditContent').value.trim();
  const pub     = document.getElementById('tipEditPub').checked;

  const saveBtn = document.getElementById('tipEditSaveBtn');
  saveBtn.disabled = true; saveBtn.textContent = '保存中...';
  try {
    // 新しい画像をアップロード
    const uploadedUrls = await Promise.all(tipEditPendingPhotos.map(async p => {
      if (!p.isNew) return p.data; // 既存URLはそのまま
      return await uploadToStorage({ data: p.data });
    }));
    const updateData = {
      title, content, pub,
      image_url: uploadedUrls.length > 0
        ? (uploadedUrls.length === 1 ? uploadedUrls[0] : JSON.stringify(uploadedUrls))
        : null
    };
    await window.supabase.from('notes_and_tips').update(updateData).eq('id', id);
    closeOverlay('overlayTipEdit');
    loadCommonTips();
  } catch (err) {
    alert('保存に失敗しました: ' + err.message);
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = '保存';
  }
}

async function deleteTipFromEdit() {
  if (!confirm('このチップスを削除しますか？')) return;
  const tipId = document.getElementById('tipEditId').value;
  const { data: tip } = await window.supabase.from('notes_and_tips').select('image_url').eq('id', tipId).single();
  if (tip) {
    const urls = parseTipPhotos(tip);
    if (urls.length) await deleteStoragePhotos(urls);
  }
  await window.supabase.from('notes_and_tips').delete().eq('id', tipId);
  closeOverlay('overlayTipEdit');
  loadCommonTips();
}
