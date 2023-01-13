import GET from './get.js'
import GET_ALL from './getAll.js'
import GET_META from './getMeta.js'
import GET_IDENT from './getIdent.js'
import runFn from './run.js'
import SET from './set.js'
import SET_META from './setMeta.js'
import DELETE from './delete.js'
import SYNC from './sync.js'
import EXPIRE from './expire.js'
import QUEUE from './queue.js'
import SERVICE from './service.js'
import { ActionHandler } from '../types.js'

const handlers: Record<string, ActionHandler> = {
  GET,
  GET_ALL,
  GET_META,
  GET_IDENT,
  RUN: runFn({}, {}), // This includes the handler with no jobs. Will be overwritten in `create()`
  SET,
  SET_META,
  DELETE,
  DEL: DELETE,
  SYNC,
  EXPIRE,
  QUEUE,
  SERVICE,
}

export default handlers
