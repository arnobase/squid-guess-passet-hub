import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {GameStartedEvent} from "./gameStartedEvent.model"
import {GuessSubmittedEvent} from "./guessSubmittedEvent.model"
import {ClueGivenEvent} from "./clueGivenEvent.model"
import {GameOverEvent} from "./gameOverEvent.model"
import {GameCancelledEvent} from "./gameCancelledEvent.model"
import {MaxAttemptsUpdatedEvent} from "./maxAttemptsUpdatedEvent.model"
import {MintEvent} from "./mintEvent.model"
import {BurntEvent} from "./burntEvent.model"
import {TransferEvent} from "./transferEvent.model"
import {ApprovalEvent} from "./approvalEvent.model"
import {ApprovalForAllEvent} from "./approvalForAllEvent.model"

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

    @OneToMany_(() => GameOverEvent, e => e.contract)
    gameOverEvents!: GameOverEvent[]

    @OneToMany_(() => GameCancelledEvent, e => e.contract)
    gameCancelledEvents!: GameCancelledEvent[]

    @OneToMany_(() => MaxAttemptsUpdatedEvent, e => e.contract)
    maxAttemptsUpdatedEvents!: MaxAttemptsUpdatedEvent[]

    @OneToMany_(() => MintEvent, e => e.contract)
    mintEvents!: MintEvent[]

    @OneToMany_(() => BurntEvent, e => e.contract)
    burntEvents!: BurntEvent[]

    @OneToMany_(() => TransferEvent, e => e.contract)
    transferEvents!: TransferEvent[]

    @OneToMany_(() => ApprovalEvent, e => e.contract)
    approvalEvents!: ApprovalEvent[]

    @OneToMany_(() => ApprovalForAllEvent, e => e.contract)
    approvalForAllEvents!: ApprovalForAllEvent[]
}
