import test from 'ava'
import sinon from 'sinon'

import completeIdent from './completeIdent.js'

// Tests

test('should complete ident with id', async (t) => {
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    payload: {},
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf', roles: ['editor'] } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const expectedIdent0 = { id: 'johnf' }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'] }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  const action0 = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent0)
  const action1 = dispatch.args[1][0]
  t.is(action1.type, 'GET')
  t.deepEqual(action1.meta?.ident, expectedIdent1)
})

test('should complete ident with token', async (t) => {
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    payload: {},
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf', roles: ['editor'] } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }
  const expectedIdent0 = { withToken: 'twitter|23456' }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'] }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  const action0 = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent0)
  const action1 = dispatch.args[1][0]
  t.is(action1.type, 'GET')
  t.deepEqual(action1.meta?.ident, expectedIdent1)
})

test('should pass on action when no ident', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
  const action = { type: 'GET', payload: { type: 'entry' } }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should pass on action when ident is not found', async (t) => {
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    payload: {},
    response: { status: 'notfound', error: 'Not found' },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'unknown' } },
  }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], action)
})

test('should pass on action when no id or withToken', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
  const action = { type: 'GET', payload: {}, meta: { ident: {} } }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})
