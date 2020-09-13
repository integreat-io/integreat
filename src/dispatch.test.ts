import test from 'ava'
import sinon = require('sinon')
import { completeExchange } from './utils/exchangeMapping'
import { Middleware, Exchange, InternalDispatch } from './types'
import createService from './service'

import dispatch from './dispatch'

// Setup

const services = {}
const schemas = {}

// Tests

test('should route to GET action', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      targetService: 'entries',
      id: 'ent1',
      type: 'entry',
    },
  }
  const handlers = {
    GET: async () =>
      completeExchange({
        status: 'ok',
        response: { data: [{ id: 'ent1', type: 'entry' }] },
      }),
  }

  const ret = await dispatch({ handlers, services, schemas })(action)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should return status noaction when no action', async (t) => {
  const action = null
  const handlers = {}

  const ret = await dispatch({ handlers, services, schemas })(action)

  t.is(ret.status, 'noaction')
  t.is(ret.error, 'Dispatched no action')
})

test('should return noaction when unknown action', async (t) => {
  const action = { type: 'UNKNOWN', payload: {} }
  const services = {}
  const handlers = {}

  const ret = await dispatch({ handlers, services, schemas })(action)

  t.is(ret.status, 'noaction')
  t.is(ret.error, 'Dispatched unknown action')
})

test('should call action handler with exchange, dispatch, getService, and identConfig', async (t) => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { GET: getHandler }
  const services = {}
  const schemas = {}
  const identConfig = { type: 'account' }
  const ident = { id: 'ident1', roles: [], tokens: [] }
  const action = { type: 'GET', payload: {}, meta: { ident } }
  const expected = completeExchange({
    type: 'GET',
    status: null,
    request: { params: {} },
    response: {},
    endpointId: undefined,
    ident,
    meta: {},
  })

  await dispatch({ handlers, services, schemas, identConfig })(action)

  t.is(getHandler.callCount, 1)
  t.deepEqual(getHandler.args[0][0], expected)
  t.is(typeof getHandler.args[0][1], 'function')
  t.is(typeof getHandler.args[0][2], 'function')
  t.is(getHandler.args[0][3], identConfig)
})

test('should call middlewares with exchange', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handlers = {
    TEST: async () => completeExchange({ status: 'fromAction' }),
  }
  const middlewares: Middleware[] = [
    (next) => async (exchange) => ({
      ...exchange,
      status: `<${(await next(exchange)).status}>`,
    }),
    (next) => async (exchange) => ({
      ...exchange,
      status: `(${(await next(exchange)).status})`,
    }),
  ]
  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middlewares,
  })(action)

  t.is(ret.status, '<(fromAction)>')
})

test('should allow middlewares to abort middleware chain', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { TEST: handler }
  const middlewares: Middleware[] = [
    (_next) => async (exchange) => ({ ...exchange, status: 'error' }),
  ]

  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middlewares,
  })(action)

  t.is(ret.status, 'error')
  t.is(handler.callCount, 0)
})

test('should dispatch to middleware from action handlers', async (t) => {
  const action = { type: 'DISPATCHER', payload: {}, meta: {} }
  const handlers = {
    TEST: async () => completeExchange({ status: 'fromAction' }),
    DISPATCHER: async (_exchange: Exchange, dispatch: InternalDispatch) =>
      dispatch(completeExchange({ type: 'TEST' })),
  }
  const middlewares: Middleware[] = [
    (next) => async (exchange) => ({
      ...exchange,
      status: `<${(await next(exchange)).status}>`,
    }),
  ]

  const ret = await dispatch({
    handlers,
    services,
    schemas,
    middlewares,
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
    GET: async () =>
      completeExchange({
        status: 'ok',
        response: { data: [{ id: 'ent1', type: 'entry' }] },
      }),
  }

  const ret = await dispatch({ handlers, services, schemas })(action)

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
    GET: async () =>
      completeExchange({
        status: 'ok',
        response: { data: [{ id: 'ent1', type: 'entry' }] },
      }),
  }

  const ret = await dispatch({ handlers, services, schemas })(action)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(ret.error, "No matching endpoint for incoming mapping on service 'api'")
})
