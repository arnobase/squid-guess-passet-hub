import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {Game} from "./game.model"
import {Token} from "./token.model"

@Entity_()
export class Player {
    constructor(props?: Partial<Player>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @OneToMany_(() => Game, e => e.player)
    games!: Game[]

    @OneToMany_(() => Token, e => e.owner)
    tokens!: Token[]

    @IntColumn_({nullable: true})
    maxMaxAttempts!: number | undefined | null

    @IntColumn_({nullable: false})
    totalGames!: number

    @IntColumn_({nullable: false})
    totalWins!: number

    @IntColumn_({nullable: false})
    totalTokens!: number

    @DateTimeColumn_({nullable: false})
    firstSeenAt!: Date

    @IntColumn_({nullable: false})
    firstSeenAtBlock!: number

    @DateTimeColumn_({nullable: false})
    lastActiveAt!: Date

    @IntColumn_({nullable: false})
    lastActiveAtBlock!: number
}
