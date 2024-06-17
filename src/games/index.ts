import { MyRoom } from './my-room/room'
import { TicTacToe } from './tic-tac-toe/room'

export default {
    [MyRoom.name.toLowerCase()]: MyRoom,
    [TicTacToe.name.toLowerCase()]: TicTacToe
}
