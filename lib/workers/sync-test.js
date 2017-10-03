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
      type: 'user',
      params: {}
    }
  }
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}

  await sync(def, {dispatch})

  t.true(dispatch.callCount >= 1)
  const action = dispatch.args[0][0]
  t.deepEqual(action, expected)
})

test('should return no action when GET responds with error', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'notfound'})
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}

  const ret = await sync(def, {dispatch})

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should dispatch SET_ONE to target', async (t) => {
  const johnData = {id: 'john', type: 'user', attributes: {name: 'John'}}
  const jennyData = {id: 'jenny', type: 'user', attributes: {name: 'Jenny'}}
  const dispatch = sinon.stub().resolves({status: 'ok', data: [johnData, jennyData]})
  const queue = sinon.stub().resolves({status: 'ok'})
  const expected1 = {type: 'SET_ONE', payload: {source: 'store', data: johnData}}
  const expected2 = {type: 'SET_ONE', payload: {source: 'store', data: jennyData}}
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}

  const ret = await sync(def, {dispatch, queue})

  t.is(queue.callCount, 2)
  const action1 = queue.args[0][0]
  const action2 = queue.args[1][0]
  t.deepEqual(action1, expected1)
  t.deepEqual(action2, expected2)
  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 3)
})

test('should set lastSyncedAt on source', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: [{id: 'john', type: 'user'}]})
  const queue = async () => ({status: 'ok'})
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}

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
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}

  const ret = await sync(def, {dispatch, queue})

  t.is(dispatch.callCount, 1)
  t.is(ret.status, 'noaction')
})

test('should pass updatedAfter as param when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.stub().callsFake((action) =>
    (action.type === 'GET_META') ? {status: 'ok', data: {meta: {lastSyncedAt}}} : {status: 'ok'})
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}
  const expected = {
    type: 'GET',
    payload: {
      source: 'users',
      type: 'user',
      params: {
        updatedAfter: lastSyncedAt
      }
    }
  }

  await sync(def, {dispatch})

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], expected)
})

test('should not pass updatedAfter when not set as metadata', async (t) => {
  const dispatch = sinon.stub().callsFake((action) =>
    (action.type === 'GET_META') ? {status: 'ok', data: {meta: {lastSyncedAt: null}}} : {status: 'ok'})
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}

  await sync(def, {dispatch})

  t.is(dispatch.callCount, 2)
  const action = dispatch.args[1][0]
  t.is(action.payload.params.updatedAfter, undefined)
})

test('should not pass updatedAfter when metadata not found', async (t) => {
  const dispatch = sinon.stub().callsFake((action) =>
    (action.type === 'GET_META') ? {status: 'notfound', error: 'Not found'} : {status: 'ok'})
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}

  await sync(def, {dispatch})

  t.is(dispatch.callCount, 2)
  const action = dispatch.args[1][0]
  t.is(action.payload.params.updatedAfter, undefined)
})

test('should filter out old items when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
  const dispatch = (action) => (action.type === 'GET_META')
    ? {status: 'ok', data: {meta: {lastSyncedAt}}}
    : {status: 'ok', data: [{id: 'ent1', updatedAt: date1}, {id: 'ent2', updatedAt: date2}]}
  const queue = sinon.stub().resolves({status: 'ok'})
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}

  await sync(def, {dispatch, queue})

  t.is(queue.callCount, 1)
  t.is(queue.args[0][0].payload.data.id, 'ent2')
})

test('should not set lastSyncedAt when there is no updates after date filter', async (t) => {
  const updatedAt = new Date('2017-05-12T13:04:32Z')
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.stub().callsFake((action) => (action.type === 'GET_META')
    ? {status: 'ok', data: {meta: {lastSyncedAt}}}
    : {status: 'ok', data: [{id: 'john', type: 'user', updatedAt}]})
  const queue = async () => ({status: 'ok'})
  const def = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}

  await sync(def, {dispatch, queue})

  t.is(dispatch.callCount, 2)
})
