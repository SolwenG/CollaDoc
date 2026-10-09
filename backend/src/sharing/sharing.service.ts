import { createHmac, timingSafeEqual } from "node:crypto";
import * as z from "zod";
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

/** Read at import time: a missing or short secret stops the server at startup, not at the first share */
const SHARE_LINK_SECRET = loadShareLinkSecret();

function loadShareLinkSecret(): Buffer {
  const secret = Buffer.from(process.env["SHARE_LINK_SECRET"] ?? "", "base64");
  if (secret.length < 32) {
    throw new Error(
      "SHARE_LINK_SECRET must be at least 32 bytes encoded in base64",
    );
  }
  return secret;
}

// Everything the server needs is in the token: nothing is stored in the database
const shareLinkPayloadSchema = z.object({
  documentId: z.number(),
  role: z.enum(["EDITOR", "VIEWER"]),
  createdById: z.number(),
  expiresAt: z.number(), // ms since epoch
});

type ShareLinkPayload = z.infer<typeof shareLinkPayloadSchema>;

function sign(data: string): Buffer {
  return createHmac("sha256", SHARE_LINK_SECRET).update(data).digest();
}

/** "payload.signature", each part in base64url ("." is outside that alphabet) */
function encodeShareToken(payload: ShareLinkPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data).toString("base64url")}`;
}

/** Null when the token is malformed or was not signed by this server */
function decodeShareToken(token: string): ShareLinkPayload | null {
  const [data, signature, ...rest] = token.split(".");
  if (!data || !signature || rest.length > 0) return null;

  const expected = sign(data);
  const received = Buffer.from(signature, "base64url");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  try {
    const json = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    const parsed = shareLinkPayloadSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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

export function createShareLink(
  documentId: number,
  role: MemberRole,
  createdById: number,
) {
  const expiresAt = Date.now() + SHARE_LINK_TTL_MS;
  const token = encodeShareToken({ documentId, role, createdById, expiresAt });

  return { role, expiresAt: new Date(expiresAt).toISOString(), token };
}

export async function acceptShareLink(
  token: string,
  userId: number,
): Promise<AcceptResult> {
  const link = decodeShareToken(token);

  if (!link) throw shareLinkNotFound();
  if (link.expiresAt <= Date.now()) {
    throw new AppError("SHARE_LINK_EXPIRED", "Ce lien d'invitation a expiré");
  }

  const { documentId } = link;
  const document = await db.orm.public.Document.select("ownerId")
    .where({ id: documentId })
    .first();
  // The document may have been deleted since the link was created
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

// A link not yet expired still lets the removed member back in
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
