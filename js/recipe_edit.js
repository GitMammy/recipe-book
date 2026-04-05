// ===== recipe_edit.js =====
//　260405　1448

// レシピ追加/編集フォーム・材料UI・写真UI・TXTインポート

// ----- 写真 UI -----
function handlePhotoAdd(input) {
  const file = input.files[0];
  if (!file) return;
  resizeImageFile(file).then(data => {
    pendingPhotos.push({ title: '', data });
    renderPhotoList();
  });
  input.value = '';
}

function renderPhotoList() {
  const list = document.getElementById('photoList');
  list.innerHTML = '';
  pendingPhotos.forEach((photo, i) => {
    const item = document.createElement('div');
    item.className = 'photo-item';

    const img = document.createElement('img');
    img.className = 'photo-thumb';
    img.src = photo.data;

    const ti = document.createElement('input');
    ti.type = 'text'; ti.className = 'photo-title-input';
    ti.placeholder = 'タイトル（例：完成品、断面）';
    ti.value = photo.title || '';
    ti.oninput = () => { pendingPhotos[i].title = ti.value; };

    const cl = document.createElement('label');
    cl.className = 'photo-cover-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!photo.cover;
    cb.onchange = () => {
      pendingPhotos.forEach(p => p.cover = false);
      pendingPhotos[i].cover = cb.checked;
      renderPhotoList();
    };
    cl.appendChild(cb);
    cl.appendChild(document.createTextNode('一覧用'));

    const db = document.createElement('button');
    db.className = 'btn-del-photo'; db.textContent = '✕';
    db.onclick = () => { pendingPhotos.splice(i, 1); renderPhotoList(); };

    item.appendChild(img); item.appendChild(ti);
    item.appendChild(cl); item.appendChild(db);
    list.appendChild(item);
  });
}

// ----- 材料 UI -----
function makePartEl(label, rows, showHeader) {
  const div = document.createElement('div');
  div.className = 'ing-part';
  div.setAttribute('draggable', 'true');

  const header = document.createElement('div');
  header.className = 'ing-part-header';
  if (!showHeader) header.style.display = 'none';

  const handle = document.createElement('span');
  handle.className = 'drag-handle'; handle.title = 'ドラッグで並び替え'; handle.textContent = '⠿';

  const lw = document.createElement('span'); lw.className = 'ing-part-label-wrap';
  const ls = document.createElement('span');
  ls.style.cssText = 'font-size:11px;color:#993556;flex-shrink:0'; ls.textContent = 'パート名：';
  const ni = document.createElement('input');
  ni.type = 'text'; ni.className = 'ing-part-name';
  ni.placeholder = '例：生地、フィリング（省略可）'; ni.value = label || '';

  // パート番号ラベル（パート名欄の値をリアルタイム反映）
  const partNumLabel = document.createElement('span');
  partNumLabel.style.cssText = 'font-size:11px;color:#aaa;margin-left:4px;flex-shrink:0';
  const updatePartNum = () => {
    const parts = [...document.querySelectorAll('#ingParts .ing-part')];
    const idx = parts.indexOf(div);
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[idx] || String(idx + 1);
    partNumLabel.textContent = ni.value.trim() ? '' : `（${alpha}）`;
  };
  ni.addEventListener('input', updatePartNum);
  setTimeout(updatePartNum, 50);

  lw.appendChild(ls); lw.appendChild(ni); lw.appendChild(partNumLabel);

  const db = document.createElement('button');
  db.className = 'btn-del-part'; db.title = 'このパートを削除'; db.textContent = '✕';
  db.onclick = () => removePart(db);

  header.appendChild(handle); header.appendChild(lw); header.appendChild(db);

  const table = document.createElement('table');
  table.className = 'ing-table';
  table.innerHTML = '<thead><tr><th class="col-name">材料名</th><th class="col-amt">分量</th>' +
    '<th class="col-note">備考</th><th class="col-move"></th><th class="col-del"></th></tr></thead>';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const ab = document.createElement('button');
  ab.className = 'btn-add-row'; ab.style.fontSize = '11px'; ab.textContent = '+ 行を追加';
  ab.onclick = () => addRowToTbody(tbody, '', '', '');

  div.appendChild(header); div.appendChild(table); div.appendChild(ab);
  (rows && rows.length ? rows : [{ name: '', amt: '', note: '' }])
    .forEach(r => addRowToTbody(tbody, r.name, r.amt, r.note));

  setupPartDrag(div);
  return div;
}

function setupPartDrag(el) {
  el.addEventListener('dragstart', e => {
    dragSrc = el;
    setTimeout(() => el.style.opacity = '0.4', 0);
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend', () => {
    el.style.opacity = '';
    document.querySelectorAll('#ingParts .ing-part').forEach(p => p.classList.remove('drag-over'));
  });
  el.addEventListener('dragover', e => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    if (el !== dragSrc) el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('drag-over');
    if (!dragSrc || dragSrc === el) return;
    const parts = [...document.getElementById('ingParts').querySelectorAll('.ing-part')];
    if (parts.indexOf(dragSrc) < parts.indexOf(el)) el.parentNode.insertBefore(dragSrc, el.nextSibling);
    else el.parentNode.insertBefore(dragSrc, el);
  });
}

function removePart(btn) {
  const container = document.getElementById('ingParts');
  if (container.querySelectorAll('.ing-part').length <= 1) { alert('最低1つのパートが必要です'); return; }
  if (!confirm('このパートを削除しますか？')) return;
  btn.closest('.ing-part').remove();
}

function addRowToTbody(tbody, name, amt, note) {
  const tr = document.createElement('tr');

  const mkTd = (cls) => { const td = document.createElement('td'); td.className = cls; return td; };
  const mkInput = (ph, val) => {
    const i = document.createElement('input'); i.type = 'text'; i.placeholder = ph; i.value = val || '';
    return i;
  };

  const tdN = mkTd('col-name');
  const iN = mkInput('例：薄力粉', name);
  iN.addEventListener('blur', () => {
    const m = recipes.find(r => r.name === iN.value.trim() && String(r.id) !== String(editId));
    iN.classList.toggle('ing-name-linked', !!m);
    iN.title = m ? `「${m.name}」のレシピにリンクされます` : '';
  });
  if (name) {
    const m = recipes.find(r => r.name === name && String(r.id) !== String(editId));
    if (m) { iN.classList.add('ing-name-linked'); iN.title = `「${m.name}」のレシピにリンクされます`; }
  }
  tdN.appendChild(iN);

  const tdA = mkTd('col-amt'); tdA.appendChild(mkInput('例：200g', amt));
  const tdNo = mkTd('col-note'); tdNo.appendChild(mkInput('備考', note));

  const tdM = mkTd('col-move'); tdM.style.cssText = 'padding:0 2px;vertical-align:middle';
  const bU = document.createElement('button'); bU.className = 'btn-move-row'; bU.textContent = '▲'; bU.title = '上へ';
  bU.onclick = () => { const prev = tr.previousElementSibling; if (prev) tbody.insertBefore(tr, prev); };
  const bD = document.createElement('button'); bD.className = 'btn-move-row'; bD.textContent = '▼'; bD.title = '下へ';
  bD.onclick = () => { const next = tr.nextElementSibling; if (next) tbody.insertBefore(next, tr); };
  tdM.appendChild(bU); tdM.appendChild(bD);

  const tdDel = mkTd('col-del');
  const bDel = document.createElement('button'); bDel.className = 'btn-del-row'; bDel.textContent = '✕';
  bDel.onclick = () => tr.remove();
  tdDel.appendChild(bDel);

  tr.appendChild(tdN); tr.appendChild(tdA); tr.appendChild(tdNo); tr.appendChild(tdM); tr.appendChild(tdDel);
  tbody.appendChild(tr);
}

function addRowToLastPart() {
  const parts = document.querySelectorAll('#ingParts .ing-part');
  if (!parts.length) { document.getElementById('ingParts').appendChild(makePartEl('', null, false)); return; }
  addRowToTbody(parts[parts.length - 1].querySelector('tbody'), '', '', '');
}

function addNewPart() {
  const container = document.getElementById('ingParts');
  container.querySelectorAll('.ing-part .ing-part-header').forEach(h => h.style.display = 'flex');
  container.appendChild(makePartEl('', null, true));
}

function getIngData() {
  const parts = [];
  document.querySelectorAll('#ingParts .ing-part').forEach(partEl => {
    const label = (partEl.querySelector('.ing-part-name') || {}).value?.trim() || '';
    const rows = [...partEl.querySelectorAll('tbody tr')].map(tr => {
      const ins = tr.querySelectorAll('input');
      return { name: ins[0].value.trim(), amt: ins[1].value.trim(), note: ins[2].value.trim() };
    }).filter(r => r.name || r.amt);
    if (rows.length) parts.push({ label, rows });
  });
  return parts;
}

function setIngData(ingParts, ingRows, ingDetail) {
  const container = document.getElementById('ingParts');
  container.innerHTML = '';
  if (ingParts && ingParts.length) {
    const hasLabels = ingParts.some(p => p && p.label);
    ingParts.forEach(p => container.appendChild(makePartEl(p.label || '', p.rows || [], hasLabels)));
  } else if (ingRows && ingRows.length) {
    container.appendChild(makePartEl('', ingRows, false));
  } else if (ingDetail) {
    const rows = ingDetail.split('\n').filter(Boolean).map(line => {
      const pts = line.split(/\s+/);
      return { name: pts[0] || '', amt: pts.slice(1).join(' ') || '', note: '' };
    });
    container.appendChild(makePartEl('', rows, false));
  } else {
    container.appendChild(makePartEl('', null, false));
  }
}

// ----- フォーム開閉 -----
function openAdd() {
  editId = null; pendingPhotos = [];
  document.getElementById('formTitle').textContent = 'レシピを追加';
  ['fName','fYield','fDesc','fCat','fGenre','fIngs','fUrl','fUrlLabel','fSteps','fMemo']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('fPub').checked = false;
  document.getElementById('btnDelete').style.display = 'none';
  renderPhotoList(); setIngData(null, null, null);
  const ov = document.getElementById('overlayAdd'); ov.scrollTop = 0;
  openOverlay('overlayAdd');
}

function openEdit(id) {
  closeOverlay('overlayDetail');
  const r = recipes.find(x => String(x.id) === String(id));
  if (!r) return;
  editId = r.id;
  document.getElementById('formTitle').textContent = 'レシピを編集';
  document.getElementById('fName').value     = r.name || '';
  document.getElementById('fYield').value    = r.yield_amount || '';
  document.getElementById('fDesc').value     = r.desc || '';
  document.getElementById('fCat').value      = r.cat || '';
  document.getElementById('fGenre').value    = r.genre || '';
  document.getElementById('fIngs').value     = (r.ings || []).join(', ');
  document.getElementById('fUrl').value      = r.url || '';
  document.getElementById('fUrlLabel').value = r.url_label || '';
  document.getElementById('fSteps').value    = r.steps || '';
  document.getElementById('fMemo').value     = r.memo || '';
  document.getElementById('fPub').checked    = !!r.pub;
  document.getElementById('btnDelete').style.display = '';
  document.getElementById('fCat').onfocus   = function(){ this.select(); };
  document.getElementById('fGenre').onfocus = function(){ this.select(); };

  pendingPhotos = (r.photos || []).map(p => ({ title: p.title || '', data: p.data || '', cover: !!p.cover }));
  if (!pendingPhotos.length && r.img) pendingPhotos = [{ title: '', data: r.img }];
  renderPhotoList();
  setIngData(r.ingParts || r.ing_parts, r.ingRows, r.ingDetail);
  renderEditNoteList();
  const ov = document.getElementById('overlayAdd'); ov.scrollTop = 0;
  openOverlay('overlayAdd');
}

// ----- 保存・削除 -----
async function saveRecipe() {
  const name = document.getElementById('fName').value.trim();
  if (!name) { alert('料理名を入力してください'); return; }
  const saveBtn = document.querySelector('.modal-btns-right .btn-accent');
  const origText = saveBtn.textContent;
  saveBtn.disabled = true; saveBtn.textContent = '保存中...';
  try {
    let oldPhotoUrls = [];
    if (editId) {
      const old = recipes.find(r => String(r.id) === String(editId));
      if (old && old.photos)
        oldPhotoUrls = old.photos.map(p => p.data).filter(u => u && u.startsWith('http'));
    }
    const uploadedPhotos = await Promise.all(
      pendingPhotos.map(async p => ({ title: p.title || '', data: await uploadToStorage(p), cover: !!p.cover }))
    );
    const newUrls = uploadedPhotos.map(p => p.data);
    const toDelete = oldPhotoUrls.filter(u => !newUrls.includes(u));
    if (toDelete.length) await deleteStoragePhotos(toDelete);

    const ings = document.getElementById('fIngs').value.split(',').map(s => s.trim()).filter(Boolean);
    const currentDate = new Date().toISOString().slice(0, 10);
    const newId = editId || String(Date.now());

    const recipeData = {
      id: String(newId), name,
      desc: document.getElementById('fDesc').value,
      cat: document.getElementById('fCat').value,
      genre: document.getElementById('fGenre').value,
      ings, url: document.getElementById('fUrl').value,
      url_label: document.getElementById('fUrlLabel').value,
      yield_amount: document.getElementById('fYield').value.trim(),
      ing_parts: getIngData(),
      steps: document.getElementById('fSteps').value,
      memo: document.getElementById('fMemo').value,
      pub: document.getElementById('fPub').checked,
      photos: uploadedPhotos,
      fav: false, heart: false, crown: false, date: currentDate
    };
    if (editId) {
      const old = recipes.find(x => String(x.id) === String(editId));
      if (old) { recipeData.fav = !!old.fav; recipeData.heart = !!old.heart; recipeData.crown = !!old.crown; recipeData.date = old.date || currentDate; }
    }
    const { error } = await window.supabase.from('recipes').upsert(recipeData);
    if (error) throw error;

    if (editId) {
      const idx = recipes.findIndex(x => String(x.id) === String(editId));
      if (idx !== -1) recipes[idx] = recipeData;
    } else {
      recipes.unshift(recipeData);
    }
    alert('保存しました！');
    closeOverlay('overlayAdd');
    render();
  } catch (err) {
    alert('保存に失敗しました: ' + err.message);
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = origText;
  }
}

async function deleteRecipe() {
  if (!confirm('このレシピを削除しますか？')) return;
  try {
    const targetId = String(editId);
    const tr = recipes.find(r => String(r.id) === targetId);
    if (tr && tr.photos) {
      await deleteStoragePhotos(tr.photos.map(p => p.data).filter(u => u.startsWith('http')));
    }
    const { error } = await window.supabase.from('recipes').delete().eq('id', targetId);
    if (error) throw error;
    recipes = recipes.filter(r => String(r.id) !== targetId);
    alert('削除しました');
    closeOverlay('overlayAdd');
    render();
  } catch (err) {
    alert('削除に失敗しました: ' + err.message);
  }
}

// ----- TXT インポート -----
function openFromTextFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const parsed = parseRecipeText(e.target.result);
    if (!parsed.name) { alert('「料理名:」が見つかりませんでした。'); input.value = ''; return; }
    editId = null; pendingPhotos = [];
    document.getElementById('formTitle').textContent = 'レシピを追加（テキストから）';
    document.getElementById('fName').value    = parsed.name;
    document.getElementById('fYield').value   = parsed.yield_amount || '';
    document.getElementById('fDesc').value    = parsed.desc;
    document.getElementById('fCat').value     = parsed.cat;
    document.getElementById('fGenre').value   = parsed.genre;
    document.getElementById('fIngs').value    = parsed.ings;
    document.getElementById('fUrl').value     = parsed.url;
    document.getElementById('fUrlLabel').value = '';
    document.getElementById('fSteps').value   = parsed.steps;
    document.getElementById('fMemo').value    = parsed.memo;
    document.getElementById('fPub').checked   = parsed.pub;
    document.getElementById('btnDelete').style.display = 'none';
    renderPhotoList(); setIngData(parsed.ingParts, null, null);
    const ov = document.getElementById('overlayAdd'); ov.scrollTop = 0;
    openOverlay('overlayAdd'); input.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

function parseRecipeText(text) {
  const result = { name:'',desc:'',cat:'',genre:'',ings:'',url:'',steps:'',memo:'',pub:false,yield_amount:'',ingParts:[] };
  const lines = text.split(/\r?\n/);
  let mode = 'none', currentPartLabel = '', currentRows = [];
  const stepsLines = [], memoLines = [];

  const flushPart = () => {
    if (currentRows.length) { result.ingParts.push({ label: currentPartLabel, rows: currentRows }); currentRows = []; currentPartLabel = ''; }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^※/.test(line)) continue;
    if (/^#\s+/.test(line)) {
      const h = line.replace(/^#\s+/, '').trim();
      if (mode === 'ing') flushPart();
      if (/^パート名[:：]/.test(h)) { flushPart(); currentPartLabel = h.replace(/^パート名[:：]\s*/, '').trim(); continue; }
      const map = { '料理名':'name','カテゴリ':'cat','ジャンル':'genre','説明':'desc','食材タグ':'ings',
        'URL':'url','公開':'pub','手順':'steps','覚書':'memo','出来上がり量':'yield','材料':'ing' };
      mode = map[h] || 'none';
      if (mode === 'ing') currentPartLabel = '';
      continue;
    }
    if (line === '') { if (mode === 'steps') stepsLines.push(''); if (mode === 'memo') memoLines.push(''); continue; }
    if (mode === 'name')  { result.name = line; mode = 'none'; continue; }
    if (mode === 'cat')   { result.cat  = line; mode = 'none'; continue; }
    if (mode === 'genre') { result.genre = line; mode = 'none'; continue; }
    if (mode === 'desc')  { result.desc = line; mode = 'none'; continue; }
    if (mode === 'ings')  { result.ings = line; mode = 'none'; continue; }
    if (mode === 'url')   { result.url  = line; mode = 'none'; continue; }
    if (mode === 'pub')   { result.pub  = /^(はい|yes|true|1)$/i.test(line); mode = 'none'; continue; }
    if (mode === 'yield') { result.yield_amount = line; mode = 'none'; continue; }
    if (mode === 'ing')   { const c = line.split(/,|，/).map(s => s.trim()); currentRows.push({ name:c[0]||'',amt:c[1]||'',note:c[2]||'' }); continue; }
    if (mode === 'steps') { stepsLines.push(line); continue; }
    if (mode === 'memo')  { memoLines.push(line); continue; }
  }
  flushPart();
  result.steps = stepsLines.join('\n').trim();
  result.memo  = memoLines.join('\n').trim();
  return result;
}
