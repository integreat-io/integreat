import deleteFn from './delete'
import { Dictionary } from '../types'
import { ExchangeHandler } from '../dispatch'

export default {
  GET: require('./get').default,
  GET_META: require('./getMeta').default,
  GET_IDENT: require('./getIdent').default,
  SET: require('./set').default,
  SET_META: require('./setMeta').default,
  DELETE: deleteFn,
  DEL: deleteFn,
  REQUEST: require('./request').default,
  SYNC: require('./sync').default,
  EXPIRE: require('./expire').default,
} as Dictionary<ExchangeHandler>
