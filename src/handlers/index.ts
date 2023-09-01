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
import UPDATE from './update.js'
import type { ActionHandler } from '../types.js'

export const QUEUE_SYMBOL = Symbol('<internal queue>')

const handlers: Record<string | symbol, ActionHandler> = {
  GET,
  GET_ALL,
  GET_META,
  GET_IDENT,
  RUN: runFn(new Map()), // This includes the handler with no jobs. Will be overwritten in `create()`
  SET,
  SET_META,
  DELETE,
  DEL: DELETE,
  SYNC,
  EXPIRE,
  [QUEUE_SYMBOL]: QUEUE,
  SERVICE,
  UPDATE,
}

export default handlers
