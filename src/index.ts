import Instance from './instance.js'
import mergeDefinitions from './utils/mergeDefinitions.js'
import mergeResources from './utils/mergeResources.js'
import type { Definitions, Resources, Middleware } from './types.js'

export type {
  Transformer,
  AsyncTransformer,
  TransformDefinition,
} from 'map-transform/types.js'
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
  AuthenticateExternal,
  Adapter,
  Connection,
  ActionHandler,
  ActionHandlerResources,
  HandlerDispatch,
  SetProgress,
  Authenticator,
} from './types.js'
export type {
  Authentication,
  AuthOptions,
  AuthDef,
  ServiceDef,
} from './service/types.js'
export type { JobDef, JobStepDef } from './jobs/types.js'
export type { Instance, Definitions, Resources, Middleware }

export * as authenticators from './authenticators/index.js'
export * as middleware from './middleware/index.js'
export { createAction } from './utils/action.js'

export default {
  version: '1.0.0-rc.0',

  /**
   * Create a new instance of Integreat.
   */
  create(
    definitions: Definitions,
    resources: Resources,
    middlewareForDispatch?: Middleware[],
    middlewareForService?: Middleware[]
  ) {
    return new Instance(
      definitions,
      resources,
      middlewareForDispatch,
      middlewareForService
    )
  },

  mergeDefinitions,
  mergeResources,
}
