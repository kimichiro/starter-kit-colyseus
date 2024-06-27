import { Schema } from '@colyseus/schema'

export abstract class GameEngine<State extends Schema, Settings extends object> {
    #state: State
    #settings: Settings

    constructor(state: State, settings: Settings) {
        this.#state = state
        this.#settings = settings
    }

    get state(): State {
        return this.#state
    }

    get settings(): Settings {
        return this.#settings
    }

    setup(settings: Settings): void {
        this.#settings = settings ?? this.#settings
        this.onSetup(settings)
    }

    protected abstract onSetup(settings: Settings): void
}
