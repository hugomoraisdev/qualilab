import { uploadFileToStorage } from "@/lib/storage-upload.functions";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read error"));
    reader.readAsDataURL(file);
  });
}

export async function uploadToStorage(bucket: string, path: string, file: File): Promise<string> {
  const contentBase64 = await fileToBase64(file);
  const { publicUrl } = await uploadFileToStorage({
    data: {
      bucket,
      path,
      contentBase64,
      contentType: file.type || "application/octet-stream",
    },
  });
  return publicUrl;
}
