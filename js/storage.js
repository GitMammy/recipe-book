// ===== storage.js =====
// Supabase Storage への画像アップロード・削除

function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const raw = window.atob(parts[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: 'image/webp' });
}

async function uploadToStorage(photo) {
  if (photo.data && photo.data.startsWith('http')) return photo.data;
  const blob = base64ToBlob(photo.data);
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(-5)}.webp`;
  const { error } = await window.supabase
    .storage.from('recipe-photos')
    .upload(fileName, blob, { contentType: 'image/webp', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = window.supabase
    .storage.from('recipe-photos')
    .getPublicUrl(fileName);
  return publicUrl;
}

async function deleteStoragePhotos(photoUrls) {
  if (!photoUrls || !photoUrls.length) return;
  const fileNames = photoUrls.map(url => url.split('/').pop());
  const { error } = await window.supabase
    .storage.from('recipe-photos')
    .remove(fileNames);
  if (error) console.warn('Storage delete error:', error);
}

// 画像をリサイズして base64 で返す共通関数
function resizeImageFile(file, maxPx = 1200) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = (img.width > maxPx || img.height > maxPx)
          ? maxPx / Math.max(img.width, img.height) : 1;
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
