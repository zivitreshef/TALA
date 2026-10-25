/**
 * Lightweight IndexedDB storage for original assessment files (PDFs, DOCX, scans).
 * Allows viewing and downloading files without exceeding Firestore document size limits.
 */

const DB_NAME = 'tala_dossier_files_v1';
const STORE_NAME = 'files';

function openDb() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'docId' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

export async function saveDossierFileBlob(docId, file) {
  if (!docId || !file) return false;
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        docId,
        fileName: file.name,
        fileType: file.type || file.name.split('.').pop() || '',
        blob: file,
        savedAt: new Date().toISOString()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

export async function getDossierFileBlob(docId) {
  if (!docId) return null;
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(docId);
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

export async function deleteDossierFileBlob(docId) {
  if (!docId) return false;
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(docId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}

/**
 * Downloads the document. If blob exists in IndexedDB, downloads the exact original file.
 * Otherwise falls back to text content if available.
 */
export async function triggerDossierDownload(docRecord) {
  if (!docRecord) return;
  const docId = docRecord.id;
  const fileName = docRecord.fileName || 'מסמך_אבחון';

  // 1. Try to get original blob from IndexedDB
  const blob = await getDossierFileBlob(docId);
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  // 2. Fallback: if we only have extracted text
  if (docRecord.fullText) {
    const textBlob = new Blob([docRecord.fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(textBlob);
    const a = document.createElement('a');
    a.href = url;
    const downloadName = fileName.replace(/\.[^.]+$/, '') + '.txt';
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  alert('הקובץ המקורי אינו זמין להורדה בדפדפן זה.');
}

/**
 * Opens document for viewing. For PDF with blob: opens in a new tab.
 * For text: returns false so the caller can open the text reader modal.
 */
export async function openDossierFilePreview(docRecord) {
  if (!docRecord) return false;
  const isPdf =
    (docRecord.fileType || '').toLowerCase() === 'pdf' ||
    (docRecord.fileName || '').toLowerCase().endsWith('.pdf');
  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(
    (docRecord.fileType || '').toLowerCase()
  );

  if (isPdf || isImage) {
    const blob = await getDossierFileBlob(docRecord.id);
    if (blob) {
      const mime = isPdf ? 'application/pdf' : blob.type || 'image/jpeg';
      const fileBlob = new Blob([blob], { type: mime });
      const url = URL.createObjectURL(fileBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return true;
    }
  }
  return false;
}
