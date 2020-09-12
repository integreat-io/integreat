import create from './create'

export {
  Action,
  Payload,
  Response,
  Dispatch,
  Data,
  TypedData,
  Exchange,
  Ident,
  Transporter,
  Connection,
  Middleware,
} from './types'
export { Instance } from './create'

export { default as authenticators } from './authenticators'
export { default as mutations } from './mutations'
export { default as transformers } from './transformers'

export default {
  version: '0.8.0-alpha.4',
  create,
}
