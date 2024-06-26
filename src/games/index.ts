import { TurnBasedMatch } from '../rooms/turn-based-match'
import { TicTacToeEngine } from './tictactoe/engine'

export default [
    {
        name: 'tictactoe',
        room: TurnBasedMatch,
        engine: TicTacToeEngine
    }
]
