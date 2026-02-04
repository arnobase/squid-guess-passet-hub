import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, BooleanColumn as BooleanColumn_} from "@subsquid/typeorm-store"
import {Contract} from "./contract.model"
import {Player} from "./player.model"

@Entity_()
export class Token {
    constructor(props?: Partial<Token>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Contract, {nullable: true})
    contract!: Contract

    @Index_()
    @BigIntColumn_({nullable: false})
    tokenId!: bigint

    @Index_()
    @ManyToOne_(() => Player, {nullable: true})
    owner!: Player

    @Index_()
    @StringColumn_({nullable: false})
    ownerAddress!: string

    @Index_()
    @DateTimeColumn_({nullable: false})
    mintedAt!: Date

    @Index_()
    @IntColumn_({nullable: false})
    mintedAtBlock!: number

    @BigIntColumn_({nullable: true})
    maxAttempts!: bigint | undefined | null

    @BooleanColumn_({nullable: false})
    burnt!: boolean

    @DateTimeColumn_({nullable: true})
    burntAt!: Date | undefined | null

    @IntColumn_({nullable: true})
    burntAtBlock!: number | undefined | null
}
