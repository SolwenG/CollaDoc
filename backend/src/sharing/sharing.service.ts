import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../errors/app-error.ts";
import { db } from "../prisma/db.ts";
import type { CreateShareLinkInput } from "./sharing.schema.ts";

export const SHARE_LINK_TTL_MS = 60 * 60 * 1000;

type MemberRole = CreateShareLinkInput["role"];

// The higher the rank, the more rights the role grants
const ROLE_RANK: Record<MemberRole, number> = { VIEWER: 1, EDITOR: 2 };

export type AcceptResult = {
  documentId: number;
  role: MemberRole | "OWNER";
  outcome: "owner" | "joined" | "upgraded" | "unchanged";
};

// Same recipe as the session token (auth/session.ts): only the hash is stored
function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function documentNotFound(): AppError {
  return new AppError("DOCUMENT_NOT_FOUND", "Document introuvable");
}

function shareLinkNotFound(): AppError {
  return new AppError(
    "SHARE_LINK_NOT_FOUND",
    "Ce lien d'invitation n'existe pas",
  );
}

function memberNotFound(): AppError {
  return new AppError(
    "MEMBER_NOT_FOUND",
    "Cette personne n'est pas membre du document",
  );
}

/** Lets the owner through; someone with no access cannot even tell the document exists */
export async function assertDocumentOwner(documentId: number, userId: number) {
  const document = await db.orm.public.Document.select("ownerId")
    .where({ id: documentId })
    .first();
  if (!document) throw documentNotFound();
  if (document.ownerId === userId) return;

  const member = await db.orm.public.DocumentMember.select("role")
    .where({ documentId, userId })
    .first();
  if (!member) throw documentNotFound();
  throw new AppError(
    "FORBIDDEN",
    "Seul le propriétaire peut gérer le partage de ce document",
  );
}

export async function createShareLink(
  documentId: number,
  role: MemberRole,
  createdById: number,
) {
  const token = generateShareToken();
  const link = await db.orm.public.ShareLink.select(
    "id",
    "role",
    "expiresAt",
    "createdAt",
  ).create({
    tokenHash: hashShareToken(token),
    documentId,
    role,
    createdById,
    expiresAt: new Date(Date.now() + SHARE_LINK_TTL_MS).toISOString(),
  });

  // The only time the token leaves the server: the database keeps its hash alone
  return { ...link, token };
}

export async function listActiveShareLinks(documentId: number) {
  const now = new Date().toISOString();
  return db.orm.public.ShareLink.select("id", "role", "expiresAt", "createdAt")
    .where((l) => l.documentId.eq(documentId))
    .where((l) => l.revokedAt.isNull())
    .where((l) => l.expiresAt.gt(now))
    .orderBy((l) => l.createdAt.desc())
    .all();
}

export async function revokeShareLink(documentId: number, linkId: number) {
  // documentId too: an owner cannot reach the links of another document
  const link = await db.orm.public.ShareLink.select("revokedAt")
    .where({ id: linkId, documentId })
    .first();
  if (!link) {
    throw new AppError("SHARE_LINK_NOT_FOUND", "Lien de partage introuvable");
  }
  if (link.revokedAt !== null) return;

  await db.orm.public.ShareLink.where({ id: linkId }).update({
    revokedAt: new Date().toISOString(),
  });
}

export async function acceptShareLink(
  token: string,
  userId: number,
): Promise<AcceptResult> {
  const link = await db.orm.public.ShareLink.select(
    "documentId",
    "role",
    "createdById",
    "expiresAt",
    "revokedAt",
  )
    .where({ tokenHash: hashShareToken(token) })
    .first();

  if (!link) throw shareLinkNotFound();
  if (link.revokedAt !== null) {
    throw new AppError(
      "SHARE_LINK_REVOKED",
      "Ce lien d'invitation a été révoqué par le propriétaire du document",
    );
  }
  if (new Date(link.expiresAt).getTime() <= Date.now()) {
    throw new AppError("SHARE_LINK_EXPIRED", "Ce lien d'invitation a expiré");
  }

  const { documentId } = link;
  const document = await db.orm.public.Document.select("ownerId")
    .where({ id: documentId })
    .first();
  // The links are deleted with their document; this covers the moment in between
  if (!document) throw shareLinkNotFound();
  if (document.ownerId === userId) {
    return { documentId, role: "OWNER", outcome: "owner" };
  }

  const member = await db.orm.public.DocumentMember.select("role")
    .where({ documentId, userId })
    .first();

  if (!member) {
    await db.orm.public.DocumentMember.create({
      documentId,
      userId,
      role: link.role,
      invitedById: link.createdById,
    });
    return { documentId, role: link.role, outcome: "joined" };
  }

  // Only ever upgrade: a VIEWER link never demotes an EDITOR
  if (ROLE_RANK[link.role] > ROLE_RANK[member.role]) {
    await db.orm.public.DocumentMember.where({ documentId, userId }).update({
      role: link.role,
    });
    return { documentId, role: link.role, outcome: "upgraded" };
  }

  return { documentId, role: member.role, outcome: "unchanged" };
}

export async function listMembers(documentId: number) {
  return db.orm.public.DocumentMember.select("role", "createdAt")
    .where({ documentId })
    .include("user", (user) => user.select("id", "username", "displayName"))
    .orderBy((m) => m.createdAt.asc())
    .all();
}

export async function updateMemberRole(
  documentId: number,
  ownerId: number,
  userId: number,
  role: MemberRole,
) {
  if (userId === ownerId) {
    throw new AppError(
      "CANNOT_CHANGE_OWNER_ROLE",
      "Le rôle du propriétaire ne peut pas être modifié",
    );
  }

  const updated = await db.orm.public.DocumentMember.where({
    documentId,
    userId,
  }).update({ role });
  if (!updated) throw memberNotFound();
}

// A link still active lets the removed member back in: it has to be revoked as well
export async function removeMember(
  documentId: number,
  ownerId: number,
  userId: number,
) {
  if (userId === ownerId) {
    throw new AppError(
      "CANNOT_REMOVE_OWNER",
      "Le propriétaire ne peut pas être retiré de son document",
    );
  }

  const removed = await db.orm.public.DocumentMember.where({
    documentId,
    userId,
  }).delete();
  if (!removed) throw memberNotFound();
}
