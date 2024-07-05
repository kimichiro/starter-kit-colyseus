import { Clock } from 'colyseus'
import dayjs from 'dayjs'

export type TimerHandler<T extends Timer> = (timer: T) => void

export interface Timer {
    pause: () => void
    resume: () => void
    clear: () => void
}

export interface CountdownTimer extends Timer {
    readonly hours: number
    readonly minutes: number
    readonly seconds: number
    readonly milliseconds: number

    readonly asMilliseconds: number

    increase: (timeout: number) => void
    decrease: (timeout: number) => void
}

export class GameTimer {
    #clock: Clock

    constructor(clock: Clock) {
        this.#clock = clock
    }

    createCountdownTimer(
        initial: number,
        handler?: TimerHandler<CountdownTimer>,
        interval: number = 1000
    ): CountdownTimer {
        let duration = dayjs.duration(initial)
        const delayed = this.#clock.setInterval(() => {
            duration = duration.subtract(delayed.elapsedTime)
            if (handler != null) {
                handler(timer)
            }
        }, interval)
        delayed.pause()

        const timer: CountdownTimer = {
            get hours() {
                return duration.hours()
            },
            get minutes() {
                return duration.minutes()
            },
            get seconds() {
                return duration.seconds()
            },
            get milliseconds() {
                return duration.milliseconds()
            },
            get asMilliseconds() {
                return duration.asMilliseconds()
            },
            pause: () => delayed.pause(),
            resume: () => delayed.resume(),
            clear: () => delayed.clear(),
            increase: (timeout) => {
                duration = duration.add(timeout)
            },
            decrease: (timeout) => {
                duration = duration.subtract(timeout)
            }
        }
        return timer
    }
}
