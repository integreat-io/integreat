import test from 'ava'
import sinon from 'sinon'

import deleteExpired from './deleteExpired'

// Helpers

let clock = null
const theTime = Date.now()

test.before(() => {
  clock = sinon.useFakeTimers(theTime)
})

test.after.always(() => {
  clock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof deleteExpired, 'function')
})

test('should dispatch GET to expired endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}
  const expected = {
    type: 'GET',
    payload: {
      source: 'store',
      type: 'entry',
      endpoint: 'getExpired',
      useDefaults: false,
      params: {
        timestamp: theTime,
        isodate: new Date(theTime).toISOString()
      }
    }
  }

  await deleteExpired(def, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
})

test('should add msFromNow to current timestamp', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired', msFromNow: 3600000}
  const expected = {
    payload: {
      params: {
        timestamp: theTime + 3600000,
        isodate: new Date(theTime + 3600000).toISOString()
      }
    }
  }

  await deleteExpired(def, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
})

test('should queue DELETE for expired entries', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]
  const dispatch = sinon.stub().resolves({status: 'ok', data})
  dispatch.withArgs(sinon.match({type: 'DELETE'})).resolves({status: 'queued'})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}
  const expected = {type: 'DELETE', payload: {source: 'store', data}}

  const ret = await deleteExpired(def, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
  t.truthy(ret)
  t.is(ret.status, 'queued')
})

test('should queue DELETE with id and type only', async (t) => {
  const data = [{
    id: 'ent1',
    type: 'entry',
    attributes: {title: 'Entry 1'},
    relationships: {author: {id: 'johnf', type: 'user'}}
  }]
  const dispatch = sinon.stub().resolves({status: 'ok', data})
  dispatch.withArgs(sinon.match({type: 'DELETE'})).resolves({status: 'queued'})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}
  const expected = {payload: {data: [{id: 'ent1', type: 'entry'}]}}

  await deleteExpired(def, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
})

test('should not queue when no expired entries', async (t) => {
  const data = []
  const dispatch = sinon.stub().resolves({status: 'ok', data})
  dispatch.withArgs(sinon.match({type: 'DELETE'})).resolves({status: 'queued'})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}

  const ret = await deleteExpired(def, {dispatch})

  t.false(dispatch.calledWithMatch({type: 'DELETE'}))
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should not queue when GET returns error', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'notfound'})
  dispatch.withArgs(sinon.match({type: 'DELETE'})).resolves({status: 'queued'})
  const def = {source: 'store', type: 'entry', endpoint: 'getExpired'}

  const ret = await deleteExpired(def, {dispatch})

  t.false(dispatch.calledWithMatch({type: 'DELETE'}))
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should return error when no source', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const def = {endpoint: 'getExpired', type: 'entry'}

  const ret = await deleteExpired(def, {dispatch})

  t.is(ret.status, 'error')
})

test('should return error when no endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const def = {source: 'store', type: 'entry'}

  const ret = await deleteExpired(def, {dispatch})

  t.is(ret.status, 'error')
})

test('should return error when no type', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok', data: []})
  const def = {source: 'store', endpoint: 'getExpired'}

  const ret = await deleteExpired(def, {dispatch})

  t.is(ret.status, 'error')
})
