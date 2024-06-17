import { Room, Delayed, Client } from 'colyseus'
import { IncomingMessage } from 'http'

import { PlayerAction, State } from './state'

const TURN_TIMEOUT = 10
const BOARD_WIDTH = 3

export class TicTacToe extends Room<State> {
    maxClients = 2
    randomMoveTimeout: Delayed

    static async onAuth(token: string, req: IncomingMessage): Promise<unknown> {
        console.log(`req#${req.headers.cookie}`, 'authenticate')
        console.log(`  token: ${JSON.stringify(token)}`)
        return true
    }

    onCreate(options: unknown) {
        console.log(`room#${this.roomId}`, 'created')
        console.log(`  options: ${JSON.stringify(options)}`)

        this.setState(new State())
        this.onMessage('action', (client, message) => this.playerAction(client, message))
    }

    onJoin(client: Client, options?: unknown, auth?: unknown): void | Promise<unknown> {
        console.log(`room#${this.roomId} player#${client.sessionId}`, 'joined')
        console.log(`  client: ${JSON.stringify(client)}`)
        console.log(`  options: ${JSON.stringify(options)}`)
        console.log(`  auth: ${JSON.stringify(auth)}`)

        this.state.players.set(client.sessionId, true)

        if (this.state.players.size === 2) {
            this.state.currentTurn = client.sessionId
            this.triggerAutoMove(this.state.currentTurn)

            // lock this room for new users
            this.lock()
        }
    }

    playerAction(client: Client, action: PlayerAction) {
        if (this.state.winner || this.state.draw) {
            return
        }

        if (client.sessionId === this.state.currentTurn) {
            const playerIds = Array.from(this.state.players.keys())

            const boardIndex = action.x + BOARD_WIDTH * action.y

            if (this.state.board[boardIndex] === 0) {
                const move = client.sessionId === playerIds[0] ? 1 : 2
                this.state.board[boardIndex] = move

                if (this.checkWin(action.x, action.y, move)) {
                    this.state.winner = client.sessionId
                } else if (this.isGameEnded()) {
                    this.state.draw = true
                } else {
                    // pass turn to next player
                    const playerIndex = playerIds.findIndex((sessionId) => sessionId === client.sessionId)
                    if (playerIndex === -1) {
                        throw new Error('Invalid session ID')
                    }

                    const nextPlayerIndex = (playerIndex + 1) % playerIds.length
                    const nextPlayerSessionId = playerIds[nextPlayerIndex]

                    this.state.currentTurn = nextPlayerSessionId

                    const isPlayer = this.state.players.get(nextPlayerSessionId)
                    this.triggerAutoMove(nextPlayerSessionId, !isPlayer)
                }
            }
        }
    }

    isGameEnded() {
        const index = this.state.board.findIndex((value) => value === 0)
        return index === -1
    }

    triggerAutoMove(sessionId: string, forceMove?: boolean) {
        if (this.randomMoveTimeout) {
            this.randomMoveTimeout.clear()
        }

        const nextMove = this.randomNextMove()
        if (nextMove == null) {
            return
        }

        const timeout = forceMove ? 10 : TURN_TIMEOUT * 1000

        this.randomMoveTimeout = this.clock.setTimeout(() => {
            this.playerAction({ sessionId } as Client, nextMove)
        }, timeout)
    }

    randomNextMove() {
        const index = this.state.board.findIndex((value) => value === 0)
        if (index === -1) {
            return null
        }

        const x = index % BOARD_WIDTH
        const y = Math.floor(index / BOARD_WIDTH)
        return { x, y }
    }

    checkWin(x: number, y: number, move: number) {
        const board = this.state.board
        let won = false

        // horizontal
        for (let y = 0; y < BOARD_WIDTH; y++) {
            const i = x + BOARD_WIDTH * y
            if (board[i] !== move) {
                break
            }
            if (y == BOARD_WIDTH - 1) {
                won = true
            }
        }

        // vertical
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const i = x + BOARD_WIDTH * y
            if (board[i] !== move) {
                break
            }
            if (x == BOARD_WIDTH - 1) {
                won = true
            }
        }

        // cross forward
        if (x === y) {
            for (let xy = 0; xy < BOARD_WIDTH; xy++) {
                const i = xy + BOARD_WIDTH * xy
                if (board[i] !== move) {
                    break
                }
                if (xy == BOARD_WIDTH - 1) {
                    won = true
                }
            }
        }

        // cross backward
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const y = BOARD_WIDTH - 1 - x
            const i = x + BOARD_WIDTH * y
            if (board[i] !== move) {
                break
            }
            if (x == BOARD_WIDTH - 1) {
                won = true
            }
        }

        return won
    }

    onLeave(client: Client, consented: boolean) {
        console.log(`room#${this.roomId} player#${client.sessionId}`, 'left')
        console.log(`  client: ${JSON.stringify(client)}`)
        console.log(`  consented: ${JSON.stringify(consented)}`)

        this.state.players.set(client.sessionId, false)
        this.triggerAutoMove(client.sessionId, true)
    }
}
