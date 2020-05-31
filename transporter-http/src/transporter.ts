import send from './send'
import { Transporter } from '../../core/src'
import { EndpointOptions } from './types'

/**
 * HTTP Transporter for Integreat
 */
const httpTransporter: Transporter = {
  authentication: 'asHttpHeaders',

  prepareOptions: (options: EndpointOptions) => options,

  connect: async (_options, _authentication, connection) => connection,

  send,

  disconnect: async (_connection) => undefined,
}

export default httpTransporter
