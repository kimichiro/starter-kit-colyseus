import { filterChildren, MapSchema, type } from '@colyseus/schema'
import { Client } from 'colyseus'
import { injectable } from 'tsyringe'

import {
    GameAction,
    GameArea,
    GameMove,
    GamePlayer,
    GameResult,
    GameSettings,
    GameState,
    TurnBasedEngine
} from '../../engines/turn-based-engine'

enum Role {
    Ex = 'X',
    Oh = 'O'
}

enum Position {
    A1 = 'a1',
    A2 = 'a2',
    A3 = 'a3',
    B1 = 'b1',
    B2 = 'b2',
    B3 = 'b3',
    C1 = 'c1',
    C2 = 'c2',
    C3 = 'c3'
}

const decisivePositions: Array<[Position, Position, Position]> = [
    [Position.A1, Position.A2, Position.A3],
    [Position.B1, Position.B2, Position.B3],
    [Position.C1, Position.C2, Position.C3],

    [Position.A1, Position.B1, Position.C1],
    [Position.A2, Position.B2, Position.C2],
    [Position.A3, Position.B3, Position.C3],

    [Position.A1, Position.B2, Position.C3],
    [Position.A3, Position.B2, Position.C1]
]

class Action extends GameAction {
    @type('string') role: Role
    @type('string') position: Position

    constructor(role: Role, position: Position) {
        super()

        this.role = role
        this.position = position
    }
}

class Area extends GameArea<Action> {
    @type({ map: 'string' }) readonly table: Map<string, Role>

    @filterChildren(function (this: Area, client: Client, _: string, value: Action, root: GameState<Area, Player>) {
        return (
            client.sessionId === root.currentTurn?.id &&
            value.role === root.currentTurn?.role &&
            this.table.get(value.position) == null
        )
    })
    actions: Action[]

    constructor() {
        super([])

        this.table = new MapSchema<Role>()
    }
}

class Player extends GamePlayer {
    @type('string') role: Role

    constructor(player: GamePlayer, role: Role) {
        super(player.id, player.name, player.connection)

        this.role = role
    }
}

@injectable()
export class TicTacToeEngine extends TurnBasedEngine<Action, Area, Player> {
    constructor() {
        super(new GameState(new Area(), 2, 2, [], null, [], null), { players: [] })
    }

    protected onSetup(settings: GameSettings): void {
        const roles = [Role.Ex, Role.Oh]
        const players = settings.players.map<Player>(
            (player) => new Player(player, Math.round(Math.random()) === 0 ? roles.shift() : roles.pop())
        )

        const currentRole = Role.Ex
        this.state.players.push(...players)
        this.state.currentTurn = players.find((player) => player.role === currentRole)

        this.state.area.actions.push(new Action(currentRole, Position.A1))
        this.state.area.actions.push(new Action(currentRole, Position.A2))
        this.state.area.actions.push(new Action(currentRole, Position.A3))
        this.state.area.actions.push(new Action(currentRole, Position.B1))
        this.state.area.actions.push(new Action(currentRole, Position.B2))
        this.state.area.actions.push(new Action(currentRole, Position.B3))
        this.state.area.actions.push(new Action(currentRole, Position.C1))
        this.state.area.actions.push(new Action(currentRole, Position.C2))
        this.state.area.actions.push(new Action(currentRole, Position.C3))
    }

    move(player: Player, action: Action): void {
        const isConcluded = this.state.result != null
        const foundPlayer = this.state.players.some(({ id, role }) => id === player.id && role === action.role)
        const actionIndex = this.state.area.actions.findIndex(
            ({ position, role }) => position === action.position && role === action.role
        )

        if (isConcluded || !foundPlayer || actionIndex === -1) {
            throw new Error('Invalid move')
        }

        this.state.area.table.set(action.position, action.role)

        this.state.moves.push(new GameMove(action.position, player))

        const result = this.checkResult()

        if (result == null) {
            this.state.area.actions.splice(actionIndex, 1)

            const otherRole = [Role.Ex, Role.Oh].filter((role) => role !== action.role).pop()
            this.state.currentTurn = this.state.players.find((player) => player.role === otherRole)
            this.state.area.actions = this.state.area.actions.map((a) => new Action(otherRole, a.position))
        } else {
            this.state.currentTurn = null
            this.state.area.actions = []

            this.state.result = result
        }
    }

    private checkResult(): GameResult | null {
        const moves = decisivePositions.map((positions) => positions.map((pos) => this.state.area.table.get(pos)))

        const winningMove = moves.find((roles) => {
            const move = roles.find((role) => role != null)
            return move != null && roles.every((role) => role === move)
        })
        if (winningMove != null) {
            const winner = this.state.players.find(({ role }) => role === winningMove.at(0))
            return new GameResult(false, winner)
        }

        const possibleWin = moves.some((roles) => {
            const move = roles.find((role) => role != null)
            return roles.every((role) => role === move || role == null)
        })
        if (!possibleWin) {
            return new GameResult(true, null)
        }

        return null
    }
}
