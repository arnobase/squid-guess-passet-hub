import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {GameStartedEvent} from "./gameStartedEvent.model"
import {GuessSubmittedEvent} from "./guessSubmittedEvent.model"
import {ClueGivenEvent} from "./clueGivenEvent.model"

@Entity_()
export class Contract {
    constructor(props?: Partial<Contract>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: true})
    codeHash!: string | undefined | null

    @DateTimeColumn_({nullable: false})
    instantiatedAt!: Date

    @IntColumn_({nullable: false})
    instantiatedAtBlock!: number

    @StringColumn_({nullable: false})
    instantiatedBy!: string

    @OneToMany_(() => GameStartedEvent, e => e.contract)
    gameStartedEvents!: GameStartedEvent[]

    @OneToMany_(() => GuessSubmittedEvent, e => e.contract)
    guessSubmittedEvents!: GuessSubmittedEvent[]

    @OneToMany_(() => ClueGivenEvent, e => e.contract)
    clueGivenEvents!: ClueGivenEvent[]
}
