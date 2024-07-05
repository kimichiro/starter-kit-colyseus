import { Client, Room } from 'colyseus'
import { IncomingMessage } from 'http'
import { container } from 'tsyringe'

import { CountdownTimer, GameTimer } from '../engines/game-timer'
import {
    Connection,
    GameAction,
    GameParticipant,
    TimeDuration,
    TurnBasedContext,
    TurnBasedEngine
} from '../engines/turn-based-engine'

export interface IdToken {
    id: string
    name: string
}

// #region Client messages

export const MatchAskMessageType = 'match-ask'
export interface MatchAskPayload {}

export const GameMoveMessageType = 'game-move'
export interface GameMovePayload<Action extends GameAction = GameAction> {
    action: Action
}

// #endregion

// #region Server messages

export const GameStartedMessageType = 'game-started'
export interface GameStartedPayload {}

export const GameEndedMessageType = 'game-ended'
export interface GameEndedPayload {}

// #endregion

const TIMER_TIMEOUT_INITIAL = 30000
const TIMER_TIMEOUT_DEFAULT_REGAIN = 20000
const TIMER_TIMEOUT_MINIMUM_REGAIN = 10000

export class TurnBasedMatch extends Room {
    #engine: TurnBasedEngine
    #context: TurnBasedContext<GameParticipant>
    #timer: GameTimer
    #timers: Map<GameParticipant, CountdownTimer>
    #options?: unknown

    static async onAuth(token: string, _: IncomingMessage): Promise<IdToken> {
        // Authenticate user
        return JSON.parse(Buffer.from(token, 'base64').toString())
    }

    onCreate(options?: unknown): void {
        this.#engine = container.resolve(this.roomName)
        this.setState(this.#engine.state)

        this.#context = {
            minParticipants: 1,
            maxParticipants: Infinity,
            participants: [],
            currentTurn: null,

            resumeCountdown: () => {
                if (this.#context.currentTurn != null) {
                    this.resumeCountdownTimer(this.#context.currentTurn)
                }
            },
            pauseCountdown: () => {
                if (this.#context.currentTurn != null) {
                    this.pauseCountdownTimer(this.#context.currentTurn)
                }
            }
        }
        this.#engine.init(this.#context)

        this.#timer = new GameTimer(this.clock)
        this.#timers = new Map<GameParticipant, CountdownTimer>()

        this.#options = options

        // Setup event handling
        this.onMessage(MatchAskMessageType, this.onMatchAsk.bind(this))
        this.onMessage(GameMoveMessageType, this.onGameMove.bind(this))

        // Lock room when reaches total number of participants
        this.maxClients = this.#context.maxParticipants
    }

    async onJoin(client: Client, _?: unknown, idToken?: IdToken): Promise<void> {
        console.info(`${this.roomId}#${client.sessionId} join: room capacity ${this.clients.length}/${this.maxClients}`)

        if (idToken == null) {
            client.leave()
            return
        }

        let participantIndex: number = -1
        if (this.#context.participants.length === this.maxClients) {
            // reject different user from joining in-progress game room
            participantIndex = this.#context.participants.findIndex(({ userId }) => userId === idToken.id)
            if (participantIndex === -1) {
                client.leave()
                return
            }
        }

        const oldParticipant = participantIndex === -1 ? null : this.#context.participants[participantIndex]
        const newParticipant = new GameParticipant(
            client.sessionId,
            idToken.name,
            idToken.id,
            oldParticipant?.connection ?? new Connection(),
            oldParticipant?.remainingTime ?? new TimeDuration()
        )
        if (participantIndex !== -1) {
            this.#context.participants.splice(participantIndex, 1, newParticipant)
        } else {
            this.#context.participants.push(newParticipant)
        }

        this.createCountdownTimer(newParticipant, oldParticipant == null)

        if (oldParticipant != null) {
            this.#engine.updateParticipant(oldParticipant, newParticipant)
        }
    }

    async onLeave(client: Client, consented: boolean): Promise<void> {
        console.info(
            `${this.roomId}#${client.sessionId} leave(${consented}): room capacity ${this.clients.length}/${this.maxClients}`
        )

        const participant = this.#context.participants.find(({ id }) => id === client.sessionId)
        if (participant != null) {
            participant.connection.status = 'offline'
            this.disposeCountdownTimer(participant)
        }

        // unlock room to allow connection from a fresh reload
        this.unlock()

        if (!consented) {
            try {
                await this.allowReconnection(client, 60)

                if (participant != null) {
                    participant.connection.status = 'online'
                }

                return
            } catch (error) {
                console.warn(`${this.roomId}#${client.sessionId} reconnection: ${error}`)
            }
        }
    }

    onBeforePatch(): void {
        if (this.#engine.state.result != null) {
            setTimeout(() => {
                const payload: GameEndedPayload = {}
                this.broadcast(GameEndedMessageType, payload)
            }, 0)
        }
    }

    private async onMatchAsk(client: Client, _: MatchAskPayload): Promise<void> {
        console.info(
            `${this.roomId}#${client.sessionId} ${MatchAskMessageType}: room capacity ${this.clients.length}/${this.maxClients}`
        )

        const participant = this.#context.participants.find(({ id }) => id === client.sessionId)
        if (participant != null) {
            participant.connection.status = 'online'
        }

        if (!this.#engine.started) {
            const participants = this.#context.participants
            if (
                this.clients.length === this.#context.maxParticipants &&
                participants.length === this.#context.maxParticipants &&
                participants.every(({ connection: { status } }) => status === 'online')
            ) {
                try {
                    // Initialize game state
                    this.#engine.setup(typeof this.#options === 'object' ? { ...this.#options } : {})

                    const payload: GameStartedPayload = {}
                    this.broadcast(GameStartedMessageType, payload)

                    // set flag to avoid joining in-progress game room from lobby
                    await this.setMetadata({ started: true })
                } catch (error) {
                    console.warn(`${this.roomId}#${client.sessionId} ${MatchAskMessageType}: ${error}`)
                }
            }
        }
    }

    private onGameMove(client: Client, payload: GameMovePayload): void {
        try {
            const { action } = payload

            const participant = this.#context.participants.find(({ id }) => id === client.sessionId)
            if (participant == null) {
                throw new Error('Invalid participant')
            }

            this.#engine.move(participant, action)
        } catch (error) {
            console.warn(`${this.roomId}#${client.sessionId} ${GameMoveMessageType}: ${error}`)
        }
    }

    private createCountdownTimer(participant: GameParticipant, renew: boolean): void {
        const timer = this.#timer.createCountdownTimer(
            renew ? TIMER_TIMEOUT_INITIAL : participant.remainingTime.asMilliseconds,
            ({ minutes, seconds, asMilliseconds }) => {
                participant.remainingTime.minutes = minutes
                participant.remainingTime.seconds = seconds
                participant.remainingTime.asMilliseconds = asMilliseconds
            }
        )
        this.#timers.set(participant, timer)

        participant.remainingTime.minutes = timer.minutes
        participant.remainingTime.seconds = timer.seconds
        participant.remainingTime.asMilliseconds = timer.asMilliseconds

        this.#timers.set(participant, timer)
    }

    private resumeCountdownTimer(participant: GameParticipant): void {
        const timer = this.#timers.get(participant)
        if (timer != null) {
            timer.resume()

            participant.remainingTime.minutes = timer.minutes
            participant.remainingTime.seconds = timer.seconds
            participant.remainingTime.asMilliseconds = timer.asMilliseconds
        }
    }

    private pauseCountdownTimer(participant: GameParticipant): void {
        const timer = this.#timers.get(this.state.currentTurn)
        if (timer != null) {
            timer.pause()

            const regainTimeout =
                timer.asMilliseconds > TIMER_TIMEOUT_INITIAL
                    ? TIMER_TIMEOUT_MINIMUM_REGAIN
                    : TIMER_TIMEOUT_DEFAULT_REGAIN
            timer.increase(regainTimeout)

            participant.remainingTime.minutes = timer.minutes
            participant.remainingTime.seconds = timer.seconds
            participant.remainingTime.asMilliseconds = timer.asMilliseconds
        }
    }

    private disposeCountdownTimer(participant: GameParticipant): void {
        this.#timers.get(participant)?.clear()
        this.#timers.delete(participant)
    }
}
