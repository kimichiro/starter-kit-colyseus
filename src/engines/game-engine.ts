import { Schema } from '@colyseus/schema'

export abstract class GameEngine<State extends Schema, Settings extends object> {
    #state: State
    #settings: Settings

    constructor(state: State) {
        this.#state = state
        this.#settings = {} as Settings
    }

    get state(): State {
        return this.#state
    }

    get settings(): Settings {
        return this.#settings
    }

    setup(settings: Settings): void {
        this.#settings = settings ?? ({} as Settings)
        this.onSetup(settings)
    }

    protected abstract onSetup(settings: Settings): void
}
