import "server-only";

import JSZip from "jszip";

import { extractPdfText } from "./pdf";

export type ExtractKind = "pdf" | "text" | "docx" | "pptx";

export const SUPPORTED_TYPES: Record<string, ExtractKind> = {
  "application/pdf": "pdf",
  "text/plain": "text",
  "text/markdown": "text",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
};

/** Human readable list used in validation messages. */
export const ACCEPTED_EXTENSIONS = ".pdf, .docx, .pptx, .txt, .md";

const LEGACY_OFFICE: Record<string, string> = {
  doc: "Word 97-2003 (.doc) files cannot be read. Open the file and save it as .docx, then upload again.",
  ppt: "PowerPoint 97-2003 (.ppt) files cannot be read. Save the slides as .pptx, then upload again.",
};

function extensionOf(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Browsers occasionally report Office files as application/octet-stream, so the
 * extension is used as a fallback.
 */
export function detectKind(
  fileName: string,
  mimeType: string,
): ExtractKind | null {
  const byMime = SUPPORTED_TYPES[mimeType];
  if (byMime) return byMime;

  const extension = extensionOf(fileName);

  if (extension === "pdf") return "pdf";
  if (extension === "docx") return "docx";
  if (extension === "pptx") return "pptx";
  if (extension === "txt" || extension === "md") return "text";

  return null;
}

export function unsupportedMessage(fileName: string) {
  const legacy = LEGACY_OFFICE[extensionOf(fileName)];
  return legacy ?? `Only ${ACCEPTED_EXTENSIONS} files can be indexed.`;
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&");
}

/** Strips XML tags while keeping paragraph boundaries as line breaks. */
function xmlToText(xml: string, paragraphClose: string) {
  const withBreaks = xml
    .replace(new RegExp(`</${paragraphClose}>`, "g"), "\n")
    .replace(/<w:br\s*\/>/g, "\n")
    .replace(/<w:tab\s*\/>/g, "\t");

  const withoutTags = withBreaks.replace(/<[^>]+>/g, "");

  return decodeEntities(withoutTags)
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file("word/document.xml");

  if (!entry) {
    throw new Error("This file does not contain a Word document body.");
  }

  const text = xmlToText(await entry.async("string"), "w:p");

  return { text, pageCount: null };
}

async function extractPptx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const slides = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const number = (value: string) =>
        Number(value.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      return number(a) - number(b);
    });

  if (!slides.length) {
    throw new Error("This file does not contain any slides.");
  }

  const parts: string[] = [];

  for (const [index, name] of slides.entries()) {
    const xml = await zip.file(name)!.async("string");
    const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) =>
      decodeEntities(match[1]),
    );

    const body = runs.join(" ").replace(/\s+/g, " ").trim();
    if (body) parts.push(`Slide ${index + 1}: ${body}`);
  }

  return { text: parts.join("\n\n"), pageCount: slides.length };
}

export async function extractDocument(
  buffer: Buffer,
  kind: ExtractKind,
): Promise<{ text: string; pageCount: number | null }> {
  if (kind === "pdf") {
    const result = await extractPdfText(buffer);
    return { text: result.text, pageCount: result.pageCount };
  }

  if (kind === "docx") return extractDocx(buffer);
  if (kind === "pptx") return extractPptx(buffer);

  return {
    text: buffer.toString("utf8").replace(/\r\n/g, "\n").trim(),
    pageCount: null,
  };
}
