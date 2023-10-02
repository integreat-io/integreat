import test from 'ava'
import sinon from 'sinon'

import completeIdent from './completeIdent.js'
import { IdentType } from '../types.js'

// Tests

test('should complete ident with id', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'] } },
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
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'] } },
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

test('should complete ident with arary of tokens', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'] } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { withToken: ['twitter|23456'] } },
  }
  const expectedIdent0 = { withToken: ['twitter|23456'] }
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

test('should not complete root ident ', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'rOoT?',
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should not complete root ident with the obsolete root flag', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'rOoT?',
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'root', root: true } },
  }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should not complete anonymous ident ', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'who?',
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should complete ident with ident from action when ok response has no ident', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const expectedIdent = { id: 'johnf' }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  const action0 = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent)
  const action1 = dispatch.args[1][0]
  t.is(action1.type, 'GET')
  t.deepEqual(action1.meta?.ident, expectedIdent)
})

test('should pass on action when no ident', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: { type: 'entry' } }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should remove ident on action when ident is not found', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'notfound', error: 'Not found' })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'unknown' } },
  }

  const expected = {
    type: 'GET',
    payload: {},
    meta: { ident: undefined },
  }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], expected)
})

test('should pass on action when no id or withToken', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: {}, meta: { ident: {} } }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})
