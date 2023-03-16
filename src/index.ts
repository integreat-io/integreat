import create from './create.js'
import mergeDefinitions from './utils/mergeDefinitions.js'
import mergeResources from './utils/mergeResources.js'

export type { Transformer, TransformDefinition } from 'map-transform/types.js'
export type {
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
} from './types.js'
export type { Authenticator, AuthDef, ServiceDef } from './service/types.js'
export type { Instance, Definitions, Resources } from './create.js'

export { default as authenticators } from './authenticators/index.js'
export { default as mutations } from './mutations/index.js'
export { default as transformers } from './transformers/index.js'
export { default as middleware } from './middleware/index.js'
export { default as createAction } from './utils/createAction.js'

export default {
  version: '0.8.0-beta.33',
  create,
  mergeDefinitions,
  mergeResources,
}
