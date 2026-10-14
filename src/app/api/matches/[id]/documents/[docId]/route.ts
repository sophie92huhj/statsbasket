import { NextResponse } from "next/server";
import { deleteMatchDocument, getMatchDocument } from "@/lib/repositories/matchDocument";
import { requireApiSession } from "@/lib/auth/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const { id, docId } = await params;
  const document = await getMatchDocument(auth.teamId, id, docId);
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  return new NextResponse(new Uint8Array(document.data), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(document.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id, docId } = await params;
  if (!(await deleteMatchDocument(auth.teamId, id, docId))) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
