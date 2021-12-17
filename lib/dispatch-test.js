import test from 'ava'
import sinon from 'sinon'

import dispatch from './dispatch'

// Tests -- actions

test('should exist', (t) => {
  t.is(typeof dispatch, 'function')
})

test('should route to GET action', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      service: 'entries',
      id: 'ent1',
      type: 'entry',
    },
  }
  const actions = {
    GET: async () => ({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }),
  }

  const ret = await dispatch({ actions })(action)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should return status noaction when no action', async (t) => {
  const action = null
  const services = {}

  const ret = await dispatch({ services })(action)

  t.deepEqual(ret, { status: 'noaction' })
})

test('should return null when unknown action', async (t) => {
  const action = { type: 'UNKNOWN' }
  const services = {}
  const actions = {}

  const ret = await dispatch({ services, actions })(action)

  t.deepEqual(ret, { status: 'noaction' })
})

test('should call action handler with action', async (t) => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const actions = { GET: getHandler }
  const ident = { id: 'ident1', roles: [], tokens: [] }
  const action = { type: 'GET', payload: {}, meta: { ident } }

  await dispatch({ actions })(action)

  t.is(getHandler.callCount, 1)
  t.deepEqual(getHandler.args[0][0], action)
})

test('should call action handler with payload and meta', async (t) => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const actions = { GET: getHandler }
  const action = { type: 'GET' }
  const expected = { type: 'GET', payload: {}, meta: {} }

  await dispatch({ actions })(action)

  t.is(getHandler.callCount, 1)
  t.deepEqual(getHandler.args[0][0], expected)
})

test('should call action handler with services, schemas, and identOptions', async (t) => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const actions = { GET: getHandler }
  const services = {}
  const schemas = {}
  const identOptions = {}
  const action = { type: 'GET' }

  await dispatch({ actions, services, schemas, identOptions })(action)

  t.is(getHandler.callCount, 1)
  const resources = getHandler.args[0][1]
  t.is(resources.services, services)
  t.is(resources.schemas, schemas)
  t.is(resources.identOptions, identOptions)
})

test('should call action handler with dispatch function', async (t) => {
  const action = { type: 'GET' }
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const actions = { GET: getHandler }

  const dispatchFn = dispatch({ actions })
  await dispatchFn(action)

  t.is(getHandler.callCount, 1)
  const resources = getHandler.args[0][1]
  t.is(resources.dispatch, dispatchFn)
})

test('should report progress', async (t) => {
  const progressStub = sinon.stub()
  const action = {
    type: 'GET',
    payload: {
      service: 'entries',
      id: 'ent1',
      type: 'entry',
    },
  }
  const actions = {
    GET: async (_action, { setProgress }) => {
      setProgress(0.5)
      return { status: 'ok', data: [] }
    },
  }

  const p = dispatch({ actions })(action)
  p.onProgress(progressStub)
  const ret = await p

  t.is(ret.status, 'ok')
  t.is(progressStub.callCount, 2)
  t.is(progressStub.args[0][0], 0.5)
  t.is(progressStub.args[1][0], 1)
})

test('should call middlewares', async (t) => {
  const action = { type: 'TEST' }
  const actions = { TEST: () => 'fromAction' }
  const middlewares = [
    (next) => async (action) => `<${await next(action)}>`,
    (next) => async (action) => `(${await next(action)})`,
  ]
  const expected = '<(fromAction)>'

  const ret = await dispatch({ actions, middlewares })(action)

  t.is(ret, expected)
})

test('should allow middlewares to abort middleware chain', async (t) => {
  const action = { type: 'TEST' }
  const actionHandler = sinon.stub().resolves({ status: 'ok' })
  const actions = { TEST: actionHandler }
  const middlewares = [(next) => async (action) => ({ status: 'error' })]

  const ret = await dispatch({ actions, middlewares })(action)

  t.deepEqual(ret, { status: 'error' })
  t.is(actionHandler.callCount, 0)
})

test('should dispatch to middleware from action handlers', async (t) => {
  const action = { type: 'DISPATCHER' }
  const actions = {
    TEST: () => 'fromAction',
    DISPATCHER: (action, { dispatch }) => dispatch({ type: 'TEST' }),
  }
  const middlewares = [(next) => async (action) => `<${await next(action)}>`]
  const expected = '<<fromAction>>'

  const ret = await dispatch({ actions, middlewares })(action)

  t.is(ret, expected)
})

test('should reject', async (t) => {
  const action = { type: 'TEST' }
  const actions = { TEST: () => 'fromAction' }
  const middlewares = [
    (_next) => async (_action) => {
      throw new Error("Don't know")
    },
    (next) => async (action) => `(${await next(action)})`,
  ]

  await t.throwsAsync(dispatch({ actions, middlewares })(action))
})
