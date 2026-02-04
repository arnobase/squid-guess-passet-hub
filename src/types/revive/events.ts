import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const contractEmitted =  {
    name: 'Revive.ContractEmitted',
    /**
     * A custom event emitted by the contract.
     */
    v100: new EventType(
        'Revive.ContractEmitted',
        sts.struct({
            /**
             * The contract that emitted the event.
             */
            contract: v100.H160,
            /**
             * Data supplied by the contract. Metadata generated during contract compilation
             * is needed to decode it.
             */
            data: sts.bytes(),
            /**
             * A list of topics used to index the event.
             * Number of topics is capped by [`limits::NUM_EVENT_TOPICS`].
             */
            topics: sts.array(() => v100.H256),
        })
    ),
}
