export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed uploads: extension → MIME type served back. */
export const ALLOWED_DOCUMENTS: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
};

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_DOCUMENTS)
  .map((e) => `.${e}`)
  .join(",");

// ---------------------------------------------------------------- notes scanner

export const MAX_SCAN_PAGES = 12;
/** Per photo, after the browser has reduced it (≈ 2 000 px): keeps a full scan under the 11 MB request limit. */
export const MAX_SCAN_PHOTO_BYTES = 3 * 1024 * 1024;
/** Long side of the photos sent by the browser. */
export const SCAN_UPLOAD_MAX_SIDE = 2000;
