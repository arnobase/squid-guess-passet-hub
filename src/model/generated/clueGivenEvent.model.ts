import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {Contract} from "./contract.model"

@Entity_()
export class ClueGivenEvent {
    constructor(props?: Partial<ClueGivenEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Contract, {nullable: true})
    contract!: Contract

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @StringColumn_({nullable: true})
    extrinsicHash!: string | undefined | null

    @StringColumn_({nullable: false})
    contractAddress!: string

    @Index_()
    @BigIntColumn_({nullable: false})
    gameNumber!: bigint

    @IntColumn_({nullable: false})
    attemptNumber!: number

    @IntColumn_({nullable: false})
    guess!: number

    @StringColumn_({nullable: false})
    result!: string
}
