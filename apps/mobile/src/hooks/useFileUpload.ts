import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { Attachment } from "@openslaq/shared";
import { env } from "@/lib/env";

export interface PendingFile {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  isImage: boolean;
}

interface UseFileUploadReturn {
  pendingFiles: PendingFile[];
  uploading: boolean;
  error: string | null;
  addFromImagePicker: () => Promise<void>;
  addFromCamera: () => Promise<void>;
  addFromDocumentPicker: () => Promise<void>;
  addFile: (file: PendingFile) => void;
  removeFile: (id: string) => void;
  uploadAll: (getToken: () => Promise<string>) => Promise<string[]>;
  reset: () => void;
  hasFiles: boolean;
}

let nextId = 0;
function genId(): string {
  return `file-${++nextId}-${Date.now()}`;
}

export function useFileUpload(): UseFileUploadReturn {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFromImagePicker = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const files: PendingFile[] = result.assets.map((asset) => ({
      id: genId(),
      uri: asset.uri,
      name: asset.fileName ?? `image_${Date.now()}`,
      mimeType: asset.mimeType ?? "image/jpeg",
      isImage: (asset.mimeType ?? "image/jpeg").startsWith("image/"),
    }));
    setPendingFiles((prev) => [...prev, ...files]);
    setError(null);
  }, []);

  const addFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission is required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const file: PendingFile = {
      id: genId(),
      uri: asset.uri,
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      isImage: true,
    };
    setPendingFiles((prev) => [...prev, file]);
    setError(null);
  }, []);

  const addFromDocumentPicker = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      multiple: true,
    });
    if (result.canceled) return;

    const files: PendingFile[] = result.assets.map((asset) => ({
      id: genId(),
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      isImage: (asset.mimeType ?? "").startsWith("image/"),
    }));
    setPendingFiles((prev) => [...prev, ...files]);
    setError(null);
  }, []);

  const addFile = useCallback((file: PendingFile) => {
    setPendingFiles((prev) => [...prev, file]);
    setError(null);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadAll = useCallback(
    async (getToken: () => Promise<string>): Promise<string[]> => {
      if (pendingFiles.length === 0) return [];

      setUploading(true);
      setError(null);

      try {
        const token = await getToken();
        const formData = new FormData();
        for (const file of pendingFiles) {
          formData.append("files", {
            uri: file.uri,
            name: file.name,
            type: file.mimeType,
          } as unknown as Blob);
        }

        const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/uploads`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const body = (await res.json()) as { error: string };
          throw new Error(body.error || "Upload failed");
        }

        const data = (await res.json()) as { attachments: Attachment[] };
        return data.attachments.map((a) => a.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [pendingFiles],
  );

  const reset = useCallback(() => {
    setPendingFiles([]);
    setError(null);
  }, []);

  return {
    pendingFiles,
    uploading,
    error,
    addFromImagePicker,
    addFromCamera,
    addFromDocumentPicker,
    addFile,
    removeFile,
    uploadAll,
    reset,
    hasFiles: pendingFiles.length > 0,
  };
}
