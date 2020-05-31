import { Transporter } from '../types'
import { EndpointOptions } from './endpoints/types'

export interface ConnectionObject extends Record<string, unknown> {
  status: string
}

const isSuccessStatus = (status?: string | null) =>
  typeof status === 'string' && ['ok', 'noaction'].includes(status)

export default class Connection {
  #transporter: Transporter
  #options: EndpointOptions
  #connection: ConnectionObject | null

  constructor(transporter: Transporter, options: EndpointOptions) {
    this.#transporter = transporter
    this.#options = options
    this.#connection = null
  }

  async connect(auth?: object | null) {
    if (typeof this.#transporter.connect === 'function') {
      this.#connection = (await this.#transporter.connect(
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
    if (typeof this.#transporter.disconnect === 'function') {
      await this.#transporter.disconnect(this.#connection)
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
