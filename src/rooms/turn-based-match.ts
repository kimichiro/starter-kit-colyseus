import { Client, Room } from 'colyseus'
import { IncomingMessage } from 'http'
import { container } from 'tsyringe'

import { Connection, GameAction, GamePlayer, TurnBasedEngine } from '../engines/turn-based-engine'

export interface AuthObject {
    id: string
    name: string
}

// #region Client messages

export const SeatRequestMessageType = 'seat-request'
export interface SeatRequestPayload {}

export const ActionMoveMessageType = 'action-move'
export interface ActionMovePayload<Action extends GameAction = GameAction> {
    action: Action
}

// #endregion

// #region Server messages

export const GameStartedMessageType = 'game-started'
export interface GameStartedPayload {}

export const GameEndedMessageType = 'game-ended'
export interface GameEndedPayload {}

// #endregion

export class TurnBasedMatch extends Room {
    #players: Map<string, GamePlayer>
    #engine: TurnBasedEngine
    #options?: unknown

    static async onAuth(token: string, _: IncomingMessage): Promise<AuthObject> {
        // Authenticate user
        return JSON.parse(Buffer.from(token, 'base64').toString())
    }

    onCreate(options?: unknown): void {
        this.#players = new Map<string, GamePlayer>()

        this.#engine = container.resolve(this.roomName)
        this.setState(this.#engine.state)

        this.#options = options

        // Setup event handling
        this.onMessage(SeatRequestMessageType, this.onRequestSeat.bind(this))
        this.onMessage(ActionMoveMessageType, this.onActionMove.bind(this))
    }

    async onJoin(client: Client, _?: unknown, auth?: AuthObject): Promise<void> {
        if (auth == null) {
            client.leave()
            return
        }

        const player = new GamePlayer(auth.id, auth.name, new Connection())
        this.#players.set(client.sessionId, player)

        // Lock room when reaches total number of players
        if (this.clients.length === this.#engine.maxPlayers) {
            await this.lock()
        }

        // TODO: Reconnect user with auth.id (cookie: visitorId)
    }

    onLeave(client: Client, _: boolean): void {
        // Update the presence of the member of the room
        this.#players.delete(client.sessionId)

        // TODO: Suspend user with auth.id (cookie: visitorId)
    }

    onBeforePatch(): void {
        if (this.#engine.state.result != null) {
            setTimeout(() => {
                const payload: GameEndedPayload = {}
                this.broadcast(GameEndedMessageType, payload)
            }, 0)
        }
    }

    private onRequestSeat(client: Client, _: SeatRequestPayload): void {
        const player = this.#players.get(client.sessionId)
        if (player != null) {
            player.connection.status = 'online'
        }

        const players = Array.from(this.#players.values())
        if (
            this.clients.length === this.#engine.maxPlayers &&
            players.length === this.#engine.maxPlayers &&
            players.every(({ connection: { status } }) => status === 'online')
        ) {
            // Initialize game state
            this.#engine.setup({ players, options: this.#options })

            const payload: GameStartedPayload = {}
            this.broadcast(GameStartedMessageType, payload)
        }
    }

    private onActionMove(client: Client, payload: ActionMovePayload): void {
        const { action } = payload

        const player = this.#engine.players.find(({ id }) => id === client.auth?.id)
        if (player == null) {
            throw new Error('Invalid player')
        }

        this.#engine.move(player, action)
    }
}
