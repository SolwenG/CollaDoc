#!/usr/bin/env -S node
import type { Contract as End } from "../../snapshots/07051170eadf552fc9f08e44c0fd57d54176cebf62a448808bff8833407b6491/contract";
import endContract from "../../snapshots/07051170eadf552fc9f08e44c0fd57d54176cebf62a448808bff8833407b6491/contract.json" with { type: "json" };
import type { Contract as Start } from "../../snapshots/c9b8642a1f68e6bd61803df5ce9bef027963adf1d830ccca7dc970704bf05882/contract";
import startContract from "../../snapshots/c9b8642a1f68e6bd61803df5ce9bef027963adf1d830ccca7dc970704bf05882/contract.json" with { type: "json" };
import {
  Migration,
  MigrationCLI,
  col,
  lit,
} from "@prisma/orm-postgres/migration";

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: "public",
        table: "User",
        column: col("mfaFailedAttempts", "int4", {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: "pg/int4@1" },
        }),
      }),
      this.addColumn({
        schema: "public",
        table: "User",
        column: col("mfaLockedUntil", "timestamptz", {
          codecRef: { codecId: "pg/timestamptz-string@1" },
        }),
      }),
      this.addColumn({
        schema: "public",
        table: "User",
        column: col("totpLastUsedStep", "int4", {
          codecRef: { codecId: "pg/int4@1" },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
