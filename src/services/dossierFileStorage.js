/**
 * Hybrid local & Cloud Storage for assessment files (PDFs, DOCX, scans).
 * Combines local IndexedDB (instant offline access) with Firebase Cloud Storage (cross-teacher sharing).
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from '../firebaseBackend';

export const MAX_DOSSIER_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

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
 * Uploads original assessment file to Firebase Storage so colleagues can access it.
 * Resolves to { storagePath, storageUrl } or null if unavailable.
 */
export async function uploadDossierFileToCloud(docId, file, studentId = 'general') {
  if (!docId || !file) return null;
  const storage = getFirebaseStorage();
  if (!storage) return null;

  try {
    const cleanFileName = (file.name || 'document')
      .replace(/[^a-zA-Z0-9._\-\u0590-\u05FF]/g, '_');
    const safeStudentId = String(studentId || 'general').replace(/[^a-zA-Z0-9._\-]/g, '_');
    const storagePath = `dossier_files/${safeStudentId}/${docId}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        docId,
        originalName: file.name
      }
    });

    const storageUrl = await getDownloadURL(storageRef);
    return { storagePath, storageUrl };
  } catch (err) {
    console.warn('Failed to upload dossier file to Firebase Storage:', err);
    return null;
  }
}

/**
 * Removes file from Firebase Storage when teacher deletes the document.
 */
export async function deleteDossierFileFromCloud(storagePath) {
  if (!storagePath) return false;
  const storage = getFirebaseStorage();
  if (!storage) return false;

  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('Failed to delete dossier file from Cloud Storage:', err);
    return false;
  }
}

/**
 * Downloads the document.
 * 1. Checks local IndexedDB blob (fastest, offline).
 * 2. If missing (e.g. colleague's device), fetches from Firebase Storage URL and caches locally.
 * 3. Falls back to extracted text if original binary is not available.
 */
export async function triggerDossierDownload(docRecord) {
  if (!docRecord) return;
  const docId = docRecord.id;
  const fileName = docRecord.fileName || 'מסמך_אבחון';

  // 1. Try local IndexedDB blob
  const localBlob = await getDossierFileBlob(docId);
  if (localBlob) {
    const url = URL.createObjectURL(localBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  // 2. Fetch from Firebase Storage URL
  if (docRecord.storageUrl) {
    try {
      const res = await fetch(docRecord.storageUrl);
      if (res.ok) {
        const cloudBlob = await res.blob();
        const url = URL.createObjectURL(cloudBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        // Cache locally for next time
        try {
          await saveDossierFileBlob(docId, new File([cloudBlob], fileName, { type: cloudBlob.type }));
        } catch (_) {}
        return;
      }
    } catch (_) {
      // Direct browser download via link fallback
      const a = document.createElement('a');
      a.href = docRecord.storageUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }

  // 3. Fallback: if we only have extracted text
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

  alert('הקובץ המקורי אינו זמין להורדה.');
}

/**
 * Opens document for viewing. For PDF with blob/storageUrl: opens in a new tab.
 * For text: returns false so caller opens the text reader modal.
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

    if (docRecord.storageUrl) {
      window.open(docRecord.storageUrl, '_blank');
      return true;
    }
  }
  return false;
}
