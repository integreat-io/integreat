import test from 'ava'
import sinon = require('sinon')
import { Action, InternalDispatch, Middleware } from './types'
import createService from './service'

import dispatch, { ActionHandler } from './dispatch'

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

  t.is(ret.status, 'noaction')
  t.is(handlers.QUEUE.callCount, 0)
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

test('should return status noaction when no action', async (t) => {
  const action = null
  const handlers = {}

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'noaction')
  t.is(ret.error, 'Dispatched no action')
})

test('should return noaction when unknown action', async (t) => {
  const action = { type: 'UNKNOWN', payload: {} }
  const services = {}
  const handlers = {}

  const ret = await dispatch({ handlers, services, schemas, options })(action)

  t.is(ret.status, 'noaction')
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
  const action = { type: 'GET', payload: {}, meta: { ident } }
  const expected = action

  await dispatch({ handlers, services, schemas, options })(action)

  t.is(getHandler.callCount, 1)
  t.deepEqual(getHandler.args[0][0], expected)
  t.is(typeof getHandler.args[0][1], 'function')
  t.is(typeof getHandler.args[0][2], 'function')
  t.is(getHandler.args[0][3], options)
})

test('should call with action', async (t) => {
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
    DISPATCHER: async (_action: Action, dispatch: InternalDispatch) =>
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
