import { ArraySchema, Schema, type } from '@colyseus/schema'

import { GameContext, GameEngine } from './game-engine'

export class GameAction extends Schema {}

export abstract class GameArea<Action extends GameAction> extends Schema {
    @type({ array: GameAction }) actions: ArraySchema<Action>

    constructor(actions: Action[]) {
        super()

        this.actions = new ArraySchema<Action>(...actions)
    }
}

export type ConnectionStatus = 'unknown' | 'online' | 'offline'
export class Connection extends Schema {
    @type('string') status: ConnectionStatus = 'unknown'
}

export class TimeDuration extends Schema {
    @type('number') minutes: number = 0
    @type('number') seconds: number = 0

    @type('number') asMilliseconds: number = 0
}

export class GameParticipant extends Schema {
    @type('string') readonly id: string
    @type('string') readonly name: string
    @type('string') readonly userId: string
    @type(Connection) readonly connection: Connection
    @type(TimeDuration) readonly remainingTime: TimeDuration

    constructor(id: string, name: string, userId: string, connection: Connection, remainingTime: TimeDuration) {
        super()

        this.id = id
        this.name = name
        this.userId = userId
        this.connection = connection
        this.remainingTime = remainingTime
    }
}

export class GameMove extends Schema {
    @type('string') readonly notation: string
    @type(GameParticipant) readonly participant: GameParticipant

    constructor(notation: string, participant: GameParticipant) {
        super()

        this.notation = notation
        this.participant = participant
    }
}

export class GameResult extends Schema {
    @type('boolean') readonly draw: boolean
    @type(GameParticipant) readonly winner: GameParticipant | null

    constructor(draw: boolean, winner: GameParticipant | null) {
        super()

        this.draw = draw
        this.winner = winner
    }
}

export class GameState<
    Action extends GameAction,
    Area extends GameArea<Action>,
    Participant extends GameParticipant = GameParticipant,
    Move extends GameMove = GameMove,
    Result extends GameResult = GameResult
> extends Schema {
    @type(GameArea) area: Area
    @type({ array: GameParticipant }) participants: ArraySchema<Participant>
    @type(GameParticipant) currentTurn: Participant | null

    @type({ array: GameMove }) moves: ArraySchema<Move>
    @type(GameResult) result: Result | null

    constructor(
        area: Area,
        participants: Participant[] = [],
        currentTurn: Participant | null = null,
        moves: Move[] = [],
        result: Result | null = null
    ) {
        super()

        this.area = area
        this.participants = new ArraySchema<Participant>(...participants)
        this.currentTurn = currentTurn
        this.moves = new ArraySchema<Move>(...moves)
        this.result = result
    }
}

export interface GameSettings {}

export type ResultCallback = () => void

export interface TurnBasedContext<Participant extends GameParticipant> extends GameContext {
    minParticipants: number
    maxParticipants: number
    participants: Participant[]
    currentTurn: Participant | null

    resumeCountdown: () => void
    pauseCountdown: () => void
}

export abstract class TurnBasedEngine<
    Action extends GameAction = GameAction,
    Area extends GameArea<Action> = GameArea<Action>,
    Participant extends GameParticipant = GameParticipant,
    Move extends GameMove = GameMove,
    Result extends GameResult = GameResult,
    Settings extends GameSettings = GameSettings
> extends GameEngine<GameState<Action, Area, Participant, Move, Result>, TurnBasedContext<Participant>, Settings> {
    abstract updateParticipant(previous: Participant, current: Participant, index: number): void

    abstract move(participant: Participant, action: Action): void
}
