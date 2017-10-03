import test from 'ava'
import sinon from 'sinon'

import deleteExpired from './deleteExpired'

// Helpers

const queue = () => ({status: 'queued'})

// Tests

test('should exist', (t) => {
  t.is(typeof deleteExpired, 'function')
})

test('should dispatch GET to expired endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}
  const before = Date.now()

  await deleteExpired(def, {dispatch, queue})

  const after = Date.now()
  t.is(dispatch.callCount, 1)
  const action = dispatch.args[0][0]
  t.is(action.type, 'GET')
  const {payload} = action
  t.is(payload.source, 'store')
  t.is(payload.type, 'entry')
  t.is(payload.endpoint, 'getExpired')
  t.truthy(payload.params)
  t.true(payload.params.timestamp >= before)
  t.true(payload.params.timestamp <= after)
  t.is(payload.params.timestamp, new Date(payload.params.isodate).getTime())
})

test('should add msFromNow to current timestamp', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired', msFromNow: 3600000}
  const before = Date.now()

  await deleteExpired(def, {dispatch, queue})

  const after = Date.now()
  const {payload} = dispatch.args[0][0]
  t.truthy(payload.params)
  t.true(payload.params.timestamp >= before + 3600000)
  t.true(payload.params.timestamp <= after + 3600000)
  t.is(payload.params.timestamp, new Date(payload.params.isodate).getTime())
})

test('should queue DELETE for expired entries', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]
  const dispatch = () => ({status: 'ok', data})
  const queue = sinon.stub().resolves({status: 'queued'})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}

  const ret = await deleteExpired(def, {dispatch, queue})

  t.is(queue.callCount, 1)
  const action = queue.args[0][0]
  t.is(action.type, 'DELETE')
  const {payload} = action
  t.is(payload.source, 'store')
  t.deepEqual(payload.data, data)
  t.truthy(ret)
  t.is(ret.status, 'queued')
})

test('should not queue when no expired entries', async (t) => {
  const data = []
  const dispatch = () => ({status: 'ok', data})
  const queue = sinon.stub().resolves({status: 'queued'})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}

  const ret = await deleteExpired(def, {dispatch, queue})

  t.is(queue.callCount, 0)
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should not queue when GET returns error', async (t) => {
  const dispatch = () => ({status: 'notfound'})
  const queue = sinon.stub().resolves({status: 'queued'})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}

  const ret = await deleteExpired(def, {dispatch, queue})

  t.is(queue.callCount, 0)
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})
