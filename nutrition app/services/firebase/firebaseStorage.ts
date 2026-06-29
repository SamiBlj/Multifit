import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';

export type UploadProgressCallback = (progress: number) => void;

async function uploadFile(
  path: string,
  uri: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob);

    task.on(
      'state_changed',
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress?.(Math.round(pct));
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      },
    );
  });
}

export async function uploadProgressPhoto(
  uid: string,
  localUri: string,
  angle: 'front' | 'side' | 'back' | 'other' = 'front',
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const timestamp = Date.now();
  const path = `progress_photos/${uid}/${angle}_${timestamp}.jpg`;
  return uploadFile(path, localUri, onProgress);
}

export async function uploadMealImage(
  uid: string,
  localUri: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  const timestamp = Date.now();
  const path = `meal_images/${uid}/${timestamp}.jpg`;
  return uploadFile(path, localUri, onProgress);
}

export async function deleteFile(downloadUrl: string): Promise<void> {
  const fileRef = ref(storage, downloadUrl);
  await deleteObject(fileRef);
}
