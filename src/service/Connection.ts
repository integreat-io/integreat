import type { Transporter, EmitFn } from '../types.js'
import type { TransporterOptions } from './types.js'

export interface ConnectionObject extends Record<string, unknown> {
  status: string
  error?: string
}

const isSuccessStatus = (status?: string | null) =>
  typeof status === 'string' && ['ok', 'noaction'].includes(status)

export default class Connection {
  #transporter: Transporter
  #options: TransporterOptions
  #connection: ConnectionObject | null
  #emit: EmitFn

  constructor(
    transporter: Transporter,
    options: TransporterOptions,
    emit: EmitFn,
  ) {
    this.#transporter = transporter
    this.#options = options
    this.#connection = null
    this.#emit = emit
  }

  async connect(auth?: Record<string, unknown> | null): Promise<boolean> {
    if (typeof this.#transporter.connect === 'function') {
      this.#connection = (await this.#transporter.connect(
        this.#options,
        auth || null,
        this.#connection?.status === 'ok' ? this.#connection : null,
        this.#emit,
      )) || { status: 'ok' }
    } else {
      this.#connection = { status: 'ok' }
    }
    return isSuccessStatus(this.#connection?.status)
  }

  async disconnect(): Promise<void> {
    if (typeof this.#transporter.disconnect === 'function') {
      await this.#transporter.disconnect(this.#connection)
    }
    this.#connection = null
  }

  get status(): string | null {
    return this.#connection?.status || null
  }

  get error(): string | null {
    return this.#connection?.error || null
  }

  get object(): ConnectionObject | null {
    return this.#connection || null
  }
}
