import { Transporter } from '../../core/src'
import { Options } from './types'

/**
 * HTTP Transporter for Integreat
 */
const httpTransporter: Transporter = {
  authentication: 'asHttpHeaders',

  prepareOptions: (options: Options) => options,

  connect: async (_options, _authentication, connection) => connection,

  send: async (exchange, _connection) => exchange,

  disconnect: async (_connection) => undefined,
}

export default httpTransporter
