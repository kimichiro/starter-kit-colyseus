import { Schema } from '@colyseus/schema'

export interface GameContext {}

export abstract class GameEngine<State extends Schema, Context extends GameContext, Settings extends object> {
    #state: State
    #started: boolean
    #context: Context
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

    get context(): Context {
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

    init(context: Context): void {
        this.#context = context
        this.onInit()
    }

    setup(settings: Settings): void {
        this.#settings = settings
        this.onSetup(settings)

        this.#started = true
    }

    protected abstract onInit(): void
    protected abstract onSetup(settings: Settings): void
}
