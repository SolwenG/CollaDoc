#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/994a75a912216a8b7d2249b56e0451dc87766d642201f12c22d1a260e2fc54a4/contract";
import endContract from "../../snapshots/994a75a912216a8b7d2249b56e0451dc87766d642201f12c22d1a260e2fc54a4/contract.json" with { type: "json" };
import type { Contract as Start } from "../../snapshots/c9b8642a1f68e6bd61803df5ce9bef027963adf1d830ccca7dc970704bf05882/contract";
import startContract from "../../snapshots/c9b8642a1f68e6bd61803df5ce9bef027963adf1d830ccca7dc970704bf05882/contract.json" with { type: "json" };
import {
  Migration,
  MigrationCLI,
  col,
  lit,
} from "@prisma/orm-postgres/migration";
import postgres from "@prisma/orm-postgres/runtime";

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({
        schema: "public",
        table: "Document",
        column: "displayedVersion",
      }),
      this.dropColumn({
        schema: "public",
        table: "Document",
        column: "revision",
      }),
      this.dropCheckConstraint({
        schema: "public",
        table: "DocumentOperation",
        constraint: "DocumentOperation_type_check_c40a7336",
      }),
      this.dropColumn({
        schema: "public",
        table: "DocumentOperation",
        column: "length",
      }),
      this.dropColumn({
        schema: "public",
        table: "DocumentOperation",
        column: "position",
      }),
      this.dropColumn({
        schema: "public",
        table: "DocumentOperation",
        column: "text",
      }),
      this.dropColumn({
        schema: "public",
        table: "DocumentOperation",
        column: "type",
      }),
      this.addColumn({
        schema: "public",
        table: "Document",
        column: col("contentRevision", "int4", {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: "pg/int4@1" },
        }),
      }),
      this.addColumn({
        schema: "public",
        table: "DocumentOperation",
        column: col("opId", "text", { codecRef: { codecId: "pg/text@1" } }),
      }),
      // Old atomic operations cannot be converted: the log is emptied
      this.dataTransform(contract, "backfill-DocumentOperation-opId", {
        check: () =>
          db.public.DocumentOperation.select("id")
            .where((f, fns) => fns.eq(f.opId, null))
            .limit(1),
        run: () =>
          db.public.DocumentOperation.delete().where((f, fns) =>
            fns.eq(f.opId, null),
          ),
      }),
      this.setNotNull({
        schema: "public",
        table: "DocumentOperation",
        column: "opId",
      }),
      this.addColumn({
        schema: "public",
        table: "DocumentOperation",
        column: col("operation", "json", {
          codecRef: { codecId: "pg/json@1" },
        }),
      }),
      this.dataTransform(contract, "backfill-DocumentOperation-operation", {
        check: () =>
          db.public.DocumentOperation.select("id")
            .where((f, fns) => fns.eq(f.operation, null))
            .limit(1),
        run: () =>
          db.public.DocumentOperation.delete().where((f, fns) =>
            fns.eq(f.operation, null),
          ),
      }),
      this.setNotNull({
        schema: "public",
        table: "DocumentOperation",
        column: "operation",
      }),
      this.addUnique({
        schema: "public",
        table: "DocumentOperation",
        constraint: "DocumentOperation_opId_key",
        columns: ["opId"],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
