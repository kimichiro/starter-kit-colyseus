import { ArraySchema, Schema, type } from '@colyseus/schema'

import { GameEngine } from './game-engine'

export class GameAction extends Schema {}

export abstract class GameArea<Action extends GameAction = GameAction> extends Schema {
    @type({ array: GameAction }) actions: Action[]

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
}

export class GamePlayer extends Schema {
    @type('string') readonly id: string
    @type('string') readonly name: string
    @type(Connection) readonly connection: Connection
    @type(TimeDuration) readonly remainingTime: TimeDuration

    constructor(id: string, name: string, connection: Connection) {
        super()

        this.id = id
        this.name = name
        this.connection = connection
        this.remainingTime = new TimeDuration()
    }
}

export class GameMove extends Schema {
    @type('string') readonly notation: string
    @type(GamePlayer) readonly player: GamePlayer

    constructor(notation: string, player: GamePlayer) {
        super()

        this.notation = notation
        this.player = player
    }
}

export class GameResult extends Schema {
    @type('boolean') readonly draw: boolean
    @type(GamePlayer) readonly winner: GamePlayer | null

    constructor(draw: boolean, winner: GamePlayer | null) {
        super()

        this.draw = draw
        this.winner = winner
    }
}

export class GameState<
    Area extends GameArea = GameArea,
    Player extends GamePlayer = GamePlayer,
    Move extends GameMove = GameMove,
    Result extends GameResult = GameResult
> extends Schema {
    @type('number') minPlayers: number
    @type('number') maxPlayers: number
    @type({ array: GamePlayer }) players: Player[]

    @type(GameArea) area: Area
    @type(GamePlayer) currentTurn: Player | null
    @type({ array: GameMove }) moves: Move[]

    @type(GameResult) result: Result | null

    constructor(
        area: Area,
        minPlayers: number = 1,
        maxPlayers: number = Infinity,
        players: Player[] = [],
        currentTurn: Player | null = null,
        moves: Move[] = [],
        result: Result | null = null
    ) {
        super()

        this.minPlayers = minPlayers
        this.maxPlayers = maxPlayers
        this.players = new ArraySchema<Player>(...players)
        this.area = area
        this.currentTurn = currentTurn
        this.moves = new ArraySchema<Move>(...moves)
        this.result = result
    }
}

export interface GameSettings<Options = unknown> {
    players: GamePlayer[]
    options?: Options
}

export type ResultCallback = () => void

export abstract class TurnBasedEngine<
    Action extends GameAction = GameAction,
    Area extends GameArea<Action> = GameArea<Action>,
    Player extends GamePlayer = GamePlayer,
    Move extends GameMove = GameMove,
    Result extends GameResult = GameResult,
    Options = unknown
> extends GameEngine<GameState<Area, Player, Move, Result>, GameSettings<Options>> {
    get minPlayers(): number {
        return this.state.minPlayers
    }

    get maxPlayers(): number {
        return this.state.maxPlayers
    }

    get players(): Player[] {
        return this.state.players
    }

    get area(): Area {
        return this.state.area
    }

    get currentTurn(): Player | null {
        return this.state.currentTurn
    }

    get moves(): Move[] {
        return this.state.moves
    }

    get result(): Result | null {
        return this.state.result
    }

    abstract move(player: Player, action: Action): void
}
