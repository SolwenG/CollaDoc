#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/98d98839e88b0f388d1f161e27e4b79abbfa4e0ed6b55759ad5ec950d68cd7df/contract'
import endContract from '../../snapshots/98d98839e88b0f388d1f161e27e4b79abbfa4e0ed6b55759ad5ec950d68cd7df/contract.json' with { type: 'json' }
import type { Contract as Start } from '../../snapshots/b7916d221c965d8303e0ad2175c3a81cce41d1fc771af35dd8e1aaaa84e1a214/contract'
import startContract from '../../snapshots/b7916d221c965d8303e0ad2175c3a81cce41d1fc771af35dd8e1aaaa84e1a214/contract.json' with { type: 'json' }
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration'

export default class M extends Migration<Start, End> {
    override readonly startContractJson = startContract
    override readonly endContractJson = endContract

    override get operations() {
        return [
            this.dropColumn({
                schema: 'public',
                table: 'Document',
                column: 'snapshotRevision',
            }),
            this.addColumn({
                schema: 'public',
                table: 'Document',
                column: col('displayedVersion', 'int4', {
                    notNull: true,
                    default: lit(0),
                    codecRef: { codecId: 'pg/int4@1' },
                }),
            }),
        ]
    }
}

MigrationCLI.run(import.meta.url, M)
