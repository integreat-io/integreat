import test from 'ava'
import sinon from 'sinon'

import sync from './sync'

// Helpers

const setupDispatch = (responses = {}) => async (action) => {
  const response = responses[action.type]
  return response || {status: 'ok'}
}

const ident = {id: 'johnf'}

// Tests

test('should exist', (t) => {
  t.is(typeof sync, 'function')
})

test('should dispatch GET to service', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok'})
  const payload = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all',
    fromParams: {active: true}
  }
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      params: {active: true}
    },
    meta: {ident}
  }

  await sync({payload, ident}, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
})

test('should return no action when GET responds with error', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'notfound'})
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}

  const ret = await sync({payload}, {dispatch})

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should queue SET to target', async (t) => {
  const johnData = {id: 'john', type: 'user', attributes: {name: 'John'}}
  const jennyData = {id: 'jenny', type: 'user', attributes: {name: 'Jenny'}}
  const dispatch = sinon.spy(setupDispatch({
    'GET': {status: 'ok', data: [johnData, jennyData]},
    'SET': {status: 'queued'}
  }))
  const payload = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all',
    toParams: {language: 'no'}
  }
  const expected = {
    type: 'SET',
    payload: {
      service: 'store',
      data: [johnData, jennyData],
      params: {language: 'no'}
    },
    meta: {ident}
  }

  const ret = await sync({payload, ident}, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
})

test('should set lastSyncedAt on service', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const dispatch = sinon.spy(setupDispatch({
    'GET': {status: 'ok', data: [{id: 'john', type: 'user'}]},
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}
  const expected = {type: 'SET_META', payload: {service: 'users', meta: {lastSyncedAt}}, meta: {ident}}

  await sync({payload, ident}, {dispatch})

  t.true(dispatch.calledWithMatch(expected))

  clock.restore()
})

test('should not set lastSyncedAt when there is no updates', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    'GET': {status: 'ok', data: []},
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'all'}

  const ret = await sync({payload}, {dispatch})

  t.false(dispatch.calledWithMatch({type: 'SET_META'}))
  t.is(ret.status, 'noaction')
})

test('should pass updatedAfter as param when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    'GET_META': {status: 'ok', data: {meta: {lastSyncedAt}}},
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      params: {
        updatedAfter: lastSyncedAt
      }
    }
  }

  await sync({payload}, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
})

test('should pass ident to GET_META', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    'GET_META': {status: 'ok', data: {meta: {lastSyncedAt}}},
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}
  const expected = {
    type: 'GET_META',
    payload: {
      service: 'users',
      keys: 'lastSyncedAt'
    },
    meta: {ident}
  }

  await sync({payload, ident}, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
})

test('should not pass updatedAfter when not set as metadata', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    'GET_META': {status: 'ok', data: {meta: {lastSyncedAt: null}}},
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}

  await sync({payload}, {dispatch})

  t.false(dispatch.calledWithMatch({payload: {params: {updatedAfter: sinon.match.date}}}))
})

test('should not pass updatedAfter when metadata not found', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    'GET_META': {status: 'notfound', error: 'Not found'},
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}

  await sync({payload}, {dispatch})

  t.false(dispatch.calledWithMatch({payload: {params: {updatedAfter: sinon.match.date}}}))
})

test('should filter out old items when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
  const dispatch = sinon.spy(setupDispatch({
    'GET_META': {status: 'ok', data: {meta: {lastSyncedAt}}},
    'GET': {
      status: 'ok',
      data: [
        {id: 'ent1', attributes: {updatedAt: date1}},
        {id: 'ent2', attributes: {updatedAt: date2}}
      ]
    },
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}
  const expected = {
    type: 'SET',
    payload: {
      data: sinon.match((value) => value.length === 1 && value[0].id === 'ent2')
    }
  }

  await sync({payload}, {dispatch})

  t.true(dispatch.calledWithMatch(expected))
})

test('should not set lastSyncedAt when there is no updates after date filter', async (t) => {
  const updatedAt = new Date('2017-05-12T13:04:32Z')
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    'GET_META': {status: 'ok', data: {meta: {lastSyncedAt}}},
    'GET': {status: 'ok', data: [{id: 'john', type: 'user', attributes: {updatedAt}}]},
    'SET': {status: 'queued'}
  }))
  const payload = {from: 'users', to: 'store', type: 'user', retrieve: 'updated'}

  await sync({payload}, {dispatch})

  t.false(dispatch.calledWithMatch({type: 'SET_META'}))
})
