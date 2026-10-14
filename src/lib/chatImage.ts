/** Client-side image prep for SupportChat gallery uploads. */

const MAX_EDGE_PX = 1280;
const MAX_BYTES = 900_000; // keep data URLs under ~1MB for vision payloads
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function isAllowedChatImage(file: File): boolean {
  return ACCEPT.includes(file.type) && file.size <= 8 * 1024 * 1024;
}

/** Resize/compress an image file to a JPEG/WebP data URL suitable for chat + vision. */
export async function fileToChatDataUrl(file: File): Promise<string> {
  if (!isAllowedChatImage(file)) {
    throw new Error("Use a JPG, PNG, or WebP under 8MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process image.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_BYTES && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_BYTES) {
    throw new Error("Image is still too large after compression. Try a smaller photo.");
  }
  return dataUrl;
}
