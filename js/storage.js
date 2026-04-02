/* コメント　
storage.js が担当する機能

Supabase Storage への画像アップロード
アップロード後の URL を recipe_edit.js に渡す
プレビュー表示
画像削除（必要なら）
detail.html でも使えるように共通化
*/ 

// --------------------------------------
// 画像アップロード（複数対応）
// --------------------------------------
async function uploadPhotos(files) {
  if (!files || !files.length) return [];

  const uploadedUrls = [];

  for (const file of files) {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `recipe_photos/${fileName}`;

    // Supabase Storage にアップロード
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      alert('画像アップロードに失敗しました');
      continue;
    }

    // 公開 URL を取得
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    uploadedUrls.push(urlData.publicUrl);
  }

  return uploadedUrls;
}


// --------------------------------------
// input[type=file] の変更イベント
// --------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById('photoInput');
  if (!input) return;

  input.addEventListener('change', async () => {
    const files = input.files;
    if (!files.length) return;

    // アップロード
    const urls = await uploadPhotos(files);

    // recipe_edit.js で使うために保存
    window.currentUploadedPhotos = [
      ...(window.currentUploadedPhotos || []),
      ...urls
    ];

    // プレビュー更新
    updatePhotoPreview();
  });
});


// --------------------------------------
// プレビュー表示
// --------------------------------------
function updatePhotoPreview() {
  const preview = document.getElementById('photoPreview');
  if (!preview) return;

  preview.innerHTML = '';

  (window.currentUploadedPhotos || []).forEach(url => {
    preview.innerHTML += `
      <div class="preview-item">
        <img src="${url}" class="preview-img">
        <button class="preview-del-btn" onclick="removePhoto('${url}')">×</button>
      </div>
    `;
  });
}


// --------------------------------------
// 写真削除（プレビューから）
// --------------------------------------
function removePhoto(url) {
  window.currentUploadedPhotos = (window.currentUploadedPhotos || []).filter(
    u => u !== url
  );
  updatePhotoPreview();
}


/* コメント　
このファイルが依存しているもの
config.js → supabase
recipe_edit.js → window.currentUploadedPhotos
ui.js → showOverlay/hideOverlay（直接は使わないが連携）
*/ 
