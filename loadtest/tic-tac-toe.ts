import { Client, Room } from 'colyseus.js'
import { Options } from '@colyseus/loadtest'

async function delay(timeout: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => resolve(), timeout)
    })
}

let quitCount = 0

export async function run(options: Options) {
    const client = new Client(options.endpoint)
    const room: Room = await client.joinOrCreate(options.roomName, {})

    room.onStateChange(async (state) => {
        if (!!state.winner || !!state.draw) {
            console.log(`room#${room.roomId} player#${room.sessionId} ended`)
            await room.leave()
            return
        }

        const random = Math.floor(Math.random() * 100)
        if (random === 0) {
            quitCount++
            console.log(`room#${room.roomId} player#${room.sessionId} quit (count: ${quitCount})`)
            await room.leave()
            return
        }

        if (room.sessionId === state.currentTurn) {
            const board = [...state.board]
            const vacants = board.reduce((acc, value, index) => (value === 0 ? [...acc, index] : acc), [])

            const vacantIndex = vacants[Math.floor(Math.random() * vacants.length)]

            const x = vacantIndex % 3
            const y = Math.floor(vacantIndex / 3)

            await delay(Math.random() * 3000 + 1000)
            room.send('action', { x, y })

            return
        }
    })

    room.onLeave((code) => {
        console.log(`room#${room.roomId} player#${room.sessionId} left (code: ${JSON.stringify(code)})`)
    })
}
