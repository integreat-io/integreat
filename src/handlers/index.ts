import GET from './get'
import GET_ALL from './getAll'
import GET_META from './getMeta'
import GET_IDENT from './getIdent'
import runFn from './run'
import SET from './set'
import SET_META from './setMeta'
import DELETE from './delete'
import SYNC from './sync'
import EXPIRE from './expire'
import QUEUE from './queue'
import SERVICE from './service'
import { ActionHandler } from '../types'

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
