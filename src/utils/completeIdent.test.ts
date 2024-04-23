import test from 'ava'
import sinon from 'sinon'
import { IdentType, type Action } from '../types.js'

import { completeIdent, completeIdentOnAction } from './completeIdent.js'

// Tests -- completeIdent

test('should complete ident with id', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const ident = { id: 'johnf' }
  const expectedIdent0 = { id: 'johnf' }
  const expected = {
    status: 'ok',
    access: {
      ident: { id: 'johnf', roles: ['editor'], isCompleted: true },
    },
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 1)
  const action0: Action = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent0)
  t.true(action0.meta?.cache)
  t.deepEqual(ret, expected)
})

test('should complete ident with token', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const ident = { withToken: 'twitter|23456' }
  const expectedIdent0 = { withToken: 'twitter|23456' }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'], isCompleted: true }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 1)
  const action0 = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent0)
  t.deepEqual(ret.access?.ident, expectedIdent1)
})

test('should complete ident with array of tokens', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const ident = { withToken: ['twitter|23456'] }
  const expectedIdent0 = { withToken: ['twitter|23456'] }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'], isCompleted: true }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 1)
  const action0 = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent0)
  t.deepEqual(ret.access?.ident, expectedIdent1)
})

test('should complete ident with ident from action when ok response has no ident', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
  })
  const ident = { id: 'johnf' }
  const expectedIdent = { id: 'johnf' }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 1)
  const action0 = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent)
  t.deepEqual(ret.access?.ident, expectedIdent)
})

test('should just return ident when no id or withToken', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const ident = {}
  const expected = { status: 'ok', access: { ident: {} } }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should return noaccess response when ident is not found', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'notfound', error: 'Not found' })
  const ident = { id: 'unknown' }
  const expected = {
    status: 'noaccess',
    error: "Ident 'unknown' was not found. [notfound] Not found",
    reason: 'unknownident',
    origin: 'auth:ident',
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(ret, expected)
})

test('should set autherror response when failing to get ident', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'timeout', error: 'Too slow' })
  const ident = { id: 'johnf' }
  const expected = {
    status: 'autherror',
    error: "Could not fetch ident 'johnf'. [timeout] Too slow",
    origin: 'auth:ident',
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(ret, expected)
})

test('should not complete ident twice', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const ident = { id: 'johnf' }
  const expectedIdent = { id: 'johnf', roles: ['editor'], isCompleted: true }

  const ret0 = await completeIdent(ident, dispatch)
  const identFrom0 = ret0.access?.ident
  const ret1 = await completeIdent(identFrom0, dispatch)

  t.is(dispatch.callCount, 1)
  t.is(dispatch.args[0][0].type, 'GET_IDENT')
  t.deepEqual(ret1.access?.ident, expectedIdent)
})

test('should do nothing when no ident ', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'rOoT?',
  })
  const ident = undefined
  const expected = {
    status: 'ok',
    access: { ident: undefined },
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should not complete root ident ', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'rOoT?',
  })
  const ident = { id: 'root', type: IdentType.Root }
  const expected = {
    status: 'ok',
    access: { ident: { id: 'root', type: IdentType.Root } },
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should not complete root ident with the obsolete root flag', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'rOoT?',
  })
  const ident = { id: 'root', root: true }
  const expected = {
    status: 'ok',
    access: { ident: { id: 'root', root: true } },
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should not complete scheduler ident ', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'who?',
  })
  const ident = { id: 'scheduler', type: IdentType.Scheduler }
  const expected = {
    status: 'ok',
    access: { ident: { id: 'scheduler', type: IdentType.Scheduler } },
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should not complete anonymous ident ', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'who?',
  })
  const ident = { id: 'anonymous', type: IdentType.Anon }
  const expected = {
    status: 'ok',
    access: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }

  const ret = await completeIdent(ident, dispatch)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

// Tests -- completeIdentOnAction

test('should complete ident on action', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' }, id: '12345' },
  }
  const expectedIdent0 = { id: 'johnf' }
  const expected = {
    type: 'GET',
    payload: {},
    meta: {
      ident: { id: 'johnf', roles: ['editor'], isCompleted: true },
      id: '12345',
    },
  }

  const ret = await completeIdentOnAction(action, dispatch)

  t.is(dispatch.callCount, 1)
  const action0: Action = dispatch.args[0][0]
  t.is(action0.type, 'GET_IDENT')
  t.deepEqual(action0.meta?.ident, expectedIdent0)
  t.true(action0.meta?.cache)
  t.deepEqual(ret, expected)
})

test('should set noaccess response on action when ident is not found', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'notfound', error: 'Not found' })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'unknown' }, id: '12345' },
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
    meta: { ident: { id: 'unknown' }, id: '12345' },
  }

  const ret = await completeIdentOnAction(action, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(ret, expected)
})

// Note: All other test cases for `completeIdentOnAction()` are handled for `completeIdent()`
