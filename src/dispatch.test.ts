import test from 'ava'
import sinon = require('sinon')
import {
  Action,
  Middleware,
  ActionHandler,
  ActionHandlerResources,
} from './types.js'
import createService from './service/index.js'

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
  }
  const handlers = {
    GET: async () => ({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should route action with queue flag to QUEUE handler', async (t) => {
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
  const handlers = {
    SET: sinon.stub().resolves({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
    }),
    QUEUE: sinon.stub().resolves({
      ...action,
      response: { status: 'queued' },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'queued')
  t.is(handlers.SET.callCount, 0)
  t.is(handlers.QUEUE.callCount, 1)
  const handlerAction = handlers.QUEUE.args[0][0]
  t.falsy(handlerAction.meta?.queue)
})

test('should not route to QUEUE handler when no queue service', async (t) => {
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
  const handlers = {
    SET: sinon.stub().resolves({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
    }),
    QUEUE: sinon.stub().resolves({
      ...action,
      response: { status: 'queued' },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok')
  t.is(handlers.QUEUE.callCount, 0)
  t.is(handlers.SET.callCount, 1)
  const handlerAction = handlers.SET.args[0][0]
  t.falsy(handlerAction.meta?.queue)
})

test('should not allow QUEUE when set as an action type', async (t) => {
  const options = { queueService: 'queue' }
  const action = {
    type: 'QUEUE',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const handlers = {
    QUEUE: sinon.stub().resolves({
      ...action,
      response: { status: 'queued' },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'error')
  t.is(handlers.QUEUE.callCount, 0)
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
    GET: async (action: Action) => ({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
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
    GET: async (action: Action) => ({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
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
    GET: async (action: Action) => ({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
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
    GET: async (action: Action) => ({
      ...action,
      response:
        action.payload.targetService === 'entries'
          ? { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }
          : { status: 'error', error: 'Service not set' },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should set set params props on payload', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
      params: {
        getArchived: true,
      },
    },
  }
  const handlers = {
    GET: async (action: Action) => ({
      ...action,
      response: action.payload.getArchived
        ? { status: 'ok', data: [] }
        : { status: 'error', error: 'getArchived is not true' },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'ok', ret.error)
})

test('should return status noaction when no action', async (t) => {
  const action = null
  const handlers = {}

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'noaction')
  t.is(ret.error, 'Dispatched no action')
})

test('should return badrequest when unknown action', async (t) => {
  const action = { type: 'UNKNOWN', payload: {} }
  const services = {}
  const handlers = {}

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'badrequest')
  t.is(ret.error, 'No handler for UNKNOWN action')
})

test('should call action handler with action, dispatch, getService, and options', async (t) => {
  const getHandler = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
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
  const expected = action

  await dispatch({ handlers, services, schemas, options })(action)

  t.is(getHandler.callCount, 1)
  t.deepEqual(getHandler.args[0][0], expected)
  const resources = getHandler.args[0][1]
  t.is(typeof resources.dispatch, 'function')
  t.is(typeof resources.getService, 'function')
  t.is(resources.options, options)
})

test('should call middleware', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handlers = {
    TEST: async () => ({
      ...action,
      response: { status: 'fromAction' },
    }),
  }
  const middleware: Middleware[] = [
    (next) => async (action) => ({
      ...action,
      response: {
        ...action.response,
        status: `<${(await next(action)).response?.status}>`,
      },
    }),
    (next) => async (action) => ({
      ...action,
      response: {
        ...action.response,

        status: `(${(await next(action)).response?.status})`,
      },
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
  const handler = sinon
    .stub()
    .resolves({ ...action, response: { status: 'ok' } })
  const handlers = { TEST: handler }
  const middleware: Middleware[] = [
    (_next) => async (action) => ({ ...action, response: { status: 'error' } }),
  ]

  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middleware,
    options,
  })(action)

  t.is(ret.status, 'error')
  t.is(handler.callCount, 0)
})

test('should dispatch to middleware from action handlers', async (t) => {
  const action = { type: 'DISPATCHER', payload: {}, meta: {} }
  const handlers: Record<string, ActionHandler> = {
    TEST: async () => ({
      type: 'TEST',
      payload: {},
      response: { status: 'fromAction' },
    }),
    DISPATCHER: async (_action: Action, { dispatch }: ActionHandlerResources) =>
      dispatch({ type: 'TEST', payload: {} }),
  }
  const middleware: Middleware[] = [
    (next) => async (action) => ({
      ...action,
      response: {
        ...action.response,
        status: `<${(await next(action)).response?.status}>`,
      },
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
    async GET(action: Action, { setProgress }: ActionHandlerResources) {
      setProgress(0.5)
      return { ...action, response: { status: 'ok', data: [] } }
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
    GET: async () => ({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(ret.error, "Source service 'unknown' not found")
})

test('should return error when no endoint on source service matches', async (t) => {
  const services = {
    api: createService({ schemas: {} })({
      id: 'api',
      endpoints: [],
    }),
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
    GET: async () => ({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] },
    }),
  }

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(ret.error, "No matching endpoint for incoming mapping on service 'api'")
})

test('should return error instead of throwing', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handlers = {
    TEST: async () => ({
      ...action,
      response: { status: 'fromAction' },
    }),
  }
  const middleware: Middleware[] = [
    (_next) => async (_action) => {
      throw new Error("Too little memory. It's tiny")
    },
  ]
  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middleware,
    options,
  })(action)

  t.is(ret.status, 'error')
  t.is(
    ret.error,
    "Error thrown in dispatch: Error: Too little memory. It's tiny"
  )
})
