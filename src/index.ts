import create from './create'

export {
  Action,
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

export default {
  version: '0.8.0-alpha.3',
  create,
}
