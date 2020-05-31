import send from './send'
import { Transporter } from '../../core/src'
import { Options } from './types'

/**
 * HTTP Transporter for Integreat
 */
const httpTransporter: Transporter = {
  authentication: 'asHttpHeaders',

  prepareOptions: (options: Options) => options,

  connect: async (_options, _authentication, connection) => connection,

  send,

  disconnect: async (_connection) => undefined,
}

export default httpTransporter
