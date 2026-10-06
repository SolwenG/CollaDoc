#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract';
import startContract from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b7916d221c965d8303e0ad2175c3a81cce41d1fc771af35dd8e1aaaa84e1a214/contract';
import endContract from '../../snapshots/b7916d221c965d8303e0ad2175c3a81cce41d1fc771af35dd8e1aaaa84e1a214/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Post' }),
      this.dropColumn({ schema: 'public', table: 'User', column: 'name' }),
      this.dropConstraint({ schema: 'public', table: 'User', constraint: 'User_email_key' }),
      this.dropColumn({ schema: 'public', table: 'User', column: 'email' }),
      this.createTable({
        schema: 'public',
        table: 'Document',
        columns: [
          col('content', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('folderId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastModifiedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('mimeType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originalName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revision', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('size', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('snapshotRevision', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('storagePath', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Document_kind_check_74d9448e', "\"kind\" IN ('TEXT', 'FILE')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'DocumentMember',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('invitedById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['documentId', 'userId']),
          checkExpression('DocumentMember_role_check_6cfd078f', "\"role\" IN ('EDITOR', 'VIEWER')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'DocumentOperation',
        columns: [
          col('authorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('length', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revision', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('text', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'DocumentOperation_type_check_c40a7336',
            "\"type\" IN ('INSERT', 'DELETE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Folder',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('parentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Message',
        columns: [
          col('authorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Session',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastUsedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('mfaVerified', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('blockedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('blockedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('createdById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('mustChangePassword', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('role', 'text', {
          notNull: true,
          default: lit('USER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('totpEnabledAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('totpSecret', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('displayName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      // Les lignes User héritées du scaffold (sans mot de passe) ne sont pas des comptes valides : on les supprime.
      this.dataTransform(contract, 'backfill-User-displayName', {
        check: () => db.public.User.select('id').where((f, fns) => fns.eq(f.displayName, null)).limit(1),
        run: () => db.public.User.delete().where((f, fns) => fns.eq(f.displayName, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'User', column: 'displayName' }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      // Les lignes User héritées du scaffold (sans mot de passe) ne sont pas des comptes valides : on les supprime.
      this.dataTransform(contract, 'backfill-User-passwordHash', {
        check: () => db.public.User.select('id').where((f, fns) => fns.eq(f.passwordHash, null)).limit(1),
        run: () => db.public.User.delete().where((f, fns) => fns.eq(f.passwordHash, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'User', column: 'passwordHash' }),
      // Les lignes User héritées du scaffold (sans mot de passe) ne sont pas des comptes valides : on les supprime.
      this.dataTransform(contract, 'handle-nulls-User-username', {
        check: () => db.public.User.select('id').where((f, fns) => fns.eq(f.username, null)).limit(1),
        run: () => db.public.User.delete().where((f, fns) => fns.eq(f.username, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'User', column: 'username' }),
      this.addUnique({
        schema: 'public',
        table: 'DocumentOperation',
        constraint: 'DocumentOperation_documentId_revision_key',
        columns: ['documentId', 'revision'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Folder',
        constraint: 'Folder_ownerId_parentId_name_key',
        columns: ['ownerId', 'parentId', 'name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Session',
        constraint: 'Session_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_1954e8c0',
        expression: "\"role\" IN ('USER', 'ADMIN')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_username_key',
        columns: ['username'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_folderId_idx_5985e562',
        columns: ['folderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_lastModifiedById_idx_f811679d',
        columns: ['lastModifiedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_ownerId_folderId_idx_e5008c91',
        columns: ['ownerId', 'folderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DocumentMember',
        index: 'DocumentMember_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DocumentMember',
        index: 'DocumentMember_invitedById_idx_61689f37',
        columns: ['invitedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DocumentMember',
        index: 'DocumentMember_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DocumentOperation',
        index: 'DocumentOperation_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DocumentOperation',
        index: 'DocumentOperation_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Folder',
        index: 'Folder_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Folder',
        index: 'Folder_parentId_idx_6a68f597',
        columns: ['parentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Folder',
        index: 'Folder_root_name_unique_0d8a2683',
        columns: ['ownerId', 'name'],
        extras: { where: '"parentId" IS NULL', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_documentId_createdAt_idx_93015d6d',
        columns: ['documentId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Message',
        index: 'Message_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_blockedById_idx_60a57bcc',
        columns: ['blockedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Document',
        foreignKey: {
          name: 'Document_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Document',
        foreignKey: {
          name: 'Document_folderId_fkey',
          columns: ['folderId'],
          references: { schema: 'public', table: 'Folder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Document',
        foreignKey: {
          name: 'Document_lastModifiedById_fkey',
          columns: ['lastModifiedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DocumentMember',
        foreignKey: {
          name: 'DocumentMember_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'Document', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DocumentMember',
        foreignKey: {
          name: 'DocumentMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DocumentMember',
        foreignKey: {
          name: 'DocumentMember_invitedById_fkey',
          columns: ['invitedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DocumentOperation',
        foreignKey: {
          name: 'DocumentOperation_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'Document', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DocumentOperation',
        foreignKey: {
          name: 'DocumentOperation_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Folder',
        foreignKey: {
          name: 'Folder_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'Folder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Folder',
        foreignKey: {
          name: 'Folder_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'Document', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Message',
        foreignKey: {
          name: 'Message_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'Session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'User_blockedById_fkey',
          columns: ['blockedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'User_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
