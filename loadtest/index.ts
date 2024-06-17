import { cli, Options } from '@colyseus/loadtest'

import { run as runMyRoom } from './my-room'
import { run as runTicTacToe } from './tic-tac-toe'

export async function loadtest(options: Options) {
    switch (options.roomName) {
        case 'myroom': {
            await runMyRoom(options)
            break
        }
        case 'tictactoe': {
            await runTicTacToe(options)
            break
        }
        default:
            throw new Error('Invalid room name')
    }
}

cli(loadtest)
