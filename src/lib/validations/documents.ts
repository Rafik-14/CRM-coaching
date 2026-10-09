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
