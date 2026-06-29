import { useState } from 'react';
import { apiClient } from './apiClient';
import { extractError } from './useList';

/**
 * Hook upload ảnh qua API backend (POST /uploads).
 * Trả về URL công khai để lưu vào trường dữ liệu (vd qr_image_url).
 */
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data?.url ?? null;
    } catch (err) {
      setError(extractError(err));
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error };
}
