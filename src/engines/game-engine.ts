import { Schema } from '@colyseus/schema'
import { GameTimer } from './game-timer'

export interface GameContext {
    timer: GameTimer
}

export abstract class GameEngine<State extends Schema, Settings extends object> {
    #state: State
    #context: GameContext
    #settings: Settings

    constructor(state: State, settings: Settings) {
        this.#state = state
        this.#settings = settings
    }

    get state(): State {
        return this.#state
    }

    get context(): GameContext {
        if (this.#settings == null) {
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
        this.#settings = settings ?? this.#settings

        this.onSetup(settings)
    }

    protected abstract onSetup(settings: Settings): void
}
