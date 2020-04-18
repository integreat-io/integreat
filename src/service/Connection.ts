import { Dictionary } from '../types'
import { Adapter } from './types'
import { EndpointOptions } from './endpoints/types'

export interface ConnectionObject extends Dictionary<unknown> {
  status: string
}

const isSuccessStatus = (status?: string | null) =>
  typeof status === 'string' && ['ok', 'noaction'].includes(status)

export default class Connection {
  #adapter: Adapter
  #options: EndpointOptions
  #connection: ConnectionObject | null

  constructor(adapter: Adapter, options: EndpointOptions) {
    this.#adapter = adapter
    this.#options = options
    this.#connection = null
  }

  async connect(auth?: object | null) {
    if (typeof this.#adapter.connect === 'function') {
      this.#connection = (await this.#adapter.connect(
        this.#options,
        auth || null,
        this.#connection?.status === 'ok' ? this.#connection : null
      )) || { status: 'ok' }
    } else {
      this.#connection = { status: 'ok' }
    }
    return isSuccessStatus(this.#connection?.status)
  }

  async disconnect() {
    if (typeof this.#adapter.disconnect === 'function') {
      await this.#adapter.disconnect(this.#connection)
    }
    this.#connection = null
  }

  get status() {
    return this.#connection?.status || null
  }

  get error() {
    return this.#connection?.error || null
  }

  get object() {
    return this.#connection || null
  }
}
