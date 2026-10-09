import { db } from "../prisma/db.ts";

const FOLDER_FIELDS = [
  "id",
  "name",
  "parentId",
  "createdAt",
  "updatedAt",
] as const;

export function findOwnedFolder(folderId: number, ownerId: number) {
  return db.orm.public.Folder.where({ id: folderId, ownerId })
    .select(...FOLDER_FIELDS)
    .first();
}

export type FolderRow = NonNullable<
  Awaited<ReturnType<typeof findOwnedFolder>>
>;

export function findChildFolders(ownerId: number, parentId: number | null) {
  return db.orm.public.Folder.where({ ownerId, parentId })
    .select(...FOLDER_FIELDS)
    .orderBy([(f) => f.name.asc(), (f) => f.id.asc()])
    .all();
}

export type FolderPathEntry = { id: number; name: string };

/** From the root down to the folder itself (included), empty when it is not owned */
export async function findFolderPath(
  folderId: number,
  ownerId: number,
): Promise<FolderPathEntry[]> {
  const plan = db.raw.sql`
    WITH RECURSIVE path AS (
      SELECT id, name, "parentId", 0 AS depth
      FROM "Folder"
      WHERE id = ${folderId} AND "ownerId" = ${ownerId}
      UNION ALL
      SELECT f.id, f.name, f."parentId", p.depth + 1
      FROM "Folder" f
      JOIN path p ON f.id = p."parentId"
    )
    SELECT id, name FROM path ORDER BY depth DESC
  `
    .returnsRow({ id: "pg/int4@1", name: "pg/text@1" })
    .build();
  return db.runtime().query(plan).toArray();
}

/** Every document stored somewhere under the folder, sub-folders included */
export async function findSubtreeDocuments(folderId: number) {
  const plan = db.raw.sql`
    WITH RECURSIVE tree AS (
      SELECT id FROM "Folder" WHERE id = ${folderId}
      UNION ALL
      SELECT f.id FROM "Folder" f JOIN tree t ON f."parentId" = t.id
    )
    SELECT d.id, d.kind, d."storagePath"
    FROM "Document" d
    WHERE d."folderId" IN (SELECT id FROM tree)
  `
    .returnsRow({
      id: "pg/int4@1",
      kind: "pg/text@1",
      storagePath: { codecId: "pg/text@1", nullable: true },
    })
    .build();
  return db.runtime().query(plan).toArray();
}

export function createFolder(
  ownerId: number,
  name: string,
  parentId: number | null,
) {
  return db.orm.public.Folder.select(...FOLDER_FIELDS).create({
    name,
    ownerId,
    parentId,
  });
}

export function updateFolder(
  folderId: number,
  changes: { name?: string; parentId?: number | null },
) {
  return db.orm.public.Folder.where({ id: folderId })
    .select(...FOLDER_FIELDS)
    .update(changes);
}

/** The database cascades to sub-folders, documents, members, operations and messages */
export async function deleteFolder(folderId: number) {
  await db.orm.public.Folder.where({ id: folderId }).deleteAll();
}
