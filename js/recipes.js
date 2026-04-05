// ===== recipes.js =====
// 260405 1405
// レシピ一覧描画・詳細モーダル・♡★♚トグル・JSONエクスポート・データ読み込み

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
const FIXED_CATS   = ['焼き菓子','おやつ','パート','ヘルシー？','揚げ菓子','パン','冷菓','氷菓','飲み物'];
const FIXED_GENRES = ['フランス','ドイツ','日本','イタリア','アメリカ','アジア','洋菓子'];

function updateSelects() {
  const cats = [...FIXED_CATS], genres = [...FIXED_GENRES];
  recipes.forEach(r => {
    if (r.cat   && !cats.includes(r.cat))     cats.push(r.cat);
    if (r.genre && !genres.includes(r.genre)) genres.push(r.genre);
  });
  const sc = document.getElementById('filterCat');
  const cv = sc.value;
  sc.innerHTML = '<option value="">カテゴリ：すべて</option>' +
    cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  sc.value = cv;

  // 編集フォームの datalist も更新（固定リスト＋DB分）
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
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.toggle(`active-${type}`, markFilters[type]);
  render();
}

// ----- 一覧描画 -----
function render() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  const q   = document.getElementById('search').value.trim().toLowerCase();
  const cat = document.getElementById('filterCat').value;
  const p   = document.getElementById('filterPub').value;

  let list = recipes.slice();

  // 閲覧モードは非公開除外
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

  // マークフィルター
  if (markFilters.heart) list = list.filter(r => r.heart);
  if (markFilters.star)  list = list.filter(r => r.fav);
  if (markFilters.crown) list = list.filter(r => r.crown);

  document.getElementById('countBar').textContent = list.length + ' 件';

  grid.innerHTML = list.map(r => {
    const thumb = getThumb(r);
    const heartsHtml = isEditor
      ? `<div class="hearts">
           <button class="heart-btn${r.heart ? ' on' : ''}" onclick="toggleHeart(event,'${r.id}')">♡</button>
           <button class="star-btn${r.fav   ? ' on' : ''}" onclick="toggleStar(event,'${r.id}')">★</button>
           <button class="crown-btn${r.crown ? ' on' : ''}" onclick="toggleCrown(event,'${r.id}')">♚</button>
         </div>`
      : `<div class="hearts">
           <span style="color:${r.heart ? '#D4537E' : '#ccc'}">♡</span>
           <span style="color:${r.fav   ? '#BA7517' : '#ccc'}">★</span>
           <span style="color:${r.crown ? '#FFD700' : '#ccc'}">♚</span>
         </div>`;

    return `
      <div class="card" onclick="openDetail('${r.id}')">
        ${thumb
          ? `<img src="${thumb}" class="card-img">`
          : `<div class="card-img-placeholder">${getCatEmoji(r.cat)}</div>`}
        <div class="card-body">
          <div class="card-top">
            <div class="card-title">${esc(r.name)}</div>
            ${heartsHtml}
          </div>
          ${r.desc ? `<div class="card-desc">${esc(r.desc)}</div>` : ''}
          <div class="card-tags">
            ${r.cat   ? `<span class="tag t-cat">${esc(r.cat)}</span>`   : ''}
            ${r.genre ? `<span class="tag t-ing">${esc(r.genre)}</span>` : ''}
            ${isEditor ? `<span class="tag ${r.pub ? 't-pub' : 't-priv'}">${r.pub ? '公開' : '非公開'}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ----- ♡★♚ -----
function toggleHeart(e, id) {
  e.preventDefault(); e.stopPropagation();
  const r = recipes.find(x => String(x.id) === String(id));
  if (r) { r.heart = !r.heart; saveStatus(r.id, r.heart, r.fav, r.crown); render(); }
}
function toggleStar(e, id) {
  e.preventDefault(); e.stopPropagation();
  const r = recipes.find(x => String(x.id) === String(id));
  if (r) { r.fav = !r.fav; saveStatus(r.id, r.heart, r.fav, r.crown); render(); }
}
function toggleCrown(e, id) {
  e.preventDefault(); e.stopPropagation();
  const r = recipes.find(x => String(x.id) === String(id));
  if (r) { r.crown = !r.crown; saveStatus(r.id, r.heart, r.fav, r.crown); render(); }
}

async function saveStatus(id, heart, fav, crown) {
  const { error } = await window.supabase
    .from('recipes').update({ heart, fav, crown }).eq('id', String(id));
  if (error) console.error('Status Update Error:', error);
}

// ----- 材料 HTML（詳細表示用）-----
function ingNameHtml(name, currentId) {
  const found = recipes.find(x => x.name === name && String(x.id) !== String(currentId));
  if (found) return `<span class="ing-link" onclick="event.stopPropagation();openDetail('${found.id}')">${esc(name)}</span>`;
  return esc(name);
}

function renderIngSection(r) {
  const parts = r.ingParts || r.ing_parts || [];
  const row2tr = row =>
    `<tr>
      <td style="padding:4px 6px;border-bottom:1px solid #f5f5f5">${ingNameHtml(row.name, r.id)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#666">${esc(row.amt)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #f5f5f5;color:#888">${esc(row.note)}</td>
    </tr>`;
  const wrapTable = rows =>
    `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px"><tbody>${rows.map(row2tr).join('')}</tbody></table>`;

  if (parts.length) {
    const hasLabels = parts.some(p => p && p.label);
    return parts.map(p => {
      if (!p || !p.rows) return '';
      const lh = (hasLabels && p.label && p.label !== '説明')
        ? `<div style="font-size:12px;font-weight:500;color:#72243E;margin:10px 0 4px">
             <span style="background:#f0e0eb;padding:3px 10px;border-radius:5px;display:inline-block">${esc(p.label)}</span>
           </div>` : '';
      return lh + wrapTable(p.rows);
    }).join('');
  }
  if (r.ingRows && r.ingRows.length) return wrapTable(r.ingRows);
  if (r.ingDetail) return `<p style="font-size:13px;line-height:1.7;white-space:pre-wrap">${esc(r.ingDetail)}</p>`;
  return '';
}

// ----- 詳細モーダル -----
async function openDetail(id) {
  const r = recipes.find(x => String(x.id) === String(id));
  if (!r) return;

  const { data: notes, error: notesError } = await window.supabase
    .from('notes_and_tips')
    .select('*')
    .eq('recipe_id', String(id))
    .order('created_at', { ascending: true });

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

  const heartsHtml = isEditor
    ? `<div style="display:flex;gap:4px;flex-shrink:0">
         <button class="heart-btn${r.heart ? ' on' : ''}" onclick="toggleHeart(event,'${r.id}');openDetail('${r.id}')">♡</button>
         <button class="star-btn${r.fav   ? ' on' : ''}" onclick="toggleStar(event,'${r.id}');openDetail('${r.id}')">★</button>
         <button class="crown-btn${r.crown ? ' on' : ''}" onclick="toggleCrown(event,'${r.id}');openDetail('${r.id}')">♚</button>
       </div>`
    : `<div style="display:flex;gap:4px;flex-shrink:0">
         <span style="color:${r.heart ? '#D4537E' : '#ccc'}">♡</span>
         <span style="color:${r.fav   ? '#BA7517' : '#ccc'}">★</span>
         <span style="color:${r.crown ? '#FFD700' : '#ccc'}">♚</span>
       </div>`;

  const pubTagHtml = isEditor
    ? `<span class="tag ${r.pub ? 't-pub' : 't-priv'}">${r.pub ? '公開' : '非公開'}</span>` : '';

  let html = `<div class="detail-top"><h2>${esc(r.name)}</h2>${heartsHtml}</div>`;

  if (r.desc) html += `<p style="font-size:13px;color:#555;line-height:1.7;margin-bottom:0.8rem">${esc(r.desc)}</p>`;

  const tagsRow = (r.cat ? `<span class="tag t-cat">${esc(r.cat)}</span>` : '') +
    (r.genre ? `<span class="tag t-ing">${esc(r.genre)}</span>` : '') + pubTagHtml;
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
      <h3>📝 レシピメモ</h3>
      ${notesHtml}
    </div>`;

  html += `<div style="font-size:11px;color:#aaa;margin-top:1.5rem;margin-bottom:1rem">${r.date || ''}</div>`;
  html += `<div class="modal-btns"><div></div><div class="modal-btns-right">
    <button class="btn btn-sm" onclick="closeOverlay('overlayDetail')">閉じる</button>
    ${isEditor ? `<button class="btn btn-sm btn-accent" onclick="openEdit('${r.id}')">編集</button>` : ''}
  </div></div>`;

  document.getElementById('detailContent').innerHTML = html;
  document.getElementById('overlayDetail').scrollTop = 0;
  openOverlay('overlayDetail');
}

// ----- JSON エクスポート -----
function exportData() {
  const exp = recipes.map(r => { const o = { ...r }; delete o.img; o.photos = []; return o; });
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exp, null, 2));
  a.download = 'recipes.json';
  a.click();
}

// ----- データ読み込み -----
async function loadRecipes() {
  const { data } = await window.supabase
    .from('recipes').select('*').order('created_at', { ascending: false });
  recipes = data || [];
  updateSelects();
  render();
}
