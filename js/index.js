// js/index.js
//             260403　1640
// ===== Supabase クライアントの初期化 =====
(function () {
  // SDK が読み込まれているか確認
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('Supabase SDK が読み込まれていません。script タグの順番を確認してください。');
    return;
  }

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.SUPABASE_KEY;

  // createClient を安全に呼び出す
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.supabase =  client;   // ← ← ← ここが抜けていた！
})();


// ===== グローバル状態 =====
let recipes = [];
let isEditor = false;      // URL の key= で判定
let SECRET_KEY = 'sakuramoti'; 
let pendingPhotos = [];
let editId = null;
let dragSrc = null;
let tipEditPendingPhoto = null;
let tipEditPhotoCleared = false;
let currentPhotos = [];
let pendingCommonTipPhoto = null;

// ===== ユーティリティ =====
function esc(str){
  if(str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function markdownToHtml(md){
  if(!md) return '';
  // 必要なら簡易 Markdown 変換（ここではプレーンテキスト扱い）
  return esc(md).replace(/\n/g,'<br>');
}

function getCatEmoji(cat){
  if(!cat) return '🍰';
  if(cat.indexOf('焼き菓子')>=0) return '🍪';
  if(cat.indexOf('おやつ')>=0) return '🥞';
  if(cat.indexOf('パート')>=0) return '🥣';
  if(cat.indexOf('ヘルシー？')>=0) return '🌿';
  if(cat.indexOf('揚げ菓子')>=0) return '🍩';
  if(cat.indexOf('パン')>=0) return '🥐';
  if(cat.indexOf('冷菓')>=0) return '🍮';
  if(cat.indexOf('氷菓')>=0) return '🍧';
  if(cat.indexOf('飲み')>=0) return '🥤';
  return '🍰';
}

function isEditMode(){
  // DOMContentLoaded前でも安全に動くよう URL から直接確認
  if(isEditor) return true;
  const key = new URLSearchParams(location.search).get('key');
  return key === SECRET_KEY;
}

// ===== レシピ一覧の描画 =====
function getThumb(r){
  if(r.photos && r.photos.length){
    const cover = r.photos.find(p => p.cover);
    return (cover || r.photos[0]).data;
  }
  if(r.img) return r.img;
  return null;
}

function getRelatedRecipes(r){
  if(!r || !r.ings || !r.ings.length) return [];
  const set = new Set(r.ings);
  return recipes.filter(x => x.id !== r.id && x.ings && x.ings.some(i => set.has(i))).slice(0,6);
}

function render(){
  const grid = document.getElementById('grid');
  if(!grid) return;

  const q = document.getElementById('search').value.trim().toLowerCase();
  const cat = document.getElementById('filterCat').value;
  const p = document.getElementById('filterPub').value;

  let list = recipes.slice();

  if(q){
    list = list.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.desc && r.desc.toLowerCase().includes(q)) ||
      (r.ings && r.ings.join(',').toLowerCase().includes(q))
    );
  }
  if(cat){
    list = list.filter(r => r.cat === cat);
  }
  if(p === '1'){
    list = list.filter(r => r.pub);
  } else if(p === '0'){
    list = list.filter(r => !r.pub);
  }

  document.getElementById('countBar').textContent = list.length + ' 件';

  grid.innerHTML = list.map(r => {
    const thumb = getThumb(r);
    const emoji = getCatEmoji(r.cat);
    const editorNow = isEditMode();
    const heartsHtml = editorNow
      ? `<div class="hearts">
           <button class="heart-btn${r.heart?' on':''}" onclick="toggleHeart(event,'${r.id}')">♡</button>
           <button class="star-btn${r.fav?' on':''}" onclick="toggleStar(event,'${r.id}')">★</button>
           <button class="crown-btn${r.crown?' on':''}" onclick="toggleCrown(event,'${r.id}')">♚</button>
         </div>`
      : `<div class="hearts">
           <span style="color:${r.heart?'#D4537E':'#ccc'}">♡</span>
           <span style="color:${r.fav?'#BA7517':'#ccc'}">★</span>
           <span style="color:${r.crown?'#FFD700':'#ccc'}">♚</span>
         </div>`;

    return `
      <div class="card" onclick="openDetail('${r.id}')">
        ${thumb
          ? `<img src="${thumb}" class="card-img">`
          : `<div class="card-img-placeholder">${emoji}</div>`}
        <div class="card-body">
          <div class="card-top">
            <div class="card-title">${esc(r.name)}</div>
            ${heartsHtml}
          </div>
          ${r.desc ? `<div class="card-desc">${esc(r.desc)}</div>` : ''}
          <div class="card-tags">
            ${r.cat ? `<span class="tag t-cat">${esc(r.cat)}</span>` : ''}
            ${r.genre ? `<span class="tag t-ing">${esc(r.genre)}</span>` : ''}
            ${editorNow
              ? `<span class="tag ${r.pub?'t-pub':'t-priv'}">${r.pub?'公開':'非公開'}</span>`
              : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function updateSelects(){
  const cats = [];
  recipes.forEach(r => {
    if(r.cat && cats.indexOf(r.cat) < 0) cats.push(r.cat);
  });
  const sc = document.getElementById('filterCat');
  const cv = sc.value;
  sc.innerHTML = '<option value="">カテゴリ：すべて</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sc.value = cv;
}

// ===== ♡★♚ =====
function toggleHeart(e,id){
  e.preventDefault();
  e.stopPropagation();
  if(!isEditMode()) return;
  const r = recipes.find(x => String(x.id) === String(id));
  if(r){
    r.heart = !r.heart;
    saveStatus(r.id, r.heart, r.fav, r.crown);
    render();
  }
}
function toggleStar(e,id){
  e.preventDefault();
  e.stopPropagation();
  if(!isEditMode()) return;
  const r = recipes.find(x => String(x.id) === String(id));
  if(r){
    r.fav = !r.fav;
    saveStatus(r.id, r.heart, r.fav, r.crown);
    render();
  }
}
function toggleCrown(e,id){
  e.preventDefault();
  e.stopPropagation();
  if(!isEditMode()) return;
  const r = recipes.find(x => String(x.id) === String(id));
  if(r){
    if(r.crown === undefined) r.crown = false;
    r.crown = !r.crown;
    saveStatus(r.id, r.heart, r.fav, r.crown);
    render();
  }
}

// ===== 写真追加（編集モーダル）=====
function handlePhotoAdd(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const MAX = 1200;
      let w = img.width, h = img.height;
      const scale = (w>MAX || h>MAX) ? MAX/Math.max(w,h) : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w*scale);
      canvas.height = Math.round(h*scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      pendingPhotos.push({title:'',data:canvas.toDataURL('image/webp',0.85)});
      renderPhotoList();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function renderPhotoList(){
  const list = document.getElementById('photoList');
  list.innerHTML = '';
  pendingPhotos.forEach((photo,i) => {
    const item = document.createElement('div');
    item.className = 'photo-item';

    const img = document.createElement('img');
    img.className = 'photo-thumb';
    img.src = photo.data;

    const ti = document.createElement('input');
    ti.type = 'text';
    ti.className = 'photo-title-input';
    ti.placeholder = 'タイトル（例：完成品、断面）';
    ti.value = photo.title || '';
    ti.oninput = function(){ pendingPhotos[i].title = this.value; };

    const cl = document.createElement('label');
    cl.className = 'photo-cover-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!photo.cover;
    cb.onchange = function(){
      pendingPhotos.forEach(p => p.cover = false);
      pendingPhotos[i].cover = this.checked;
      renderPhotoList();
    };
    cl.appendChild(cb);
    cl.appendChild(document.createTextNode('一覧用'));

    const db = document.createElement('button');
    db.className = 'btn-del-photo';
    db.textContent = '✕';
    db.onclick = function(){
      pendingPhotos.splice(i,1);
      renderPhotoList();
    };

    item.appendChild(img);
    item.appendChild(ti);
    item.appendChild(cl);
    item.appendChild(db);
    list.appendChild(item);
  });
}

// ===== 材料編集 UI =====
function makePartEl(label,rows,showHeader){
  const div = document.createElement('div');
  div.className = 'ing-part';
  div.setAttribute('draggable','true');

  const header = document.createElement('div');
  header.className = 'ing-part-header';
  if(!showHeader) header.style.display = 'none';

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.title = 'ドラッグで並び替え';
  handle.textContent = '⠿';

  const lw = document.createElement('span');
  lw.className = 'ing-part-label-wrap';
  const ls = document.createElement('span');
  ls.style.cssText = 'font-size:11px;color:#993556;flex-shrink:0';
  ls.textContent = 'パート名：';
  const ni = document.createElement('input');
  ni.type = 'text';
  ni.className = 'ing-part-name';
  ni.placeholder = '例：生地、フィリング（省略可）';
  ni.value = label || '';
  lw.appendChild(ls);
  lw.appendChild(ni);

  const db = document.createElement('button');
  db.className = 'btn-del-part';
  db.title = 'このパートを削除';
  db.textContent = '✕';
  db.onclick = function(){ removePart(db); };

  header.appendChild(handle);
  header.appendChild(lw);
  header.appendChild(db);

  const table = document.createElement('table');
  table.className = 'ing-table';
  table.innerHTML =
    '<thead><tr>' +
    '<th class="col-name">材料名</th>' +
    '<th class="col-amt">分量</th>' +
    '<th class="col-note">備考</th>' +
    '<th class="col-move"></th>' +
    '<th class="col-del"></th>' +
    '</tr></thead>';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  const ab = document.createElement('button');
  ab.className = 'btn-add-row';
  ab.style.fontSize = '11px';
  ab.textContent = '+ 行を追加';
  ab.onclick = function(){ addRowToTbody(tbody,'','',''); };

  div.appendChild(header);
  div.appendChild(table);
  div.appendChild(ab);

  const rowData = rows && rows.length ? rows : [{name:'',amt:'',note:''}];
  rowData.forEach(r => addRowToTbody(tbody,r.name,r.amt,r.note));

  setupPartDrag(div);
  return div;
}

function setupPartDrag(el){
  el.addEventListener('dragstart',function(e){
    dragSrc = el;
    setTimeout(() => { el.style.opacity = '0.4'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend',function(){
    el.style.opacity = '';
    document.querySelectorAll('#ingParts .ing-part').forEach(p => p.classList.remove('drag-over'));
  });
  el.addEventListener('dragover',function(e){
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if(el !== dragSrc) el.classList.add('drag-over');
  });
  el.addEventListener('dragleave',function(){
    el.classList.remove('drag-over');
  });
  el.addEventListener('drop',function(e){
    e.preventDefault();
    el.classList.remove('drag-over');
    if(!dragSrc || dragSrc === el) return;
    const parts = Array.prototype.slice.call(document.getElementById('ingParts').querySelectorAll('.ing-part'));
    const si = parts.indexOf(dragSrc);
    const ti = parts.indexOf(el);
    if(si < ti) el.parentNode.insertBefore(dragSrc, el.nextSibling);
    else el.parentNode.insertBefore(dragSrc, el);
  });
}

function removePart(btn){
  const part = btn.closest('.ing-part');
  const container = document.getElementById('ingParts');
  if(container.querySelectorAll('.ing-part').length <= 1){
    alert('最低1つのパートが必要です');
    return;
  }
  if(!confirm('このパートを削除しますか？')) return;
  part.remove();
}

function addRowToTbody(tbody,name,amt,note){
  const tr = document.createElement('tr');

  const tdN = document.createElement('td');
  tdN.className = 'col-name';
  const iN = document.createElement('input');
  iN.type = 'text';
  iN.placeholder = '例：薄力粉';
  iN.value = name || '';
  iN.addEventListener('blur',function(){
    const m = recipes.find(r => r.name === iN.value.trim() && String(r.id) !== String(editId));
    iN.classList.toggle('ing-name-linked', !!m);
    iN.title = m ? '「'+m.name+'」のレシピにリンクされます' : '';
  });
  if(name){
    const m = recipes.find(r => r.name === name && String(r.id) !== String(editId));
    if(m){
      iN.classList.add('ing-name-linked');
      iN.title = '「'+m.name+'」のレシピにリンクされます';
    }
  }
  tdN.appendChild(iN);

  const tdA = document.createElement('td');
  tdA.className = 'col-amt';
  const iA = document.createElement('input');
  iA.type = 'text';
  iA.placeholder = '例：200g';
  iA.value = amt || '';
  tdA.appendChild(iA);

  const tdNo = document.createElement('td');
  tdNo.className = 'col-note';
  const iNo = document.createElement('input');
  iNo.type = 'text';
  iNo.placeholder = '備考';
  iNo.value = note || '';
  tdNo.appendChild(iNo);

  const tdM = document.createElement('td');
  tdM.className = 'col-move';
  tdM.style.cssText = 'padding:0 2px;vertical-align:middle';
  const bU = document.createElement('button');
  bU.className = 'btn-move-row';
  bU.textContent = '▲';
  bU.title = '上へ';
  bU.onclick = function(){
    const prev = tr.previousElementSibling;
    if(prev) tbody.insertBefore(tr, prev);
  };
  const bD2 = document.createElement('button');
  bD2.className = 'btn-move-row';
  bD2.textContent = '▼';
  bD2.title = '下へ';
  bD2.onclick = function(){
    const next = tr.nextElementSibling;
    if(next) tbody.insertBefore(next, tr);
  };
  tdM.appendChild(bU);
  tdM.appendChild(bD2);

  const tdD = document.createElement('td');
  tdD.className = 'col-del';
  const bD = document.createElement('button');
  bD.className = 'btn-del-row';
  bD.textContent = '✕';
  bD.onclick = function(){ tr.remove(); };
  tdD.appendChild(bD);

  tr.appendChild(tdN);
  tr.appendChild(tdA);
  tr.appendChild(tdNo);
  tr.appendChild(tdM);
  tr.appendChild(tdD);
  tbody.appendChild(tr);
}

function addRowToLastPart(){
  const parts = document.querySelectorAll('#ingParts .ing-part');
  if(!parts.length){
    document.getElementById('ingParts').appendChild(makePartEl('',null,false));
    return;
  }
  addRowToTbody(parts[parts.length-1].querySelector('tbody'),'','','');
}

function addNewPart(){
  const container = document.getElementById('ingParts');
  container.querySelectorAll('.ing-part .ing-part-header').forEach(h => h.style.display = 'flex');
  container.appendChild(makePartEl('',null,true));
}

function getIngData(){
  const parts = [];
  document.querySelectorAll('#ingParts .ing-part').forEach(partEl => {
    const ni = partEl.querySelector('.ing-part-name');
    const label = ni ? ni.value.trim() : '';
    const rows = Array.prototype.slice.call(partEl.querySelectorAll('tbody tr'))
      .map(tr => {
        const ins = tr.querySelectorAll('input');
        return {
          name: ins[0].value.trim(),
          amt: ins[1].value.trim(),
          note: ins[2].value.trim()
        };
      })
      .filter(r => r.name || r.amt);
    if(rows.length) parts.push({label,rows});
  });
  return parts;
}

function setIngData(ingParts, ingRows, ingDetail){
  const container = document.getElementById('ingParts');
  container.innerHTML = '';

  if(ingParts && ingParts.length > 0){
    const hasLabels = ingParts.some(p => p && p.label);
    ingParts.forEach(p => {
      container.appendChild(makePartEl(p.label || '', p.rows || [], hasLabels));
    });
  } else if(ingRows && ingRows.length > 0){
    container.appendChild(makePartEl('', ingRows, false));
  } else if(ingDetail){
    const rows = ingDetail.split('\n').filter(Boolean).map(line => {
      const pts = line.split(/\s+/);
      return { name: pts[0] || '', amt: pts.slice(1).join(' ') || '', note: '' };
    });
    container.appendChild(makePartEl('', rows, false));
  } else {
    container.appendChild(makePartEl('', null, false));
  }
}

// ===== レシピ追加・編集 =====
function openAdd(){
  editId = null;
  pendingPhotos = [];
  document.getElementById('formTitle').textContent = 'レシピを追加';
  ['fName','fYield','fDesc','fCat','fGenre','fIngs','fUrl','fUrlLabel','fSteps','fMemo'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fPub').checked = false;
  document.getElementById('btnDelete').style.display = 'none';
  renderPhotoList();
  setIngData(null,null,null);
  const ov = document.getElementById('overlayAdd');
  ov.scrollTop = 0;
  openOverlay('overlayAdd');
}

function openEdit(id){
  closeOverlay('overlayDetail');
  const r = recipes.find(x => String(x.id) === String(id));
  if(!r){
    console.error('Edit target not found for ID:', id);
    return;
  }
  editId = r.id;
  document.getElementById('formTitle').textContent = 'レシピを編集';
  document.getElementById('fName').value = r.name || '';
  document.getElementById('fYield').value = r.yield_amount || '';
  document.getElementById('fDesc').value = r.desc || '';
  document.getElementById('fCat').value = r.cat || '';
  document.getElementById('fGenre').value = r.genre || '';
  document.getElementById('fCat').onfocus = function(){ this.select(); };
  document.getElementById('fGenre').onfocus = function(){ this.select(); };
  document.getElementById('fIngs').value = (r.ings || []).join(', ');
  document.getElementById('fUrl').value = r.url || '';
  document.getElementById('fUrlLabel').value = r.url_label || '';
  document.getElementById('fSteps').value = r.steps || '';
  document.getElementById('fMemo').value = r.memo || '';
  document.getElementById('fPub').checked = !!r.pub;
  document.getElementById('btnDelete').style.display = '';

  pendingPhotos = (r.photos || []).map(p => ({
    title: p.title || '',
    data: p.data || '',
    cover: !!p.cover
  }));
  if(!pendingPhotos.length && r.img){
    pendingPhotos = [{title:'',data:r.img}];
  }
  renderPhotoList();
  setIngData(r.ingParts || r.ing_parts, r.ingRows, r.ingDetail);
  renderEditNoteList();

  const ov = document.getElementById('overlayAdd');
  ov.scrollTop = 0;
  openOverlay('overlayAdd');
}

function base64ToBlob(base64){
  const parts = base64.split(';base64,');
  const raw = window.atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;++i) uInt8Array[i] = raw.charCodeAt(i);
  return new Blob([uInt8Array], {type:'image/webp'});
}

async function uploadToStorage(photo){
  if(photo.data && photo.data.startsWith('http')) return photo.data;
  const blob = base64ToBlob(photo.data);
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(-5)}.webp`;
  const {error} = await window.supabase
    .storage
    .from('recipe-photos')
    .upload(fileName, blob, {contentType:'image/webp', upsert:true});
  if(error) throw error;
  const {data:{publicUrl}} = window.supabase
    .storage
    .from('recipe-photos')
    .getPublicUrl(fileName);
  return publicUrl;
}

async function deleteStoragePhotos(photoUrls){
  if(!photoUrls || photoUrls.length === 0) return;
  const fileNames = photoUrls.map(url => {
    const parts = url.split('/');
    return parts[parts.length-1];
  });
  const {error} = await window.supabase
    .storage
    .from('recipe-photos')
    .remove(fileNames);
  if(error) console.warn('Storage delete error:', error);
}

async function saveRecipe(){
  const name = document.getElementById('fName').value.trim();
  if(!name){
    alert('料理名を入力してください');
    return;
  }
  const saveBtn = document.querySelector('.modal-btns-right .btn-accent');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';
  try{
    let oldPhotoUrls = [];
    if(editId){
      const old = recipes.find(r => String(r.id) === String(editId));
      if(old && old.photos){
        oldPhotoUrls = old.photos
          .map(p => p.data)
          .filter(url => url && url.startsWith('http'));
      }
    }
    const uploadedPhotos = await Promise.all(
      pendingPhotos.map(async p => ({
        title: p.title || '',
        data: await uploadToStorage(p),
        cover: !!p.cover
      }))
    );
    const newUrls = uploadedPhotos.map(p => p.data);
    const urlsToDelete = oldPhotoUrls.filter(url => !newUrls.includes(url));
    if(urlsToDelete.length > 0) await deleteStoragePhotos(urlsToDelete);

    const ings = document.getElementById('fIngs').value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const ingParts = getIngData();
    const newId = editId || String(Date.now());
    const currentDate = new Date().toISOString().slice(0,10);

    const recipeData = {
      id: String(newId),
      name,
      desc: document.getElementById('fDesc').value,
      cat: document.getElementById('fCat').value,
      genre: document.getElementById('fGenre').value,
      ings,
      url: document.getElementById('fUrl').value,
      url_label: document.getElementById('fUrlLabel').value,
      yield_amount: document.getElementById('fYield').value.trim(),
      ing_parts: ingParts,
      steps: document.getElementById('fSteps').value,
      memo: document.getElementById('fMemo').value,
      pub: document.getElementById('fPub').checked,
      photos: uploadedPhotos,
      fav: false,
      heart: false,
      crown: false,
      date: currentDate
    };
    if(editId){
      const old = recipes.find(x => String(x.id) === String(editId));
      if(old){
        recipeData.fav = !!old.fav;
        recipeData.heart = !!old.heart;
        recipeData.crown = !!old.crown;
        recipeData.date = old.date || currentDate;
      }
    }
    const {error} = await window.supabase
      .from('recipes')
      .upsert(recipeData);
    if(error) throw error;

    if(editId){
      const idx = recipes.findIndex(x => String(x.id) === String(editId));
      if(idx !== -1) recipes[idx] = recipeData;
    } else {
      recipes.unshift(recipeData);
    }
    alert('保存しました！');
    closeOverlay('overlayAdd');
    render();
  }catch(err){
    console.error('Save Error:', err);
    alert('保存に失敗しました: ' + err.message);
  }finally{
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

async function saveStatus(id,heart,fav,crown){
  try{
    const {error} = await window.supabase
      .from('recipes')
      .update({heart,fav,crown})
      .eq('id', String(id));
    if(error) throw error;
  }catch(err){
    console.error('Status Update Error:', err);
    alert('状態の保存に失敗しました: ' + err.message);
  }
}

async function deleteRecipe(){
  if(!confirm('このレシピを削除しますか？')) return;
  try{
    const targetId = String(editId);
    const tr = recipes.find(r => String(r.id) === targetId);
    if(tr && tr.photos){
      const urls = tr.photos
        .map(p => p.data)
        .filter(url => url.startsWith('http'));
      await deleteStoragePhotos(urls);
    }
    const {error} = await window.supabase
      .from('recipes')
      .delete()
      .eq('id', targetId);
    if(error) throw error;
    recipes = recipes.filter(r => String(r.id) !== targetId);
    alert('削除しました');
    closeOverlay('overlayAdd');
    render();
  }catch(err){
    console.error('Delete Error:', err);
    alert('削除に失敗しました: ' + err.message);
  }
}

// ===== メモ（notes_and_tips, recipe_id付き）=====
async function renderEditNoteList(){
  const listDiv = document.getElementById('editNoteList');
  listDiv.innerHTML = '<p style="font-size:11px;color:#999">読み込み中...</p>';
  if(!editId){
    listDiv.innerHTML = '<p style="font-size:11px;color:#999">新規作成時は保存後にメモを追加できます。</p>';
    return;
  }
  const {data:notes} = await window.supabase
    .from('notes_and_tips')
    .select('*')
    .eq('recipe_id', editId);
  if(!notes || notes.length === 0){
    listDiv.innerHTML = '<p style="font-size:11px;color:#999">登録されたメモはありません。</p>';
    return;
  }
  listDiv.innerHTML = notes.map(n => `
    <div style="font-size:12px;border-bottom:1px solid #eee;padding:5px 0;display:flex;justify-content:space-between;align-items:center">
      <span><strong>${esc(n.title)}</strong></span>
      <button onclick="deleteNote('${n.id}')" style="background:none;border:none;color:#D4537E;cursor:pointer;font-size:11px">削除</button>
    </div>`).join('');
}

async function addNote(){
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  if(!editId){
    alert('先にレシピ本体を保存してください');
    return;
  }
  if(!title || !content){
    alert('タイトルと内容を入力してください');
    return;
  }
  const {error} = await window.supabase
    .from('notes_and_tips')
    .insert({recipe_id:editId,title,content,category:'recipe'});
  if(error){
    alert('メモの保存に失敗しました');
  }else{
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    renderEditNoteList();
  }
}

async function deleteNote(noteId){
  if(!confirm('このメモを削除しますか？')) return;
  const {error} = await window.supabase
    .from('notes_and_tips')
    .delete()
    .eq('id', noteId);
  if(error) alert('削除に失敗しました');
  else renderEditNoteList();
}

// ===== 材料表示（詳細）=====
function ingNameHtml(name,currentId){
  const found = recipes.find(x => x.name === name && String(x.id) !== String(currentId));
  if(found){
    return '<span class="ing-link" onclick="event.stopPropagation();openDetail(\''+found.id+'\')">'+esc(name)+'</span>';
  }
  return esc(name);
}

function renderIngSection(r){
  if(!r) return '';
  const currentId = r.id;
  const parts = r.ingParts || r.ing_parts || [];

  if(Array.isArray(parts) && parts.length > 0){
    const hasLabels = parts.some(p => p && p.label);
    return parts.map(p => {
      if(!p || !p.rows) return '';
      const lh = (hasLabels && p.label && p.label !== '説明')
        ? '<div style="font-size:12px;font-weight:500;color:#72243E;margin:10px 0 4px">' +
          '<span style="background:#f0e0eb;padding:3px 10px;border-radius:5px;display:inline-block">' +
          esc(p.label) +
          '</span></div>'
        : '';
      const rh = (p.rows || []).map(row => (
        '<tr>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #f5f5f5">' + ingNameHtml(row.name,currentId) + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#666">' + esc(row.amt) + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#888">' + esc(row.note) + '</td>' +
        '</tr>'
      )).join('');
      return lh +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px">' +
        '<tbody>' + rh + '</tbody></table>';
    }).join('');
  }

  if(r.ingRows && r.ingRows.length){
    const rh2 = r.ingRows.map(row => (
      '<tr>' +
      '<td style="padding:4px 6px;border-bottom:1px solid #f5f5f5">' + ingNameHtml(row.name,currentId) + '</td>' +
      '<td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#666">' + esc(row.amt) + '</td>' +
      '<td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#888">' + esc(row.note) + '</td>' +
      '</tr>'
    )).join('');
    return '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<tbody>' + rh2 + '</tbody></table>';
  }

  if(r.ingDetail){
    return '<p style="font-size:13px;line-height:1.7;white-space:pre-wrap">' + esc(r.ingDetail) + '</p>';
  }
  return '';
}

function goToDetail(id){
  const keyStr = isEditor ? '&key=' + SECRET_KEY : '';
  window.location.href = 'detail.html?id=' + id + keyStr;
}

// ===== 詳細モーダル =====
async function openDetail(id){
  const r = recipes.find(x => String(x.id) === String(id));
  if(!r){
    console.error('Recipe not found for ID:', id);
    return;
  }

  const {data:notes} = await window.supabase
    .from('notes_and_tips')
    .select('*')
    .eq('recipe_id', id)
    .order('created_at',{ascending:true});

  let notesHtml = '';
  if(notes && notes.length > 0){
    const visibleNotes = isEditor ? notes : notes.filter(n => n.pub);
    notesHtml = visibleNotes.map(n => {
      const img = n.image_url ? `<img src="${n.image_url}" class="note-image">` : '';
      const pubBadge = isEditor
        ? `<span style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:999px;background:${n.pub?'#EAF3DE':'#F1EFE8'};color:${n.pub?'#27500A':'#5F5E5A'}">${n.pub?'公開':'非公開'}</span>`
        : '';
      return `<div class="note-card note-recipe">
        <div class="note-title"><span>📝 レシピメモ</span>: ${esc(n.title)}${pubBadge}</div>
        ${img}
        <div style="white-space:pre-wrap">${esc(n.content)}</div>
        ${isEditor ? `<button onclick="openTipEdit('${n.id}')" style="margin-top:6px;font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;color:#555">✏️ 編集</button>` : ''}
      </div>`;
    }).join('');
  }

  const ingHtml = renderIngSection(r);
  const photos = (r.photos && r.photos.length)
    ? r.photos
    : (r.img ? [{title:'',data:r.img}] : []);
  currentPhotos = photos;

  let heartsHtml = '';
  if(isEditor){
    heartsHtml =
      '<div style="display:flex;gap:4px;flex-shrink:0">' +
      '<button class="heart-btn'+(r.heart?' on':'')+'" onclick="toggleHeart(event,\''+r.id+'\');openDetail(\''+r.id+'\')">♡</button>' +
      '<button class="star-btn'+(r.fav?' on':'')+'" onclick="toggleStar(event,\''+r.id+'\');openDetail(\''+r.id+'\')">★</button>' +
      '<button class="crown-btn'+(r.crown?' on':'')+'" onclick="toggleCrown(event,\''+r.id+'\');openDetail(\''+r.id+'\')">♚</button>' +
      '</div>';
  } else {
    heartsHtml =
      '<div style="display:flex;gap:4px;flex-shrink:0">' +
      '<span style="color:'+(r.heart?'#D4537E':'#ccc')+'">♡</span>' +
      '<span style="color:'+(r.fav?'#BA7517':'#ccc')+'">★</span>' +
      '<span style="color:'+(r.crown?'#FFD700':'#ccc')+'">♚</span>' +
      '</div>';
  }

  let html = '';
  html += '<div class="detail-top"><h2>'+esc(r.name)+'</h2>'+heartsHtml+'</div>';

  const pubTagHtml = isEditor
    ? '<span class="tag '+(r.pub?'t-pub':'t-priv')+'">'+(r.pub?'公開':'非公開')+'</span>'
    : '';

  html += '<div class="tags" style="margin-bottom:1rem">' +
    (r.cat ? '<span class="tag t-cat">'+esc(r.cat)+'</span>' : '') +
    (r.genre ? '<span class="tag t-ing">'+esc(r.genre)+'</span>' : '') +
    pubTagHtml +
    '</div>';

  if(r.desc){
    html += '<div style="margin-bottom:1rem">' +
      '<p style="font-size:13px;color:#555;line-height:1.7">'+esc(r.desc)+'</p>' +
      '</div>';
  }

  if(ingHtml){
    html += '<div class="detail-section">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<h3>材料</h3>' +
      (r.yield_amount ? '<span class="yield-badge">'+esc(r.yield_amount)+'</span>' : '') +
      '</div>' +
      ingHtml +
      '</div>';
  }

  if(r.ings && r.ings.length){
    html += '<div class="detail-section"><h3>食材タグ</h3><div class="tags">' +
      r.ings.map(i => '<span class="tag t-ing">'+esc(i)+'</span>').join('') +
      '</div></div>';
  }

  if(r.steps){
    html += '<div class="detail-section"><h3>手順</h3><p>'+esc(r.steps)+'</p></div>';
  }

  if(photos.length){
    html += '<div class="detail-section"><h3>写真</h3><div class="photo-gallery">';
    photos.forEach((p,i) => {
      html += '<div class="photo-gallery-item">' +
        '<img src="'+p.data+'" onclick="openLightbox('+i+')">' +
        (p.title ? '<div class="photo-gallery-caption">'+esc(p.title)+'</div>' : '') +
        '</div>';
    });
    html += '</div></div>';
  }

  if(r.memo){
    html += '<div class="detail-section"><h3>アレンジ・覚書</h3><p>'+esc(r.memo)+'</p></div>';
  }

  if(r.url){
    const label = r.url_label || '参考レシピを見る';
    html += '<div class="detail-section"><h3>参考レシピ</h3>' +
      '<a href="'+esc(r.url)+'" target="_blank" style="color:#185FA5">' +
      esc(label) +
      '</a></div>';
  }

  const related = getRelatedRecipes(r);
  if(related.length){
    html += '<div class="detail-section"><h3>🔗 関連レシピ</h3><div style="display:flex;flex-wrap:wrap;gap:6px">';
    related.forEach(rel => {
      const thumb = getThumb(rel);
      html += '<div class="related-card" onclick="openDetail(\''+rel.id+'\')">' +
        (thumb
          ? '<img class="related-card-thumb" src="'+thumb+'">'
          : '<div>'+getCatEmoji(rel.cat)+'</div>') +
        '<span>'+esc(rel.name)+'</span></div>';
    });
    html += '</div></div>';
  }

  if(notesHtml){
    html += '<div class="detail-section" style="margin-top:20px">'+notesHtml+'</div>';
  }

  html += '<div style="font-size:11px;color:#aaa;margin-top:1.5rem;margin-bottom:1rem">'+(r.date || '')+'</div>';

  html += '<div class="modal-btns"><div></div><div class="modal-btns-right">' +
    '<button class="btn btn-sm" onclick="closeOverlay(\'overlayDetail\')">閉じる</button>' +
    (isEditor ? '<button class="btn btn-sm btn-accent" onclick="openEdit(\''+r.id+'\')">編集</button>' : '') +
    '</div></div>';

  document.getElementById('detailContent').innerHTML = html;
  document.getElementById('overlayDetail').scrollTop = 0;
  openOverlay('overlayDetail');
}

// ===== オーバーレイ・ライトボックス =====
function openOverlay(id){
  const el = document.getElementById(id);
  if(el) el.classList.add('open');
}
function closeOverlay(id){
  const el = document.getElementById(id);
  if(el) el.classList.remove('open');
}

function openLightbox(idx){
  const p = currentPhotos[idx];
  if(!p) return;
  document.getElementById('lightboxImg').src = p.data;
  document.getElementById('lightboxCaption').textContent = p.title || '';
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('open');
}

// ===== テキストファイルからレシピ追加 =====
function openFromTextFile(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const text = e.target.result;
    const parsed = parseRecipeText(text);
    if(!parsed.name){
      alert('「料理名:」が見つかりませんでした。\nフォーマットを確認してください。');
      input.value = '';
      return;
    }
    editId = null;
    pendingPhotos = [];
    document.getElementById('formTitle').textContent = 'レシピを追加（テキストから）';
    document.getElementById('fName').value = parsed.name;
    document.getElementById('fYield').value = parsed.yield_amount || '';
    document.getElementById('fDesc').value = parsed.desc;
    document.getElementById('fCat').value = parsed.cat;
    document.getElementById('fGenre').value = parsed.genre;
    document.getElementById('fIngs').value = parsed.ings;
    document.getElementById('fUrl').value = parsed.url;
    document.getElementById('fUrlLabel').value = '';
    document.getElementById('fSteps').value = parsed.steps;
    document.getElementById('fMemo').value = parsed.memo;
    document.getElementById('fPub').checked = parsed.pub;
    document.getElementById('btnDelete').style.display = 'none';
    renderPhotoList();
    setIngData(parsed.ingParts, null, null);
    const ov = document.getElementById('overlayAdd');
    ov.scrollTop = 0;
    openOverlay('overlayAdd');
    input.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

function parseRecipeText(text){
  const result = {
    name:'',desc:'',cat:'',genre:'',ings:'',url:'',
    steps:'',memo:'',pub:false,yield_amount:'',ingParts:[]
  };
  const lines = text.split(/\r?\n/);
  let mode = 'none';
  let currentPartLabel = '';
  let currentRows = [];
  const stepsLines = [];
  const memoLines = [];

  function flushPart(){
    if(currentRows.length > 0){
      result.ingParts.push({label:currentPartLabel,rows:currentRows});
      currentRows = [];
      currentPartLabel = '';
    }
  }

  for(let i=0;i<lines.length;i++){
    const line = lines[i].trim();
    if(/^※/.test(line)) continue;
    if(/^#\s+/.test(line)){
      const heading = line.replace(/^#\s+/,'').trim();
      if(mode === 'ing') flushPart();
      if(/^パート名[:：]/.test(heading)){
        flushPart();
        currentPartLabel = heading.replace(/^パート名[:：]\s*/,'').trim();
        continue;
      }
      if(heading === '料理名'){ mode='name'; continue; }
      if(heading === 'カテゴリ'){ mode='cat'; continue; }
      if(heading === 'ジャンル'){ mode='genre'; continue; }
      if(heading === '説明'){ mode='desc'; continue; }
      if(heading === '食材タグ'){ mode='ings'; continue; }
      if(heading === 'URL'){ mode='url'; continue; }
      if(heading === '公開'){ mode='pub'; continue; }
      if(heading === '手順'){ mode='steps'; continue; }
      if(heading === '覚書'){ mode='memo'; continue; }
      if(heading === '出来上がり量'){ mode='yield'; continue; }
      if(heading === '材料'){ mode='ing'; currentPartLabel=''; continue; }
      mode = 'none';
      continue;
    }
    if(line === ''){
      if(mode === 'steps') stepsLines.push('');
      if(mode === 'memo') memoLines.push('');
      continue;
    }
    if(mode === 'name'){ result.name = line; mode='none'; continue; }
    if(mode === 'cat'){ result.cat = line; mode='none'; continue; }
    if(mode === 'genre'){ result.genre = line; mode='none'; continue; }
    if(mode === 'desc'){ result.desc = line; mode='none'; continue; }
    if(mode === 'ings'){ result.ings = line; mode='none'; continue; }
    if(mode === 'url'){ result.url = line; mode='none'; continue; }
    if(mode === 'pub'){ result.pub = /^(はい|yes|true|1)$/i.test(line); mode='none'; continue; }
    if(mode === 'yield'){ result.yield_amount = line; mode='none'; continue; }
    if(mode === 'ing'){
      const cols = line.split(/,|，/).map(s => s.trim());
      currentRows.push({name:cols[0]||'',amt:cols[1]||'',note:cols[2]||''});
      continue;
    }
    if(mode === 'steps'){ stepsLines.push(line); continue; }
    if(mode === 'memo'){ memoLines.push(line); continue; }
  }
  flushPart();
  result.steps = stepsLines.join('\n').trim();
  result.memo = memoLines.join('\n').trim();
  return result;
}

// ===== 共通チップス（notes_and_tips, recipe_id null）=====
function handleCommonTipPhoto(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const MAX = 1200;
      let w = img.width, h = img.height;
      const scale = (w>MAX || h>MAX) ? MAX/Math.max(w,h) : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w*scale);
      canvas.height = Math.round(h*scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      pendingCommonTipPhoto = canvas.toDataURL('image/webp',0.85);
      document.getElementById('commonTipPhotoPreview').innerHTML =
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">' +
        '<img src="'+pendingCommonTipPhoto+'" style="width:52px;height:40px;object-fit:cover;border-radius:5px;border:1px solid #ddd">' +
        '<button type="button" onclick="clearCommonTipPhoto()" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px">✕</button>' +
        '</div>';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function clearCommonTipPhoto(){
  pendingCommonTipPhoto = null;
  document.getElementById('commonTipPhotoPreview').innerHTML = '';
}

function openCommonTipsManager(){
  pendingCommonTipPhoto = null;
  document.getElementById('commonTipPhotoPreview').innerHTML = '';
  renderCommonTipList();
  openOverlay('overlayCommonTips');
}

async function renderCommonTipList(){
  const listDiv = document.getElementById('commonTipList');
  let {data:tips} = await window.supabase
    .from('notes_and_tips')
    .select('*')
    .is('recipe_id', null)
    .order('created_at',{ascending:true});

  if(!tips) tips = [];

  if(!isEditor){
    tips = tips.filter(t => t.pub);
  } else {
    const p = document.getElementById('filterPub').value;
    if(p === '1') tips = tips.filter(t => t.pub);
    if(p === '0') tips = tips.filter(t => !t.pub);
  }

  if(!tips.length){
    listDiv.innerHTML = '<p style="font-size:11px;color:#999;text-align:center">なし</p>';
    return;
  }

  listDiv.innerHTML = tips.map(t => {
    const imgHtml = t.image_url
      ? `<img src="${t.image_url}" style="width:36px;height:36px;object-fit:cover;border-radius:5px;margin-right:6px;flex-shrink:0">`
      : '';
    return `
      <div style="font-size:12px;border-bottom:1px solid #eee;padding:8px 0;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center">
          ${imgHtml}
          <div>
            <strong>${esc(t.title)}</strong>
            <div style="font-size:11px;color:#666;margin-top:2px">
              ${esc(t.content.length>40 ? t.content.slice(0,40)+'…' : t.content)}
            </div>
          </div>
        </div>
        <button onclick="deleteCommonTip('${t.id}')" style="background:none;border:none;color:#638C3E;cursor:pointer;font-size:11px;flex-shrink:0;margin-left:8px">削除</button>
      </div>`;
  }).join('');
}

async function addCommonTip(){
  const title = document.getElementById('commonTipTitle').value.trim();
  const content = document.getElementById('commonTipContent').value.trim();
  if(!title || !content){
    alert('タイトルと内容を入力してください');
    return;
  }
  const addBtn = document.getElementById('commonTipAddBtn');
  addBtn.disabled = true;
  addBtn.textContent = '追加中...';
  try{
    let imageUrl = null;
    if(pendingCommonTipPhoto){
      imageUrl = await uploadToStorage({data:pendingCommonTipPhoto});
    }
    await window.supabase
      .from('notes_and_tips')
      .insert({recipe_id:null,title,content,image_url:imageUrl,category:'tips'});
    document.getElementById('commonTipTitle').value = '';
    document.getElementById('commonTipContent').value = '';
    clearCommonTipPhoto();
    renderCommonTipList();
    render();
  }catch(err){
    alert('追加に失敗しました: ' + err.message);
  }finally{
    addBtn.disabled = false;
    addBtn.textContent = '共通チップスを追加';
  }
}

async function deleteCommonTip(id){
  if(!confirm('削除しますか？')) return;
  const {data:tip} = await window.supabase
    .from('notes_and_tips')
    .select('image_url')
    .eq('id', id)
    .single();
  if(tip && tip.image_url){
    await deleteStoragePhotos([tip.image_url]);
  }
  await window.supabase
    .from('notes_and_tips')
    .delete()
    .eq('id', id);
  renderCommonTipList();
  render();
}

// ===== JSON エクスポート =====
function exportData(){
  const exp = recipes.map(r => {
    const o = Object.assign({}, r);
    delete o.img;
    o.photos = [];
    return o;
  });
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exp,null,2));
  a.download = 'recipes.json';
  a.click();
}

// ===== 初期化 =====
async function loadRecipes(){
  const {data} = await window.supabase
    .from('recipes')
    .select('*')
    .order('created_at',{ascending:false});
  recipes = data || [];
  updateSelects();
  render();
}

function setupEventHandlers(){
  document.getElementById('overlayDetail').addEventListener('click',e => {
    if(e.target === e.currentTarget) closeOverlay('overlayDetail');
  });
  document.getElementById('overlayTipDetail').addEventListener('click',e => {
    if(e.target === e.currentTarget) closeOverlay('overlayTipDetail');
  });
  document.getElementById('overlayTipEdit').addEventListener('click',e => {
    if(e.target === e.currentTarget) closeOverlay('overlayTipEdit');
  });

  document.getElementById('search').addEventListener('input', render);
  document.getElementById('filterCat').addEventListener('change', render);
  document.getElementById('filterPub').addEventListener('change', () => {
    render();
    renderCommonTipList();
    renderTipsCards();
  });

  document.getElementById('btnOpenAdd').addEventListener('click', openAdd);
  document.getElementById('btnExport').addEventListener('click', exportData);
  document.getElementById('btnAddRowLast').addEventListener('click', addRowToLastPart);
  document.getElementById('btnAddPart').addEventListener('click', addNewPart);
  document.getElementById('btnAddPhoto').addEventListener('click', () => {
    document.getElementById('photoInput').click();
  });
  document.getElementById('photoInput').addEventListener('change', function(){ handlePhotoAdd(this); });
  document.getElementById('btnSave').addEventListener('click', saveRecipe);
  document.getElementById('btnDelete').addEventListener('click', deleteRecipe);
  document.getElementById('btnAddNote').addEventListener('click', addNote);

  document.getElementById('btnOpenCommonTips').addEventListener('click', openCommonTipsManager);
  document.getElementById('commonTipPhotoAddBtn').addEventListener('click', () => {
    document.getElementById('commonTipPhotoInput').click();
  });
  document.getElementById('commonTipPhotoInput').addEventListener('change', function(){ handleCommonTipPhoto(this); });

  document.getElementById('tipEditPhotoAddBtn').addEventListener('click', () => {
    document.getElementById('tipEditPhotoInput').click();
  });
  document.getElementById('tipEditPhotoInput').addEventListener('change', function(){ handleTipEditPhoto(this); });
  document.getElementById('tipEditSaveBtn').addEventListener('click', saveTipEdit);
  document.getElementById('tipEditDeleteBtn').addEventListener('click', deleteTipFromEdit);
}

// ===============================
// Tips 編集の関数をここに貼る
// ===============================
async function openTipEdit(tipId) {
  const{data:t,error}=await window.supabase.from('notes_and_tips').select('*').eq('id',tipId).single();
  if(error||!t){alert('チップスの読み込みに失敗しました');return;}

  tipEditPendingPhoto=null; 
  tipEditPhotoCleared=false;

  document.getElementById('tipEditId').value=t.id;
  document.getElementById('tipEditTitle').value=t.title||'';
  document.getElementById('tipEditContent').value=t.content||'';
  document.getElementById('tipEditPub').checked = !!t.pub;   // ← 追加

  var prev=document.getElementById('tipEditPhotoPreview');
  var clearBtn=document.getElementById('tipEditPhotoClearBtn');

  if(t.image_url){
    prev.innerHTML='<img src="'+t.image_url+'" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;border:1px solid #ddd">';
    clearBtn.style.display='inline'; 
    clearBtn.textContent='写真を削除';
  } else { 
    prev.innerHTML=''; 
    clearBtn.style.display='none'; 
  }

  openOverlay('overlayTipEdit');
}


function handleTipEditPhoto(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var MAX=1200,w=img.width,h=img.height;
      var scale=(w>MAX||h>MAX)?MAX/Math.max(w,h):1;
      var canvas=document.createElement('canvas');
      canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
      var ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      tipEditPendingPhoto=canvas.toDataURL('image/webp',0.85);
      tipEditPhotoCleared=false;
      document.getElementById('tipEditPhotoPreview').innerHTML='<img src="'+tipEditPendingPhoto+'" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;border:1px solid #ddd">';
      var cb=document.getElementById('tipEditPhotoClearBtn');cb.style.display='inline';cb.textContent='選択をキャンセル';
    };img.src=e.target.result;
  };reader.readAsDataURL(file);input.value='';
}

function clearTipEditPhoto(){
  tipEditPendingPhoto=null;tipEditPhotoCleared=true;
  document.getElementById('tipEditPhotoPreview').innerHTML='<p style="font-size:11px;color:#aaa;margin:0">写真なし</p>';
  document.getElementById('tipEditPhotoClearBtn').style.display='none';
}
//************************
async function saveTipEdit(){
  const id=document.getElementById('tipEditId').value;
  const title=document.getElementById('tipEditTitle').value.trim();
  const content=document.getElementById('tipEditContent').value.trim();
  const pub=document.getElementById('tipEditPub').checked;   // ← 追加

  const updateData = {
    title,
    content,
    pub
  };

  if(tipEditPhotoCleared){
    updateData.image_url = null;
  } else if(tipEditPendingPhoto){
    updateData.image_url = tipEditPendingPhoto;
  }

  await window.supabase.from('notes_and_tips')
    .update(updateData)
    .eq('id', id);

  closeOverlay('overlayTipEdit');
  loadCommonTips();
}


async function deleteTipFromEdit(){
  if(!confirm('このチップスを削除しますか？'))return;
  var tipId=document.getElementById('tipEditId').value;
  const{data:tip}=await window.supabase.from('notes_and_tips').select('image_url').eq('id',tipId).single();
  if(tip&&tip.image_url)await deleteStoragePhotos([tip.image_url]);
  await window.supabase.from('notes_and_tips').delete().eq('id',tipId);
  closeOverlay('overlayTipEdit');render();
}






// ===== index画面にtipsカードを表示 =====
async function renderTipsCards(){
  const area = document.getElementById('tipsArea');
  const tipsGrid = document.getElementById('tipsGrid');
  if(!area || !tipsGrid) return;

  let {data:tips} = await window.supabase
    .from('notes_and_tips')
    .select('*')
    .is('recipe_id', null)
    .order('created_at',{ascending:true});

  if(!tips) tips = [];

  // 閲覧モードでは公開のみ
  if(!isEditMode()){
    tips = tips.filter(t => t.pub);
  }

  if(!tips.length){
    area.style.display = 'none';
    return;
  }

  area.style.display = 'block';
  const editorNow = isEditMode();

  tipsGrid.innerHTML = tips.map(t => {
    const imgHtml = t.image_url
      ? `<img src="${t.image_url}" style="width:100%;height:100px;object-fit:cover;display:block;background:#f5f5f5">`
      : `<div style="width:100%;height:60px;display:flex;align-items:center;justify-content:center;font-size:28px;background:#f5fbf2">💡</div>`;
    const pubBadge = editorNow
      ? `<span class="tag ${t.pub?'t-pub':'t-priv'}" style="font-size:10px">${t.pub?'公開':'非公開'}</span>`
      : '';
    const editBtn = editorNow
      ? `<button onclick="event.stopPropagation();openTipEdit('${t.id}')" style="font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;color:#555;margin-top:4px">✏️ 編集</button>`
      : '';
    const contentPreview = t.content
      ? `<div style="font-size:12px;color:#555;line-height:1.5;margin-top:4px">${esc(t.content.length>60?t.content.slice(0,60)+'…':t.content)}</div>`
      : '';
    return `
      <div class="card" style="cursor:default">
        ${imgHtml}
        <div class="card-body">
          <div style="font-size:14px;font-weight:500;color:#1a1a1a;margin-bottom:4px">${esc(t.title)}</div>
          ${contentPreview}
          <div style="margin-top:6px;display:flex;gap:4px;align-items:center;flex-wrap:wrap">
            ${pubBadge}
            ${editBtn}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ===== loadCommonTips = renderCommonTipList の別名（saveTipEdit等から呼ばれる） =====
function loadCommonTips(){
  renderCommonTipList();
  renderTipsCards();
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const key = params.get('key');

  if (key === SECRET_KEY) {
    isEditor = true;
  } else {
    isEditor = false;
  }

  // ===== 編集モード時のファビコン・タイトル切り替え =====
  if(isEditor){
    document.title = '🔑 おかしなぺぇじ【編集モード】';
    const favicon = document.getElementById('faviconLink');
    if(favicon){
      favicon.href = 'favicon-edit.ico';
    }

    // TXTから追加ボタンを topbar に挿入
    const toolbar = document.querySelector('.toolbar-right');
    if(toolbar && !document.getElementById('btnOpenFromTxt')){
      const txtBtn = document.createElement('button');
      txtBtn.className = 'btn btn-sm';
      txtBtn.id = 'btnOpenFromTxt';
      txtBtn.textContent = '📄 TXTから追加';
      // ファイル input を作成
      const txtInput = document.createElement('input');
      txtInput.type = 'file';
      txtInput.accept = '.txt,text/plain';
      txtInput.style.display = 'none';
      txtInput.id = 'txtFileInput';
      txtInput.addEventListener('change', function(){ openFromTextFile(this); });
      txtBtn.addEventListener('click', () => txtInput.click());
      toolbar.insertBefore(txtBtn, toolbar.firstChild);
      toolbar.appendChild(txtInput);
    }
  }

  setupEventHandlers();
  loadRecipes();
  renderCommonTipList();
  renderTipsCards();
});

