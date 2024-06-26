import 'reflect-metadata'

import config from '@colyseus/tools'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import { container } from 'tsyringe'

import packageJson from '../package.json'
import games from './games'

export default config({
    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        games.forEach(({ name, room, engine }) => {
            container.register(name, engine)
            gameServer.define(name, room)
        })
    },

    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         * Read more: https://expressjs.com/en/starter/basic-routing.html
         */
        app.get('/version', (req, res) => {
            const { version } = packageJson
            res.send(version)
        })

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== 'production') {
            app.use('/', playground)
        }

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
         */
        app.use('/colyseus', monitor())
    },

    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
})
