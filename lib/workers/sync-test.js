import test from 'ava'
import sinon from 'sinon'

import sync from './sync'

test('should exist', (t) => {
  t.is(typeof sync, 'function')
})

test('should dispatch GET to source', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok'})
  const expected = {
    type: 'GET',
    payload: {
      source: 'users',
      type: 'user'
    }
  }
  const def = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all'
  }

  await sync(def, {dispatch})

  t.true(dispatch.callCount >= 1)
  const action = dispatch.args[0][0]
  t.deepEqual(action, expected)
})

test('should dispatch SET_ONE to target', async (t) => {
  const johnData = {id: 'john', type: 'user', attributes: {name: 'John'}}
  const jennyData = {id: 'jenny', type: 'user', attributes: {name: 'Jenny'}}
  const dispatch = sinon.stub().resolves({status: 'ok', data: [johnData, jennyData]})
  const queue = sinon.stub().resolves({status: 'ok'})
  const expected1 = {type: 'SET_ONE', payload: {source: 'store', data: johnData}}
  const expected2 = {type: 'SET_ONE', payload: {source: 'store', data: jennyData}}
  const def = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all'
  }

  await sync(def, {dispatch, queue})

  t.is(queue.callCount, 2)
  const action1 = queue.args[0][0]
  const action2 = queue.args[1][0]
  t.deepEqual(action1, expected1)
  t.deepEqual(action2, expected2)
})

test('should set lastSyncedAt on source', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: [{id: 'john', type: 'user'}]})
  const queue = async () => ({status: 'ok'})
  const def = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all'
  }

  const before = Date.now()
  await sync(def, {dispatch, queue})
  const after = Date.now()

  t.is(dispatch.callCount, 2)
  const action = dispatch.args[1][0]
  t.is(action.type, 'SET_META')
  t.truthy(action.payload)
  t.is(action.payload.source, 'users')
  t.truthy(action.payload.meta)
  t.true(action.payload.meta.lastSyncedAt >= before)
  t.true(action.payload.meta.lastSyncedAt <= after)
})

test('should not set lastSyncedAt when there is no updates', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const queue = async () => ({status: 'ok'})
  const def = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all'
  }

  await sync(def, {dispatch, queue})

  t.is(dispatch.callCount, 1)
})
