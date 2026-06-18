import { EventEmitter } from 'events'

export const orderBus = new EventEmitter()
orderBus.setMaxListeners(200)
