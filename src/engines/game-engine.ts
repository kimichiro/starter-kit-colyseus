import { Schema } from '@colyseus/schema'
import { GameTimer } from './game-timer'

export interface GameContext {
    timer: GameTimer
}

export abstract class GameEngine<State extends Schema, Settings extends object> {
    #state: State
    #started: boolean
    #context: GameContext
    #settings: Settings

    constructor(state: State) {
        this.#state = state
        this.#started = false
    }

    get state(): State {
        return this.#state
    }

    get started(): boolean {
        return this.#started
    }

    get context(): GameContext {
        if (this.#context == null) {
            throw new Error(`Engine is not setup yet`)
        }
        return this.#context
    }

    get settings(): Settings {
        if (this.#settings == null) {
            throw new Error(`Engine is not setup yet`)
        }
        return this.#settings
    }

    setup(context: GameContext, settings: Settings): void {
        this.#context = context
        this.#settings = settings

        this.onSetup(settings)

        this.#started = true
    }

    protected abstract onSetup(settings: Settings): void
}
