import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { canUploadToCourse, getCourseForUser } from "@/lib/courses";
import { embedTexts } from "@/lib/ai/gemini";
import { chunkText } from "@/lib/ai/retrieval";
import { MAX_UPLOAD_BYTES } from "@/lib/pdf";
import {
  detectKind,
  extractDocument,
  unsupportedMessage,
} from "@/lib/extract";
import { saveUpload } from "@/lib/storage";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!canUploadToCourse(user)) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const courseId = String(form.get("courseId") ?? "");
  const titleInput = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (!courseId) {
    return NextResponse.json({ error: "Select a course." }, { status: 400 });
  }

  const course = await getCourseForUser(courseId, user);
  if (!course) {
    return NextResponse.json(
      { error: "You do not have access to that course." },
      { status: 403 },
    );
  }

  const kind = detectKind(file.name, file.type);
  if (!kind) {
    return NextResponse.json(
      { error: unsupportedMessage(file.name) },
      { status: 415 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 15 MB." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let text = "";
  let pageCount: number | null = null;

  try {
    const extracted = await extractDocument(buffer, kind);
    text = extracted.text;
    pageCount = extracted.pageCount;
  } catch (error) {
    await logEvent({
      level: "ERROR",
      category: "UPLOAD",
      message: "Text extraction failed",
      detail: `${file.name} (${file.type}, ${file.size} bytes): ${
        error instanceof Error ? error.message : "unknown error"
      }`,
      userId: user.id,
    });

    return NextResponse.json(
      {
        error:
          "That file could not be read. Try a different format or re-export it.",
      },
      { status: 422 },
    );
  }

  if (text.length < 80) {
    await logEvent({
      level: "WARN",
      category: "UPLOAD",
      message: "Upload contained no readable text",
      detail: `${file.name} — ${text.length} characters extracted`,
      userId: user.id,
    });

    return NextResponse.json(
      {
        error:
          "No readable text was found in that file. Try a clearer image or a text-based document.",
      },
      { status: 422 },
    );
  }

  const storedName = await saveUpload(file.name, buffer);
  const title =
    titleInput || file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");

  const pieces = chunkText(text).slice(0, 250);

  // Embeddings are best-effort: if the key is missing or the call fails the
  // chunks are still stored and retrieval degrades to lexical search.
  const vectors = await embedTexts(pieces);

  const document = await db.document.create({
    data: {
      title,
      description: description || null,
      courseId: course.id,
      uploadedById: user.id,
      fileName: storedName,
      fileType: file.type,
      fileSize: file.size,
      pageCount: pageCount || null,
      charCount: text.length,
      status: "READY",
      chunks: {
        create: pieces.map((content, index) => ({
          chunkIndex: index,
          content,
          embedding: vectors?.[index]
            ? JSON.stringify(vectors[index])
            : null,
        })),
      },
    },
  });

  return NextResponse.json({
    ok: true,
    document: {
      id: document.id,
      title: document.title,
      chunks: pieces.length,
      embedded: Boolean(vectors),
    },
  });
}
