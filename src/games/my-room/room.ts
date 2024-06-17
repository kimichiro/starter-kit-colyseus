import { Room, Client } from '@colyseus/core'
import { MyRoomState } from './state'

export class MyRoom extends Room<MyRoomState> {
    maxClients = 4

    onCreate(options: unknown) {
        this.setState(new MyRoomState())

        console.log('room', this.roomId, 'created...', `option: ${JSON.stringify(options)}`)

        this.onMessage('type', (client, message) => {
            //
            // handle "type" message
            //
            console.log(
                'room',
                this.roomId,
                `player#${client.sessionId}`,
                'handle [type]',
                `message: ${JSON.stringify(message)}`
            )
        })
    }

    onJoin(client: Client, options: unknown) {
        console.log('room', this.roomId, `player#${client.sessionId}`, 'joined!', `option: ${JSON.stringify(options)}`)
    }

    onLeave(client: Client, consented: boolean) {
        console.log(
            'room',
            this.roomId,
            `player#${client.sessionId}`,
            'left!',
            `consented: ${JSON.stringify(consented)}`
        )
    }

    onDispose() {
        console.log('room', this.roomId, 'disposing...')
    }
}
