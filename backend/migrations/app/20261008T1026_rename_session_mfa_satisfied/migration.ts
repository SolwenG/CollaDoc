#!/usr/bin/env -S node
import type { Contract as Start } from "../../snapshots/98d98839e88b0f388d1f161e27e4b79abbfa4e0ed6b55759ad5ec950d68cd7df/contract";
import startContract from "../../snapshots/98d98839e88b0f388d1f161e27e4b79abbfa4e0ed6b55759ad5ec950d68cd7df/contract.json" with { type: "json" };
import type { Contract as End } from "../../snapshots/c9b8642a1f68e6bd61803df5ce9bef027963adf1d830ccca7dc970704bf05882/contract";
import endContract from "../../snapshots/c9b8642a1f68e6bd61803df5ce9bef027963adf1d830ccca7dc970704bf05882/contract.json" with { type: "json" };
import {
  Migration,
  MigrationCLI,
  rawSql,
} from "@prisma/orm-postgres/migration";

const COLUMN_EXISTS_SQL =
  'SELECT EXISTS (SELECT 1 AS "one" FROM "information_schema"."columns" WHERE ("table_schema" = $1 AND "table_name" = $2 AND "column_name" = $3)) AS "result"';
const COLUMN_MISSING_SQL =
  'SELECT NOT EXISTS (SELECT 1 AS "one" FROM "information_schema"."columns" WHERE ("table_schema" = $1 AND "table_name" = $2 AND "column_name" = $3)) AS "result"';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  // The planner cannot detect a rename: it emitted drop + add + backfill + set not null,
  // which loses every value. A single RENAME COLUMN keeps them.
  override get operations() {
    return [
      rawSql({
        id: "renameColumn.Session.mfaVerified.mfaSatisfied",
        label: 'Rename column "mfaVerified" to "mfaSatisfied" on "Session"',
        operationClass: "destructive",
        target: {
          id: "postgres",
          details: {
            schema: "public",
            objectType: "column",
            name: "mfaSatisfied",
            table: "Session",
          },
        },
        precheck: [
          {
            description: 'ensure column "mfaVerified" exists',
            sql: COLUMN_EXISTS_SQL,
            params: ["public", "Session", "mfaVerified"],
          },
          {
            description: 'ensure column "mfaSatisfied" is missing',
            sql: COLUMN_MISSING_SQL,
            params: ["public", "Session", "mfaSatisfied"],
          },
        ],
        execute: [
          {
            description: 'rename column "mfaVerified" to "mfaSatisfied"',
            sql: 'ALTER TABLE "public"."Session" RENAME COLUMN "mfaVerified" TO "mfaSatisfied"',
          },
        ],
        postcheck: [
          {
            description: 'verify column "mfaSatisfied" exists',
            sql: COLUMN_EXISTS_SQL,
            params: ["public", "Session", "mfaSatisfied"],
          },
          {
            description: 'verify column "mfaVerified" does not exist',
            sql: COLUMN_MISSING_SQL,
            params: ["public", "Session", "mfaVerified"],
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
