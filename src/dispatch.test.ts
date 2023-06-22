import test from 'ava'
import sinon from 'sinon'
import Service from './service/index.js'
import { QUEUE_SYMBOL } from './handlers/index.js'
import type {
  Action,
  Middleware,
  ActionHandler,
  ActionHandlerResources,
} from './types.js'

import dispatch from './dispatch.js'

// Setup

const services = {}
const schemas = {}
const options = {}

// Tests

test('should route to relevant action handler', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const handlers = {
    GET: async () => ({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }),
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', type: 'entry' }],
    access: { ident: { id: 'johnf' } },
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.deepEqual(ret, expected)
})

test('should route action with queue flag to queue handler', async (t) => {
  const options = { queueService: 'queue' }
  const action = {
    type: 'SET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const setHandler = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] })
  const queueHandler = sinon.stub().resolves({ status: 'queued' })
  const handlers = {
    SET: setHandler,
    [QUEUE_SYMBOL]: queueHandler,
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'queued')
  t.is(setHandler.callCount, 0)
  t.is(queueHandler.callCount, 1)
  const handlerAction = queueHandler.args[0][0]
  t.falsy(handlerAction.meta?.queue)
})

test('should not route to queue handler when no queue service', async (t) => {
  const options = { queueService: undefined }
  const action = {
    type: 'SET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const setHandler = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] })
  const queueHandler = sinon.stub().resolves({ status: 'queued' })
  const handlers = {
    SET: setHandler,
    [QUEUE_SYMBOL]: queueHandler,
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok')
  t.is(queueHandler.callCount, 0)
  t.is(setHandler.callCount, 1)
  const handlerAction = setHandler.args[0][0]
  t.falsy(handlerAction.meta?.queue)
})

test('should set dispatchedAt meta', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const before = Date.now()
  const ret = await dispatch({ handlers, services, schemas, options })(action)
  const after = Date.now()

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(typeof calledAction.meta?.dispatchedAt, 'number')
  t.true((calledAction.meta?.dispatchedAt as number) >= before)
  t.true((calledAction.meta?.dispatchedAt as number) <= after)
})

test('should override any present dispatchedAt meta', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { dispatchedAt: new Date('2022-12-01T18:43:11Z').getTime() },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const before = Date.now()
  const ret = await dispatch({ handlers, services, schemas, options })(action)
  const after = Date.now()

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(typeof calledAction.meta?.dispatchedAt, 'number')
  t.true((calledAction.meta?.dispatchedAt as number) >= before)
  t.true((calledAction.meta?.dispatchedAt as number) <= after)
})

test('should remove authorized meta if set', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { authorized: true },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(calledAction.meta?.authorized, undefined)
})

test('should set id and cid in meta when not already set', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(typeof calledAction.meta?.id, 'string')
  t.is(calledAction.meta?.cid, calledAction.meta?.id)
})

test('should not touch id and cid from action', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { id: '11004', cid: '11005' },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(calledAction.meta?.id, '11004')
  t.is(calledAction.meta?.cid, '11005')
})

test('should set cid to same value as id when not already set', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { id: '11004' },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(calledAction.meta?.id, '11004')
  t.is(calledAction.meta?.cid, '11004')
})

test('should map payload property service to targetService', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      service: 'entries',
    },
  }
  const handlers = {
    GET: async (action: Action) =>
      action.payload.targetService === 'entries'
        ? { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }
        : { status: 'error', error: 'Service not set' }, // Will be triggered when no `targetService`
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should set origin when handler return error response with no origin', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const handlers = {
    GET: async () => ({ status: 'error', error: 'Where did this come from?' }),
  }
  const expected = {
    status: 'error',
    error: 'Where did this come from?',
    access: { ident: { id: 'johnf' } },
    origin: 'handler:GET',
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.deepEqual(ret, expected)
})

test('should return status noaction when no action', async (t) => {
  const action = null
  const handlers = {}
  const expected = {
    status: 'noaction',
    error: 'Dispatched no action',
    origin: 'dispatch',
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.deepEqual(ret, expected)
})

test('should return badrequest when unknown action', async (t) => {
  const action = { type: 'UNKNOWN', payload: {} }
  const services = {}
  const handlers = {}
  const expected = {
    status: 'badrequest',
    error: 'No handler for UNKNOWN action',
    origin: 'dispatch',
    access: { ident: undefined },
  }
  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.deepEqual(ret, expected)
})

test('should call action handler with action, dispatch, getService, and options', async (t) => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { GET: getHandler }
  const services = {}
  const schemas = {}
  const options = { identConfig: { type: 'account' }, queueService: 'queue' }
  const ident = { id: 'ident1', roles: [], tokens: [] }
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident, id: '11004', cid: '11004' },
  }

  await dispatch({ handlers, services, schemas, options })(action)

  t.is(getHandler.callCount, 1)
  const dispatchedAction = getHandler.args[0][0]
  t.is(dispatchedAction.type, 'GET')
  t.deepEqual(dispatchedAction.payload, {})
  t.deepEqual(dispatchedAction.meta.ident, ident)
  t.is(dispatchedAction.meta.id, '11004')
  t.is(dispatchedAction.meta.cid, '11004')
  const resources = getHandler.args[0][1]
  t.is(typeof resources.dispatch, 'function')
  t.is(typeof resources.getService, 'function')
  t.is(resources.options, options)
})

test('should call middleware', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handlers = {
    TEST: async () => ({ status: 'fromAction' }),
  }
  const middleware: Middleware[] = [
    (next) => async (action) => ({
      ...action.response,
      status: `<${(await next(action)).status}>`,
    }),
    (next) => async (action) => ({
      ...action.response,
      status: `(${(await next(action)).status})`,
    }),
  ]
  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middleware,
    options,
  })(action)

  t.is(ret.status, '<(fromAction)>')
})

test('should allow middleware to abort middleware chain', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { TEST: handler }
  const middleware: Middleware[] = [
    (_next) => async (_action) => ({ status: 'error' }),
  ]
  const expected = {
    status: 'error',
    origin: 'middleware:dispatch',
    access: { ident: undefined },
  }

  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middleware,
    options,
  })(action)

  t.deepEqual(ret, expected)
  t.is(handler.callCount, 0)
})

test('should dispatch to middleware from action handlers', async (t) => {
  const action = { type: 'DISPATCHER', payload: {}, meta: {} }
  const handlers: Record<string, ActionHandler> = {
    TEST: async () => ({ status: 'fromAction' }),
    DISPATCHER: async (_action: Action, { dispatch }: ActionHandlerResources) =>
      dispatch({ type: 'TEST', payload: {} }),
  }
  const middleware: Middleware[] = [
    (next) => async (action) => ({
      ...action.response,
      status: `<${(await next(action)).status}>`,
    }),
  ]

  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middleware,
    options,
  })(action)

  t.is(ret.status, '<<fromAction>>')
})

test('should support progress reporting', async (t) => {
  const progressStub = sinon.stub()
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const handlers = {
    async GET(_action: Action, { setProgress }: ActionHandlerResources) {
      setProgress(0.5)
      return { status: 'ok', data: [] }
    },
  }

  const p = dispatch({ handlers, services, schemas, options })(action)
  p.onProgress(progressStub)
  const ret = await p

  t.is(ret.status, 'ok')
  t.is(progressStub.callCount, 2)
  t.is(progressStub.args[0][0], 0.5)
  t.is(progressStub.args[1][0], 1)
})

// Note: Happy case for incoming mapping is tested in /tests/incoming

test('should return error when source service is not found', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      sourceService: 'unknown',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async () => ({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }),
  }
  const expected = {
    status: 'badrequest',
    error: "Source service 'unknown' not found",
    origin: 'dispatch',
    access: { ident: undefined },
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.deepEqual(ret, expected)
})

test('should return error when no endoint on source service matches', async (t) => {
  const services = {
    api: new Service(
      {
        id: 'api',
        endpoints: [],
      },
      { schemas: {} }
    ),
  }
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      sourceService: 'api',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async () => ({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }),
  }
  const expected = {
    status: 'badrequest',
    error: "No matching endpoint for incoming mapping on service 'api'",
    origin: 'dispatch',
    access: { ident: undefined },
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.deepEqual(ret, expected)
})

test('should return error instead of throwing', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handlers = {
    TEST: async () => ({ status: 'fromAction' }),
  }
  const middleware: Middleware[] = [
    (_next) => async (_action) => {
      throw new Error("Too little memory. It's tiny")
    },
  ]
  const expected = {
    status: 'error',
    error: "Error thrown in dispatch: Error: Too little memory. It's tiny",
    origin: 'dispatch',
    access: { ident: undefined },
  }

  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middleware,
    options,
  })(action)

  t.deepEqual(ret, expected)
})
