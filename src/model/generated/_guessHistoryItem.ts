import assert from "assert"
import * as marshal from "./marshal"

export class GuessHistoryItem {
    private _attemptNumber!: number
    private _guess!: number
    private _result!: string

    constructor(props?: Partial<Omit<GuessHistoryItem, 'toJSON'>>, json?: any) {
        Object.assign(this, props)
        if (json != null) {
            this._attemptNumber = marshal.int.fromJSON(json.attemptNumber)
            this._guess = marshal.int.fromJSON(json.guess)
            this._result = marshal.string.fromJSON(json.result)
        }
    }

    get attemptNumber(): number {
        assert(this._attemptNumber != null, 'uninitialized access')
        return this._attemptNumber
    }

    set attemptNumber(value: number) {
        this._attemptNumber = value
    }

    get guess(): number {
        assert(this._guess != null, 'uninitialized access')
        return this._guess
    }

    set guess(value: number) {
        this._guess = value
    }

    get result(): string {
        assert(this._result != null, 'uninitialized access')
        return this._result
    }

    set result(value: string) {
        this._result = value
    }

    toJSON(): object {
        return {
            attemptNumber: this.attemptNumber,
            guess: this.guess,
            result: this.result,
        }
    }
}
