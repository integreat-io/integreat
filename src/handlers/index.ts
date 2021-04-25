import GET from './get'
import GET_ALL from './getAll'
import GET_META from './getMeta'
import GET_IDENT from './getIdent'
import SET from './set'
import SET_META from './setMeta'
import DELETE from './delete'
import SYNC from './sync'
import EXPIRE from './expire'
import { ActionHandler } from '../dispatch'

const handlers: Record<string, ActionHandler> = {
  GET,
  GET_ALL,
  GET_META,
  GET_IDENT,
  SET,
  SET_META,
  DELETE,
  DEL: DELETE,
  SYNC,
  EXPIRE,
}

export default handlers
