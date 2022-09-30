import create from './create'
import mergeDefinitions from './utils/mergeDefinitions'
import mergeResources from './utils/mergeResources'

export { CustomFunction as Transformer, MapDefinition } from 'map-transform'
export {
  Action,
  Payload,
  Meta,
  Response,
  Headers,
  Ident,
  Dispatch,
  TypedData,
  Reference,
  Transporter,
  Connection,
  Middleware,
  ActionHandler,
  ActionHandlerResources,
  HandlerDispatch,
  SetProgress,
  JobDef,
  Job,
} from './types'
export { Authenticator, AuthDef, ServiceDef } from './service/types'
export { Instance, Definitions, Resources } from './create'
export { default as createAction } from './utils/createAction'

export { default as authenticators } from './authenticators'
export { default as mutations } from './mutations'
export { default as transformers } from './transformers'
export { default as middleware } from './middleware'

export default {
  version: '0.8.0-beta.1',
  create,
  mergeDefinitions,
  mergeResources,
}
