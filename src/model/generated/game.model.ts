import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, Index as Index_, StringColumn as StringColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_, ManyToOne as ManyToOne_} from "@subsquid/typeorm-store"
import * as marshal from "./marshal"
import {Contract} from "./contract.model"
import {GuessHistoryItem} from "./_guessHistoryItem"

@Entity_()
export class Game {
    constructor(props?: Partial<Game>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @BigIntColumn_({nullable: false})
    gameNumber!: bigint

    @StringColumn_({nullable: false})
    player!: string

    @IntColumn_({nullable: false})
    minNumber!: number

    @IntColumn_({nullable: false})
    maxNumber!: number

    @IntColumn_({nullable: false})
    attempt!: number

    @IntColumn_({nullable: true})
    lastGuess!: number | undefined | null

    @StringColumn_({nullable: true})
    lastClue!: string | undefined | null

    @Index_()
    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @Index_()
    @IntColumn_({nullable: false})
    createdAtBlock!: number

    @Index_()
    @ManyToOne_(() => Contract, {nullable: true})
    contract!: Contract

    @Column_("jsonb", {transformer: {to: obj => obj.map((val: any) => val.toJSON()), from: obj => obj == null ? undefined : marshal.fromList(obj, val => new GuessHistoryItem(undefined, marshal.nonNull(val)))}, nullable: false})
    guessHistory!: (GuessHistoryItem)[]
}
