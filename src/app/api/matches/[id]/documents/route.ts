import { NextResponse } from "next/server";
import { createMatchDocument, listMatchDocuments } from "@/lib/repositories/matchDocument";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 Mo

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documents = await listMatchDocuments(id);
  return NextResponse.json(documents);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Le fichier dépasse la taille maximale de 15 Mo." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const document = await createMatchDocument({
    matchId,
    fileName: file.name || "feuille-de-match.pdf",
    contentType: file.type,
    fileSize: file.size,
    data: new Uint8Array(arrayBuffer),
  });

  return NextResponse.json(
    { id: document.id, fileName: document.fileName, contentType: document.contentType, fileSize: document.fileSize },
    { status: 201 },
  );
}
