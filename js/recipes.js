// ===== recipes.js =====
//　260427-1805-view-sort-confirmed
// レシピ一覧描画・詳細モーダル・♡★♚トグル・JSONエクスポート・データ読み込み

// ----- 表示モード・ソート状態 -----
let viewMode = 'grid'; // 'grid' | 'list'
let sortKey  = '';     // '' | 'name' | 'cat' | 'genre' | 'date'
let sortDir  = 'asc';  // 'asc' | 'desc'

// confirmedFilter: 0=すべて 1=確定のみ 2=未確定のみ
let confirmedFilter = 0;

// tipsOnlyMode: チップスのみ表示
let tipsOnlyMode = false;

// ----- サムネ・関連レシピ -----
function getThumb(r) {
  if (r.photos && r.photos.length) {
    const cover = r.photos.find(p => p.cover);
    return (cover || r.photos[0]).data;
  }
  return r.img || null;
}

function getRelatedRecipes(r) {
  if (!r || !r.ings || !r.ings.length) return [];
  const set = new Set(r.ings);
  return recipes
    .filter(x => x.id !== r.id && x.ings && x.ings.some(i => set.has(i)))
    .slice(0, 6);
}

// ----- カテゴリ select / datalist の更新 -----
function updateSelects() {
  const cats = [], genres = [];
  recipes.forEach(r => {
    if (r.cat   && !cats.includes(r.cat))     cats.push(r.cat);
    if (r.genre && !genres.includes(r.genre)) genres.push(r.genre);
  });
  const sc = document.getElementById('filterCat');
  const cv = sc.value;
  sc.innerHTML = '<option value="">カテゴリ：すべて</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sc.value = cv;

  const cl = document.getElementById('catList');
  const gl = document.getElementById('genreList');
  if (cl) cl.innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  if (gl) gl.innerHTML = genres.map(g => `<option value="${esc(g)}">`).join('');
}

// ----- マークフィルター状態 -----
const markFilters = { heart: false, star: false, crown: false };

function toggleMarkFilter(type) {
  markFilters[type] = !markFilters[type];
  const btnId = { heart: 'filterHeart', star: 'filterStar', crown: 'filterCrown' }[type];
  document.getElementById(btnId)?.classList.toggle(`active-${type}`, markFilters[type]);
  render();
}

// ----- 配合確定フィルター（3段階） -----
// 0:すべて → 1:確定のみ → 2:未確定のみ → 0:すべて
function toggleConfirmedFilter() {
  confirmedFilter = (confirmedFilter + 1) % 3;
  const btn = document.getElementById('filterConfirmed');
  if (!btn) return;
  if (confirmedFilter === 0) {
    btn.textContent = '✅'; btn.title = 'クリックで確定のみ表示';
    btn.classList.remove('active-confirmed','active-unconfirmed');
  } else if (confirmedFilter === 1) {
    btn.textContent = '✅確定'; btn.title = 'クリックで未確定のみ表示';
    btn.classList.add('active-confirmed'); btn.classList.remove('active-unconfirmed');
  } else {
    btn.textContent = '☐未確定'; btn.title = 'クリックですべて表示';
    btn.classList.remove('active-confirmed'); btn.classList.add('active-unconfirmed');
  }
  render();
}

// ----- チップスのみ表示 -----
function toggleTipsOnly() {
  tipsOnlyMode = !tipsOnlyMode;
  const btn = document.getElementById('filterTipsOnly');
  btn?.classList.toggle('active-tips', tipsOnlyMode);

  // チップスのみ時はレシピグリッドを隠してチップスエリアを前面に
  const gridEl   = document.getElementById('grid');
  const tipsArea = document.getElementById('tipsArea');
  if (tipsOnlyMode) {
    if (gridEl)   gridEl.style.display   = 'none';
    if (tipsArea) tipsArea.style.display = 'block';
  } else {
    if (gridEl)   gridEl.style.display   = '';
    render(); // countBar も更新
  }
  renderTipsCards(); // チップスの公開フィルターも反映
}

// ----- ソート切り替え -----
function setSort(key) {
  if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortKey = key; sortDir = 'asc'; }
  render();
}

// ----- 表示モード切り替え -----
function setViewMode(mode) {
  viewMode = mode;
  document.getElementById('btnViewGrid')?.classList.toggle('btn-view-active', mode === 'grid');
  document.getElementById('btnViewList')?.classList.toggle('btn-view-active', mode === 'list');
  render();
}

// ----- 一覧描画 -----
function render() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  // チップスのみモード中はレシピ描画しない
  if (tipsOnlyMode) { grid.style.display = 'none'; return; }
  grid.style.display = '';

  const q   = document.getElementById('search').value.trim().toLowerCase();
  const cat = document.getElementById('filterCat').value;
  const p   = document.getElementById('filterPub').value;

  let list = recipes.slice();

  if (!isEditor) list = list.filter(r => r.pub);

  if (q) list = list.filter(r =>
    (r.name  && r.name.toLowerCase().includes(q)) ||
    (r.desc  && r.desc.toLowerCase().includes(q)) ||
    (r.cat   && r.cat.toLowerCase().includes(q))  ||
    (r.genre && r.genre.toLowerCase().includes(q)) ||
    (r.steps && r.steps.toLowerCase().includes(q)) ||
    (r.memo  && r.memo.toLowerCase().includes(q))  ||
    (r.ings  && r.ings.join(',').toLowerCase().includes(q)));
  if (cat) list = list.filter(r => r.cat === cat);
  if (p === '1') list = list.filter(r =>  r.pub);
  if (p === '0') list = list.filter(r => !r.pub);

  if (markFilters.heart) list = list.filter(r => r.heart);
  if (markFilters.star)  list = list.filter(r => r.fav);
  if (markFilters.crown) list = list.filter(r => r.crown);
  if (confirmedFilter === 1) list = list.filter(r =>  r.confirmed);
  if (confirmedFilter === 2) list = list.filter(r => !r.confirmed);

  if (sortKey) {
    list.sort((a, b) => {
      const av = a[sortKey] || '', bv = b[sortKey] || '';
      const cmp = String(av).localeCompare(String(bv), 'ja');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  document.getElementById('countBar').textContent = list.length + ' 件';

  if (viewMode === 'list') renderListView(grid, list);
  else                     renderGridView(grid, list);
}

// ----- グリッド表示 -----
function renderGridView(grid, list) {
  grid.className = 'grid';
  grid.innerHTML = list.map(r => {
    const thumb = getThumb(r);
    // 配合確定バッジ：レシピ名の前
    const confirmedBadge = r.confirmed
      ? `<span class="badge-confirmed">✅</span> ` : '';
    const pubTag = isEditor
      ? `<span class="tag ${r.pub ? 't-pub' : 't-priv'}">${r.pub ? '公開' : '非公開'}</span>` : '';
    const heartsHtml = isEditor
      ? `<div class="hearts">
           <button class="heart-btn${r.heart ? ' on' : ''}" onclick="toggleHeart(event,'${r.id}')">${r.heart ? '♥' : '♡'}</button>
           <button class="star-btn${r.fav   ? ' on' : ''}" onclick="toggleStar(event,'${r.id}')">★</button>
           <button class="crown-btn${r.crown ? ' on' : ''}" onclick="toggleCrown(event,'${r.id}')">♚</button>
         </div>`
      : `<div class="hearts">
           <span style="color:${r.heart ? '#D4537E' : '#ccc'}">${r.heart ? '♥' : '♡'}</span>
           <span style="color:${r.fav   ? '#BA7517' : '#ccc'}">★</span>
           <span style="color:${r.crown ? '#FFD700' : '#ccc'}">♚</span>
         </div>`;
    return `
      <div class="card" onclick="openDetail('${r.id}')">
        ${thumb ? `<img src="${thumb}" class="card-img">` : `<div class="card-img-placeholder">${getCatEmoji(r.cat)}</div>`}
        <div class="card-body">
          <div class="card-top">
            <div class="card-title">${confirmedBadge}${esc(r.name)}</div>
            ${heartsHtml}
          </div>
          ${r.desc ? `<div class="card-desc">${esc(r.desc)}</div>` : ''}
          <div class="card-tags">
            ${pubTag}
            ${r.cat   ? `<span class="tag t-cat">${esc(r.cat)}</span>`   : ''}
            ${r.genre ? `<span class="tag t-ing">${esc(r.genre)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ----- リスト表示 -----
function renderListView(grid, list) {
  grid.className = 'list-view';
  const si = k => sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕';
  const header = `<div class="list-header">
    <div class="list-col-thumb"></div>
    <div class="list-col-name  sortable" onclick="setSort('name')">料理名<span class="sort-icon">${si('name')}</span></div>
    ${isEditor ? '<div class="list-col-pub"></div>' : ''}
    <div class="list-col-cat   sortable" onclick="setSort('cat')">カテゴリ<span class="sort-icon">${si('cat')}</span></div>
    <div class="list-col-genre sortable" onclick="setSort('genre')">ジャンル<span class="sort-icon">${si('genre')}</span></div>
    <div class="list-col-date  sortable" onclick="setSort('date')">日付<span class="sort-icon">${si('date')}</span></div>
    <div class="list-col-marks">マーク</div>
  </div>`;

  const rows = list.map(r => {
    const thumb = getThumb(r);
    const confirmedBadge = r.confirmed ? `<span class="badge-confirmed">✅</span> ` : '';
    const pubTag = isEditor
      ? `<span class="tag ${r.pub ? 't-pub' : 't-priv'}" style="font-size:10px">${r.pub ? '公開' : '非公開'}</span>` : '';
    const marksHtml = isEditor
      ? `<button class="heart-btn${r.heart ? ' on' : ''}" onclick="toggleHeart(event,'${r.id}')">${r.heart ? '♥' : '♡'}</button>
         <button class="star-btn${r.fav   ? ' on' : ''}" onclick="toggleStar(event,'${r.id}')">★</button>
         <button class="crown-btn${r.crown ? ' on' : ''}" onclick="toggleCrown(event,'${r.id}')">♚</button>`
      : `<span style="color:${r.heart ? '#D4537E':'#ddd'}">${r.heart?'♥':'♡'}</span>
         <span style="color:${r.fav?'#BA7517':'#ddd'}">★</span>
         <span style="color:${r.crown?'#FFD700':'#ddd'}">♚</span>`;
    return `<div class="list-row" onclick="openDetail('${r.id}')">
      <div class="list-col-thumb">
        ${thumb ? `<img src="${thumb}" class="list-thumb">` : `<div class="list-thumb-placeholder">${getCatEmoji(r.cat)}</div>`}
      </div>
      <div class="list-col-name">
        <span class="list-name">${confirmedBadge}${esc(r.name)}</span>
        ${r.desc ? `<div class="list-desc">${esc(r.desc)}</div>` : ''}
      </div>
      ${isEditor ? `<div class="list-col-pub">${pubTag}</div>` : ''}
      <div class="list-col-cat">${r.cat ? `<span class="tag t-cat">${esc(r.cat)}</span>` : ''}</div>
      <div class="list-col-genre">${r.genre ? `<span class="tag t-ing">${esc(r.genre)}</span>` : ''}</div>
      <div class="list-col-date" style="font-size:11px;color:#aaa">${r.date||''}</div>
      <div class="list-col-marks" style="display:flex;gap:2px;align-items:center">${marksHtml}</div>
    </div>`;
  }).join('');

  grid.innerHTML = header + rows;
}

// ----- ♡★♚✅ -----
function toggleHeart(e, id) {
  e.preventDefault(); e.stopPropagation();
  const r = recipes.find(x => String(x.id) === String(id));
  if (r) { r.heart = !r.heart; saveStatus(r.id, r.heart, r.fav, r.crown, r.confirmed); render(); }
}
function toggleStar(e, id) {
  e.preventDefault(); e.stopPropagation();
  const r = recipes.find(x => String(x.id) === String(id));
  if (r) { r.fav = !r.fav; saveStatus(r.id, r.heart, r.fav, r.crown, r.confirmed); render(); }
}
function toggleCrown(e, id) {
  e.preventDefault(); e.stopPropagation();
  const r = recipes.find(x => String(x.id) === String(id));
  if (r) { r.crown = !r.crown; saveStatus(r.id, r.heart, r.fav, r.crown, r.confirmed); render(); }
}
function toggleConfirmed(e, id) {
  e.preventDefault(); e.stopPropagation();
  const r = recipes.find(x => String(x.id) === String(id));
  if (r) { r.confirmed = !r.confirmed; saveStatus(r.id, r.heart, r.fav, r.crown, r.confirmed); render(); }
}

async function saveStatus(id, heart, fav, crown, confirmed) {
  const { error } = await window.supabase
    .from('recipes').update({ heart, fav, crown, confirmed: !!confirmed }).eq('id', String(id));
  if (error) console.error('Status Update Error:', error);
}

// ----- 材料 HTML（詳細表示用）-----
function ingNameHtml(name, currentId) {
  const found = recipes.find(x => x.name === name && String(x.id) !== String(currentId));
  if (found) return `<span class="ing-link" onclick="event.stopPropagation();openDetail('${found.id}')">${esc(name)}</span>`;
  return esc(name);
}

const PART_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function renderIngSection(r) {
  const parts = r.ingParts || r.ing_parts || [];
  const row2tr = row =>
    `<tr>
      <td style="padding:4px 6px;border-bottom:1px solid #f5f5f5">${ingNameHtml(row.name, r.id)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#666;white-space:nowrap">${esc(row.amt)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#888">${esc(row.note)}</td>
    </tr>`;
  const wrapTable = rows =>
    `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:0;table-layout:fixed">
      <colgroup><col style="width:auto"><col style="width:22%"><col style="width:30%"></colgroup>
      <tbody>${rows.map(row2tr).join('')}</tbody>
    </table>`;

  if (parts.length) {
    const multiPart = parts.length > 1;
    const inner = parts.map((p, i) => {
      if (!p || !p.rows) return '';
      const divider = (multiPart && i > 0) ? `<div style="border-top:1px dashed #D4A8BC;margin:6px 0 6px"></div>` : '';
      let labelHtml = '';
      if (multiPart && p.label) {
        labelHtml = `<div style="font-size:12px;font-weight:500;color:#72243E;margin-bottom:4px">
          <span style="background:#f0e0eb;padding:3px 10px;border-radius:5px;display:inline-block">${esc(p.label)}</span>
        </div>`;
      }
      return divider + labelHtml + wrapTable(p.rows);
    }).join('');
    return `<div style="border-top:1px dashed #D4A8BC;border-bottom:1px dashed #D4A8BC;padding:6px 0;margin:4px 0">${inner}</div>`;
  }
  if (r.ingRows && r.ingRows.length) {
    return `<div style="border-top:1px dashed #D4A8BC;border-bottom:1px dashed #D4A8BC;padding:6px 0;margin:4px 0">${wrapTable(r.ingRows)}</div>`;
  }
  if (r.ingDetail) return `<p style="font-size:13px;line-height:1.7;white-space:pre-wrap">${esc(r.ingDetail)}</p>`;
  return '';
}

// ----- 詳細モーダル 履歴スタック -----
const detailHistory = [];

function goBackDetail() {
  if (!detailHistory.length) { closeOverlay('overlayDetail'); return; }
  const prevId = detailHistory.pop();
  openDetail(prevId, true);
}

// ----- 詳細モーダル -----
async function openDetail(id, skipHistory = false) {
  if (!skipHistory) {
    const current = document.getElementById('detailContent')?.dataset?.currentId;
    if (current && current !== String(id) && document.getElementById('overlayDetail').classList.contains('open')) {
      detailHistory.push(current);
    } else if (!document.getElementById('overlayDetail').classList.contains('open')) {
      detailHistory.length = 0;
    }
  }
  const r = recipes.find(x => String(x.id) === String(id));
  if (!r) return;
  document.getElementById('detailContent').dataset.currentId = String(id);

  const { data: notes, error: notesError } = await window.supabase
    .from('notes_and_tips').select('*').eq('recipe_id', String(id)).order('created_at', { ascending: true });
  if (notesError) console.warn('Notes fetch error:', notesError);

  const visibleNotes = (notes || []).filter(n => isEditor || n.pub);
  const notesHtml = visibleNotes.map(n => {
    const img = n.image_url ? `<img src="${n.image_url}" class="note-image">` : '';
    const pubBadge = isEditor
      ? `<span style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:999px;
           background:${n.pub ? '#EAF3DE' : '#F1EFE8'};color:${n.pub ? '#27500A' : '#5F5E5A'}">
           ${n.pub ? '公開' : '非公開'}</span>` : '';
    const editBtn = isEditor
      ? `<button onclick="openTipEdit('${n.id}')" style="margin-top:6px;font-size:11px;padding:2px 8px;
           border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;color:#555">✏️ 編集</button>` : '';
    return `<div class="note-card note-recipe">
      <div class="note-title">📝 ${esc(n.title)}${pubBadge}</div>
      ${img}
      <div style="white-space:pre-wrap;font-size:12px;line-height:1.7">${esc(n.content)}</div>
      ${editBtn}
    </div>`;
  }).join('');

  const ingHtml = renderIngSection(r);
  const photos = r.photos && r.photos.length ? r.photos : (r.img ? [{ title: '', data: r.img }] : []);
  currentPhotos = photos;

  const confirmedHtml = isEditor
    ? `<button class="btn-confirmed${r.confirmed ? ' on' : ''}" onclick="toggleConfirmed(event,'${r.id}');openDetail('${r.id}')">
         ${r.confirmed ? '✅ 配合確定' : '☐ 配合確定'}
       </button>`
    : (r.confirmed ? `<span class="badge-confirmed">✅ 配合確定</span>` : '');

  const heartsHtml = isEditor
    ? `<div style="display:flex;gap:4px;flex-shrink:0">
         <button class="heart-btn${r.heart ? ' on' : ''}" onclick="toggleHeart(event,'${r.id}');openDetail('${r.id}')">${r.heart ? '♥' : '♡'}</button>
         <button class="star-btn${r.fav   ? ' on' : ''}" onclick="toggleStar(event,'${r.id}');openDetail('${r.id}')">★</button>
         <button class="crown-btn${r.crown ? ' on' : ''}" onclick="toggleCrown(event,'${r.id}');openDetail('${r.id}')">♚</button>
       </div>`
    : `<div style="display:flex;gap:4px;flex-shrink:0">
         <span style="color:${r.heart ? '#D4537E' : '#ccc'}">${r.heart ? '♥' : '♡'}</span>
         <span style="color:${r.fav   ? '#BA7517' : '#ccc'}">★</span>
         <span style="color:${r.crown ? '#FFD700' : '#ccc'}">♚</span>
       </div>`;

  const pubTagHtml = isEditor
    ? `<span class="tag ${r.pub ? 't-pub' : 't-priv'}">${r.pub ? '公開' : '非公開'}</span>` : '';

  let html = `<div class="detail-top"><h2>${esc(r.name)}</h2>${heartsHtml}</div>`;
  if (confirmedHtml) html += `<div style="margin-bottom:10px">${confirmedHtml}</div>`;
  if (r.desc) html += `<p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:0.8rem">${esc(r.desc)}</p>`;

  const tagsRow = pubTagHtml +
    (r.cat   ? `<span class="tag t-cat">${esc(r.cat)}</span>` : '') +
    (r.genre ? `<span class="tag t-ing">${esc(r.genre)}</span>` : '');
  if (tagsRow) html += `<div style="display:flex;justify-content:flex-end;flex-wrap:wrap;gap:4px;margin-bottom:1rem">${tagsRow}</div>`;

  if (ingHtml) html += `<div class="detail-section">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3>材料</h3>${r.yield_amount ? `<span class="yield-badge">${esc(r.yield_amount)}</span>` : ''}
    </div>${ingHtml}</div>`;

  if (r.ings && r.ings.length) html += `<div class="detail-section"><h3>食材タグ</h3><div class="tags">
    ${r.ings.map(i => `<span class="tag t-ing">${esc(i)}</span>`).join('')}</div></div>`;

  if (r.steps) html += `<div class="detail-section"><h3>手順</h3>
    <p style="white-space:pre-wrap;font-size:13px;line-height:1.8">${renderWithTooltip(r.steps)}</p></div>`;

  if (photos.length) {
    html += `<div class="detail-section"><h3>写真</h3><div class="photo-gallery">`;
    photos.forEach((p, i) => {
      html += `<div class="photo-gallery-item">
        <img src="${p.data}" onclick="openLightbox(${i})">
        ${p.title ? `<div class="photo-gallery-caption">${esc(p.title)}</div>` : ''}
      </div>`;
    });
    html += `</div></div>`;
  }

  if (r.memo) html += `<div class="detail-section"><h3>アレンジ・覚書</h3>
    <p style="white-space:pre-wrap;font-size:13px;line-height:1.8">${renderWithTooltip(r.memo)}</p></div>`;

  if (r.url) {
    const label = r.url_label || '参考レシピを見る';
    html += `<div class="detail-section"><h3>参考レシピ</h3>
      <a href="${esc(r.url)}" target="_blank" style="color:#185FA5">${esc(label)}</a></div>`;
  }

  const related = getRelatedRecipes(r);
  if (related.length) {
    html += `<div class="detail-section"><h3>🔗 関連レシピ</h3><div style="display:flex;flex-wrap:wrap;gap:6px">`;
    related.forEach(rel => {
      const thumb = getThumb(rel);
      html += `<div class="related-card" onclick="openDetail('${rel.id}')">
        ${thumb ? `<img class="related-card-thumb" src="${thumb}">` : `<div>${getCatEmoji(rel.cat)}</div>`}
        <span>${esc(rel.name)}</span></div>`;
    });
    html += `</div></div>`;
  }

  if (visibleNotes.length > 0) html += `
    <div class="detail-section" style="margin-top:20px">
      <h3>📝 レシピメモ</h3>${notesHtml}
    </div>`;

  html += `<div style="font-size:11px;color:#aaa;margin-top:1.5rem;margin-bottom:1rem">${r.date || ''}</div>`;
  const backBtn = detailHistory.length > 0
    ? `<button class="btn btn-sm" onclick="goBackDetail()">← 戻る</button>` : '<div></div>';
  html += `<div class="modal-btns">${backBtn}<div class="modal-btns-right">
    <button class="btn btn-sm" onclick="closeOverlay('overlayDetail');detailHistory.length=0;">閉じる</button>
    ${isEditor ? `<button class="btn btn-sm btn-accent" onclick="openEdit('${r.id}')">編集</button>` : ''}
  </div></div>`;

  document.getElementById('detailContent').innerHTML = html;
  document.getElementById('overlayDetail').scrollTop = 0;
  openOverlay('overlayDetail');
}

// ----- JSON エクスポート -----
async function exportData() {
  const btn = document.getElementById('btnExport');
  const origText = btn.textContent;
  btn.disabled = true; btn.textContent = '取得中...';
  try {
    // メモ・チップスを全件取得
    const { data: notes } = await window.supabase
      .from('notes_and_tips').select('*').order('created_at', { ascending: true });

    // レシピデータ（写真URLはそのまま保持、旧imgフィールドは除去）
    const expRecipes = recipes.map(r => {
      const o = { ...r };
      delete o.img; // 旧フィールド除去
      // photos は URL のまま保持（base64には変換しない）
      return o;
    });

    const exportObj = {
      exported_at: new Date().toISOString(),
      recipes: expRecipes,
      notes_and_tips: notes || []
    };

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const a = document.createElement('a');
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    a.download = `recipes_${dateStr}.json`;
    a.click();
  } catch (err) {
    alert('エクスポートに失敗しました: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = origText;
  }
}

// ----- データ読み込み -----
async function loadRecipes() {
  const { data } = await window.supabase
    .from('recipes').select('*').order('created_at', { ascending: false });
  recipes = data || [];
  updateSelects();
  render();
}
