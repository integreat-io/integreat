import test from 'ava'
import sinon = require('sinon')

import dispatch from './dispatch'

// Setup

const services = {}
const schemas = {}

// Tests

test('should route to GET action', async t => {
  const action = {
    type: 'GET',
    payload: {
      service: 'entries',
      id: 'ent1',
      type: 'entry'
    }
  }
  const actionHandlers = {
    GET: async () => ({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] })
  }

  const ret = await dispatch({ actionHandlers, services, schemas })(action)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should return status noaction when no action', async t => {
  const action = null
  const actionHandlers = {}

  const ret = await dispatch({ actionHandlers, services, schemas })(
    action as any
  )

  t.deepEqual(ret, { status: 'noaction', error: 'Dispatched no action' })
})

test('should return null when unknown action', async t => {
  const action = { type: 'UNKNOWN', payload: {} }
  const services = {}
  const actionHandlers = {}

  const ret = await dispatch({ actionHandlers, services, schemas })(action)

  t.deepEqual(ret, {
    status: 'noaction',
    error: 'Dispatched unknown action'
  })
})

test('should call action handler with action', async t => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const actionHandlers = { GET: getHandler }
  const ident = { id: 'ident1', roles: [], tokens: [] }
  const action = { type: 'GET', payload: {}, meta: { ident } }

  await dispatch({ actionHandlers, services, schemas })(action)

  t.is(getHandler.callCount, 1)
  t.deepEqual(getHandler.args[0][0], action)
})

test('should call action handler with action, dispatch, getService, and identConfig', async t => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const actionHandlers = { GET: getHandler }
  const services = {}
  const schemas = {}
  const identConfig = { type: 'account' }
  const action = { type: 'GET', payload: {} }
  const expectedAction = { type: 'GET', payload: {}, meta: {} }

  await dispatch({ actionHandlers, services, schemas, identConfig })(action)

  t.is(getHandler.callCount, 1)
  t.deepEqual(getHandler.args[0][0], expectedAction)
  t.is(typeof getHandler.args[0][1], 'function')
  t.is(typeof getHandler.args[0][2], 'function')
  t.is(getHandler.args[0][3], identConfig)
})

test('should call action handler with dispatch function', async t => {
  const action = { type: 'GET', payload: {} }
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const actionHandlers = { GET: getHandler }

  const dispatchFn = dispatch({ actionHandlers, services, schemas })
  await dispatchFn(action)

  t.is(getHandler.callCount, 1)
  t.is(getHandler.args[0][1], dispatchFn)
})

test('should call middlewares', async t => {
  const action = { type: 'TEST', payload: {} }
  const actionHandlers = { TEST: async () => ({ status: 'fromAction' }) }
  const middlewares = [
    next => async action => ({ status: `<${(await next(action)).status}>` }),
    next => async action => ({ status: `(${(await next(action)).status})` })
  ]
  const expected = { status: '<(fromAction)>' }

  const ret = await dispatch({
    actionHandlers,
    services,
    schemas,
    middlewares
  })(action)

  t.deepEqual(ret, expected)
})

test('should allow middlewares to abort middleware chain', async t => {
  const action = { type: 'TEST', payload: {} }
  const actionHandler = sinon.stub().resolves({ status: 'ok' })
  const actionHandlers = { TEST: actionHandler }
  const middlewares = [_next => async _action => ({ status: 'error' })]

  const ret = await dispatch({
    actionHandlers,
    services,
    schemas,
    middlewares
  })(action)

  t.deepEqual(ret, { status: 'error' })
  t.is(actionHandler.callCount, 0)
})

test('should dispatch to middleware from action handlers', async t => {
  const action = { type: 'DISPATCHER', payload: {} }
  const actionHandlers = {
    TEST: async () => ({ status: 'fromAction' }),
    DISPATCHER: async (action, dispatch) => dispatch({ type: 'TEST' })
  }
  const middlewares = [
    next => async action => ({ status: `<${(await next(action)).status}>` })
  ]
  const expected = { status: '<<fromAction>>' }

  const ret = await dispatch({
    actionHandlers,
    services,
    schemas,
    middlewares
  })(action)

  t.deepEqual(ret, expected)
})
