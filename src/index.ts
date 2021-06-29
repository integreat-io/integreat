import create from './create'
import createQueue from './queue'
import mergeResources from './utils/mergeResources'

export { CustomFunction as Transformer } from 'map-transform'
export {
  Action,
  Payload,
  Response,
  Dispatch,
  Data,
  TypedData,
  Reference,
  Ident,
  Transporter,
  Connection,
  Middleware,
} from './types'
export { Authenticator, AuthDef, ServiceDef } from './service/types'
export { Instance, Definitions, Resources } from './create'

export { default as authenticators } from './authenticators'
export { default as mutations } from './mutations'
export { default as transformers } from './transformers'
export { default as middleware } from './middleware'

export default {
  version: '0.8.0-alpha.24',
  create,
  createQueue,
  mergeResources,
}
