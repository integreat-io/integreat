import create from './create'
import createQueue from './queue'
import mergeResources from './utils/mergeResources'

export { CustomFunction as Transformer } from 'map-transform'
export {
  Action,
  Payload,
  Meta,
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
export { default as createAction } from './utils/createAction'

export { default as authenticators } from './authenticators'
export { default as mutations } from './mutations'
export { default as transformers } from './transformers'
export { default as middleware } from './middleware'

export default {
  version: '0.8.0-alpha.26',
  create,
  createQueue,
  mergeResources,
}
