import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

export type ExtractedDocument = {
  text: string;
  pageCount: number;
};

/**
 * Extracts plain text from a PDF buffer. Text-based PDFs (the normal case for
 * lecture notes exported from Word or PowerPoint) extract cleanly; scanned
 * image-only PDFs return very little text and are reported as such.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedDocument> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });

  const text = Array.isArray(result.text)
    ? result.text.join("\n\n")
    : result.text;

  return {
    text: normalise(text),
    pageCount: result.totalPages ?? 0,
  };
}

export function extractPlainText(buffer: Buffer): ExtractedDocument {
  return {
    text: normalise(buffer.toString("utf-8")),
    pageCount: 0,
  };
}

function normalise(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const SUPPORTED_TYPES: Record<string, "pdf" | "text"> = {
  "application/pdf": "pdf",
  "text/plain": "text",
  "text/markdown": "text",
};

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
