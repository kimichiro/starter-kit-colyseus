import { Client, Room } from 'colyseus.js'
import { Options } from '@colyseus/loadtest'

export async function run(options: Options) {
    const client = new Client(options.endpoint)
    const room: Room = await client.joinOrCreate(options.roomName, {})

    console.log('joined successfully!')

    room.onMessage('message-type', (payload) => {
        console.log(`[message-type]: ${JSON.stringify(payload)}`)
    })

    room.onStateChange((state) => {
        console.log('state change:', state)
    })

    room.onLeave((code) => {
        console.log(`[leave]: ${JSON.stringify(code)}`)
    })
}
