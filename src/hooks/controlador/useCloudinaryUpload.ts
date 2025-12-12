import { useState, useCallback } from 'react';

// Cloudinary configuration (public credentials for unsigned uploads)
const CLOUDINARY_CLOUD_NAME = 'dwhl67ka5';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resource_type: string;
  created_at: string;
  original_filename: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseCloudinaryUploadOptions {
  folder?: string;
  tags?: string[];
  transformation?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UseCloudinaryUploadReturn {
  upload: (file: File, options?: UseCloudinaryUploadOptions) => Promise<CloudinaryUploadResult>;
  uploadMultiple: (files: File[], options?: UseCloudinaryUploadOptions) => Promise<CloudinaryUploadResult[]>;
  uploadFromDataUrl: (dataUrl: string, options?: UseCloudinaryUploadOptions) => Promise<CloudinaryUploadResult>;
  isUploading: boolean;
  progress: UploadProgress | null;
  error: Error | null;
  reset: () => void;
}

export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  const uploadFile = useCallback(async (
    fileOrDataUrl: File | string,
    options?: UseCloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult> => {
    setIsUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: 100, percentage: 0 });

    try {
      const formData = new FormData();
      
      if (typeof fileOrDataUrl === 'string') {
        // It's a data URL
        formData.append('file', fileOrDataUrl);
      } else {
        // It's a File object
        formData.append('file', fileOrDataUrl);
      }
      
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      
      if (options?.folder) {
        formData.append('folder', options.folder);
      }
      
      if (options?.tags && options.tags.length > 0) {
        formData.append('tags', options.tags.join(','));
      }

      if (options?.transformation) {
        formData.append('transformation', options.transformation);
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progressData: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            setProgress(progressData);
            options?.onProgress?.(progressData);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText) as CloudinaryUploadResult;
            setIsUploading(false);
            setProgress({ loaded: 100, total: 100, percentage: 100 });
            resolve(result);
          } else {
            const errorMessage = xhr.responseText || 'Error al subir archivo';
            const uploadError = new Error(errorMessage);
            setError(uploadError);
            setIsUploading(false);
            reject(uploadError);
          }
        });

        xhr.addEventListener('error', () => {
          const uploadError = new Error('Error de red al subir archivo');
          setError(uploadError);
          setIsUploading(false);
          reject(uploadError);
        });

        xhr.addEventListener('abort', () => {
          const uploadError = new Error('Subida cancelada');
          setError(uploadError);
          setIsUploading(false);
          reject(uploadError);
        });

        xhr.open('POST', CLOUDINARY_UPLOAD_URL);
        xhr.send(formData);
      });
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Error desconocido');
      setError(uploadError);
      setIsUploading(false);
      throw uploadError;
    }
  }, []);

  const upload = useCallback(async (
    file: File,
    options?: UseCloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult> => {
    return uploadFile(file, options);
  }, [uploadFile]);

  const uploadFromDataUrl = useCallback(async (
    dataUrl: string,
    options?: UseCloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult> => {
    return uploadFile(dataUrl, options);
  }, [uploadFile]);

  const uploadMultiple = useCallback(async (
    files: File[],
    options?: UseCloudinaryUploadOptions
  ): Promise<CloudinaryUploadResult[]> => {
    setIsUploading(true);
    setError(null);
    
    const results: CloudinaryUploadResult[] = [];
    const totalFiles = files.length;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadFile(file, {
          ...options,
          onProgress: (fileProgress) => {
            const overallPercentage = Math.round(
              ((i + fileProgress.percentage / 100) / totalFiles) * 100
            );
            const overallProgress: UploadProgress = {
              loaded: i + fileProgress.percentage / 100,
              total: totalFiles,
              percentage: overallPercentage,
            };
            setProgress(overallProgress);
            options?.onProgress?.(overallProgress);
          },
        });
        results.push(result);
      }
      
      setIsUploading(false);
      return results;
    } catch (err) {
      setIsUploading(false);
      throw err;
    }
  }, [uploadFile]);

  return {
    upload,
    uploadMultiple,
    uploadFromDataUrl,
    isUploading,
    progress,
    error,
    reset,
  };
}
