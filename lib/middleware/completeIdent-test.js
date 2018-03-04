import test from 'ava'
import sinon from 'sinon'

import completeIdent from './completeIdent'

test('should exist', (t) => {
  t.is(typeof completeIdent, 'function')
  t.is(typeof completeIdent(), 'function')
})

test('should complete ident with id', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok', data: {}, access: {status: 'granted', ident: {id: 'johnf', roles: ['editor']}}
  })
  const action = {type: 'GET', payload: {}, meta: {ident: {id: 'johnf'}}}
  const expected1 = {type: 'GET_IDENT', payload: {}, meta: {ident: {id: 'johnf'}}}
  const expected2 = {
    type: 'GET',
    payload: {},
    meta: {ident: {id: 'johnf', roles: ['editor']}}
  }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should complete ident with token', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok', data: {}, access: {status: 'granted', ident: {id: 'johnf', roles: ['editor']}}
  })
  const action = {type: 'GET', payload: {}, meta: {ident: {withToken: 'twitter|23456'}}}
  const expected1 = {type: 'GET_IDENT', payload: {}, meta: {ident: {withToken: 'twitter|23456'}}}
  const expected2 = {
    type: 'GET',
    payload: {},
    meta: {ident: {id: 'johnf', roles: ['editor']}}
  }

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should pass on action when no ident', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const action = {type: 'GET', payload: {type: 'entry'}}

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should pass on action when ident is not found', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'notfound', error: 'Not found'})
  const action = {type: 'GET', payload: {}, meta: {ident: {id: 'unknown'}}}

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], action)
})

test('should pass on action when no id or withToken', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const action = {type: 'GET', payload: {}, meta: {ident: {}}}

  await completeIdent(dispatch)(action)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})
