import GET from './get'
import GET_META from './getMeta'
import GET_IDENT from './getIdent'
import SET from './set'
import SET_META from './setMeta'
import DELETE from './delete'
import REQUEST from './request'
import SYNC from './sync'
import EXPIRE from './expire'
import { ExchangeHandler } from '../dispatch'

const handlers: Record<string, ExchangeHandler> = {
  GET,
  GET_META,
  GET_IDENT,
  SET,
  SET_META,
  DELETE,
  DEL: DELETE,
  REQUEST,
  SYNC,
  EXPIRE,
}

export default handlers
