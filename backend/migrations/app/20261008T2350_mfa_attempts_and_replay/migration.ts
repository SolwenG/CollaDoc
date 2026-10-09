#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/64e5a1146d5566ffad9e608d6b656b732d8169cfe180a40aa5bca74660973d6a/contract'
import endContract from '../../snapshots/64e5a1146d5566ffad9e608d6b656b732d8169cfe180a40aa5bca74660973d6a/contract.json' with { type: 'json' }
import type { Contract as Start } from '../../snapshots/994a75a912216a8b7d2249b56e0451dc87766d642201f12c22d1a260e2fc54a4/contract'
import startContract from '../../snapshots/994a75a912216a8b7d2249b56e0451dc87766d642201f12c22d1a260e2fc54a4/contract.json' with { type: 'json' }
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration'

export default class M extends Migration<Start, End> {
    override readonly startContractJson = startContract
    override readonly endContractJson = endContract

    override get operations() {
        return [
            this.addColumn({
                schema: 'public',
                table: 'User',
                column: col('mfaFailedAttempts', 'int4', {
                    notNull: true,
                    default: lit(0),
                    codecRef: { codecId: 'pg/int4@1' },
                }),
            }),
            this.addColumn({
                schema: 'public',
                table: 'User',
                column: col('mfaLockedUntil', 'timestamptz', {
                    codecRef: { codecId: 'pg/timestamptz-string@1' },
                }),
            }),
            this.addColumn({
                schema: 'public',
                table: 'User',
                column: col('totpLastUsedStep', 'int4', {
                    codecRef: { codecId: 'pg/int4@1' },
                }),
            }),
        ]
    }
}

MigrationCLI.run(import.meta.url, M)
