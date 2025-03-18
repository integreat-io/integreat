import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import { IdentType, type Action } from '../types.js'

import completeIdent from './completeIdent.js'

// Tests

test('should complete ident with id', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const expectedIdent0 = { id: 'johnf' }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'], isCompleted: true }

  await completeIdent(dispatch)(action)

  assert.equal(dispatch.callCount, 2)
  const action0: Action = dispatch.args[0][0]
  assert.equal(action0.type, 'GET_IDENT')
  assert.deepEqual(action0.meta?.ident, expectedIdent0)
  assert.equal(action0.meta?.cache, true)
  const action1: Action = dispatch.args[1][0]
  assert.equal(action1.type, 'GET')
  assert.deepEqual(action1.meta?.ident, expectedIdent1)
})

test('should complete ident with token', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }
  const expectedIdent0 = { withToken: 'twitter|23456' }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'], isCompleted: true }

  await completeIdent(dispatch)(action)

  assert.equal(dispatch.callCount, 2)
  const action0 = dispatch.args[0][0]
  assert.equal(action0.type, 'GET_IDENT')
  assert.deepEqual(action0.meta?.ident, expectedIdent0)
  const action1 = dispatch.args[1][0]
  assert.equal(action1.type, 'GET')
  assert.deepEqual(action1.meta?.ident, expectedIdent1)
})

test('should complete ident with array of tokens', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { withToken: ['twitter|23456'] } },
  }
  const expectedIdent0 = { withToken: ['twitter|23456'] }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'], isCompleted: true }

  await completeIdent(dispatch)(action)

  assert.equal(dispatch.callCount, 2)
  const action0 = dispatch.args[0][0]
  assert.equal(action0.type, 'GET_IDENT')
  assert.deepEqual(action0.meta?.ident, expectedIdent0)
  const action1 = dispatch.args[1][0]
  assert.equal(action1.type, 'GET')
  assert.deepEqual(action1.meta?.ident, expectedIdent1)
})

test('should not complete ident twice', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const expectedIdent = { id: 'johnf', roles: ['editor'], isCompleted: true }

  const ret0 = await completeIdent(dispatch)(action)
  const ident = ret0.access?.ident
  const ret1 = await completeIdent(dispatch)({
    ...action,
    meta: { ...action.meta, ident },
  })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].type, 'GET_IDENT')
  assert.equal(dispatch.args[1][0].type, 'GET')
  assert.equal(dispatch.args[1][0].type, 'GET')
  assert.deepEqual(ret1.access?.ident, expectedIdent)
})

test('should not complete root ident ', async () => {
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

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], action)
})

test('should not complete root ident with the obsolete root flag', async () => {
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

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], action)
})

test('should not complete scheduler ident ', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'who?',
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'scheduler', type: IdentType.Scheduler } },
  }

  await completeIdent(dispatch)(action)

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], action)
})

test('should not complete anonymous ident ', async () => {
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

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], action)
})

test('should complete ident with ident from action when ok response has no ident', async () => {
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

  assert.equal(dispatch.callCount, 2)
  const action0 = dispatch.args[0][0]
  assert.equal(action0.type, 'GET_IDENT')
  assert.deepEqual(action0.meta?.ident, expectedIdent)
  const action1 = dispatch.args[1][0]
  assert.equal(action1.type, 'GET')
  assert.deepEqual(action1.meta?.ident, expectedIdent)
})

test('should pass on action when no ident', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: { type: 'entry' } }
  const expected = { ...action, meta: { ident: undefined } }

  await completeIdent(dispatch)(action)

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expected)
})

test('should set error response when ident is not found', async () => {
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
    response: {
      status: 'noaccess',
      error: "Ident 'unknown' was not found. [notfound] Not found",
      reason: 'unknownident',
      origin: 'auth:ident',
    },
    meta: { ident: { id: 'unknown' } },
  }

  await completeIdent(dispatch)(action)

  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[1][0], expected)
})

test('should pass on action when no id or withToken', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: {}, meta: { ident: {} } }

  await completeIdent(dispatch)(action)

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], action)
})
