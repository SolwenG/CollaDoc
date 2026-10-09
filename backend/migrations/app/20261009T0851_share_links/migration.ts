#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/26532dda379663502b99447df447df1d67bada05a3693ed45e170db3055b1f93/contract';
import endContract from '../../snapshots/26532dda379663502b99447df447df1d67bada05a3693ed45e170db3055b1f93/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/64e5a1146d5566ffad9e608d6b656b732d8169cfe180a40aa5bca74660973d6a/contract';
import startContract from '../../snapshots/64e5a1146d5566ffad9e608d6b656b732d8169cfe180a40aa5bca74660973d6a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ShareLink',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('documentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('ShareLink_role_check_6cfd078f', "\"role\" IN ('EDITOR', 'VIEWER')"),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ShareLink',
        constraint: 'ShareLink_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ShareLink',
        index: 'ShareLink_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ShareLink',
        index: 'ShareLink_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ShareLink',
        foreignKey: {
          name: 'ShareLink_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'Document', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ShareLink',
        foreignKey: {
          name: 'ShareLink_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
