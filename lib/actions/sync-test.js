import test from 'ava'
import sinon from 'sinon'

import sync from './sync'

// Helpers

const responseFromArray = (responses) => (Array.isArray(responses))
  ? responses.shift()
  : responses

const setupDispatch = (responses = {}) => async (action) => {
  const response = responseFromArray(responses[action.type])
  return response || { status: 'ok', data: [] }
}

const ident = { id: 'johnf' }

const getService = (_type, _serviceId) => ({ meta: 'meta' })

// Tests

test('should dispatch GET to service', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'SYNC',
    payload: {
      from: { service: 'users', active: true },
      to: { service: 'store' },
      type: 'user',
      retrieve: 'all'
    },
    meta: { ident, project: 'project1', queue: true }
  }
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      active: true
    },
    meta: { ident, project: 'project1' }
  }

  await sync(action, { dispatch, getService })

  t.deepEqual(dispatch.args[0][0], expected)
})

test('should return error when GET responds with error', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'notfound' })
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all' }

  const ret = await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(typeof ret.error, 'string')
})

test('should queue SET to target', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: { service: 'store', language: 'no' },
      type: 'user',
      retrieve: 'all'
    },
    meta: { ident, project: 'project1' }
  }
  const expected = {
    type: 'SET',
    payload: {
      service: 'store',
      type: 'user',
      data: [johnData, jennyData],
      language: 'no'
    },
    meta: { ident, project: 'project1', queue: true }
  }

  const ret = await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].status, 'queued')
})

test('should not return meta response', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: { from: 'users', to: 'store', type: 'user', retrieve: 'all', metaKey: 'products' },
    meta: { ident }
  }

  const ret = await sync(action, { dispatch, getService })

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
})

test('should queue one SET per data item when useIndividualSet is true', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: { service: 'store', language: 'no' },
      type: 'user',
      retrieve: 'all',
      useIndividualSet: true
    },
    meta: { ident, project: 'project1' }
  }
  const expected1 = {
    type: 'SET',
    payload: {
      service: 'store',
      type: 'user',
      data: johnData,
      language: 'no'
    },
    meta: { ident, project: 'project1', queue: true }
  }
  const expected2 = {
    type: 'SET',
    payload: {
      service: 'store',
      type: 'user',
      data: jennyData,
      language: 'no'
    },
    meta: { ident, project: 'project1', queue: true }
  }

  const ret = await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected1))
  t.true(dispatch.calledWithMatch(expected2))
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
})

test('should not queue SET when queueSet = false', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: { status: 'ok' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: { service: 'store', language: 'no' },
      type: 'user',
      retrieve: 'all',
      queueSet: false
    },
    meta: { ident, project: 'project1' }
  }
  const expected = {
    type: 'SET',
    payload: {
      service: 'store',
      type: 'user',
      data: [johnData, jennyData],
      language: 'no'
    },
    meta: { ident, project: 'project1', queue: false }
  }

  const ret = await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'ok')
})

test.serial('should set lastSyncedAt on service', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [{ id: 'john', type: 'user' }] },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: { from: 'users', to: 'store', type: 'user', retrieve: 'all' },
    meta: { ident }
  }
  const expected = { type: 'SET_META', payload: { service: 'users', meta: { lastSyncedAt } }, meta: { ident } }

  await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))

  clock.restore()
})

test.serial('should set lastSyncedAt on service with metaKey', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [{ id: 'john', type: 'user' }] },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: { from: 'users', to: 'store', type: 'user', retrieve: 'all', metaKey: 'products' },
    meta: { ident }
  }
  const expected = { type: 'SET_META', payload: { service: 'users', metaKey: 'products', meta: { lastSyncedAt } }, meta: { ident } }

  await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))

  clock.restore()
})

test('should set lastSyncedAt to updatedUntil on service', async (t) => {
  const updatedAfter = new Date('2020-09-01T00:00:00Z')
  const updatedUntil = new Date('2020-09-01T23:59:59Z')
  const dispatch = sinon.spy(setupDispatch({
    GET: {
      status: 'ok',
      data: [{ id: 'john', type: 'user', attributes: { updatedAt: new Date('2020-09-01T18:43:11Z') } }]
    },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      type: 'user',
      retrieve: 'updated',
      updatedAfter,
      updatedUntil
    },
    meta: { ident }
  }

  await sync(action, { dispatch, getService })

  t.is(dispatch.callCount, 3)
  const setMetaAction = dispatch.args[1][0]
  t.is(setMetaAction.type, 'SET_META')
  t.deepEqual(setMetaAction.payload.meta.lastSyncedAt, updatedUntil)
})

test('should set lastSyncedAt to the latest updated date from data', async (t) => {
  const updatedAfter = new Date('2020-09-01T00:00:00Z')
  const updatedUntil = new Date('2020-09-01T23:59:59Z')
  const updatedAt = new Date('2020-09-01T18:43:11Z')
  const dispatch = sinon.spy(setupDispatch({
    GET: {
      status: 'ok',
      data: [
        { id: 'lucyk', type: 'user', attributes: { updatedAt } },
        { id: 'john', type: 'user', attributes: { updatedAt: new Date('2020-09-01T11:13:09Z') } }
      ]
    },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      type: 'user',
      retrieve: 'updated',
      updatedAfter,
      updatedUntil,
      setLastSyncedAtFromData: true
    },
    meta: { ident }
  }

  await sync(action, { dispatch, getService })

  t.is(dispatch.callCount, 3)
  const setMetaAction = dispatch.args[1][0]
  t.is(setMetaAction.type, 'SET_META')
  t.deepEqual(setMetaAction.payload.meta.lastSyncedAt, updatedAt)
})

test('should not set lastSyncedAt when service has no meta', async (t) => {
  const getService = (type, serviceId) => ({ meta: undefined })
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [{ id: 'john', type: 'user' }] },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all' }

  await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.false(dispatch.calledWithMatch({ type: 'SET_META' }))
})

test('should dispatch done action', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      done: { isDone: true },
      type: 'user',
      retrieve: 'all'
    },
    meta: { ident, project: 'project1' }
  }
  const expected = {
    type: 'SET',
    payload: {
      service: 'users',
      type: 'user',
      data: [johnData, jennyData],
      isDone: true
    },
    meta: { ident, project: 'project1' }
  }

  const ret = await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
})

test('should dispatch done action with custom action type', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      done: { isDone: true, action: 'SET_DONE' },
      type: 'user',
      retrieve: 'all'
    },
    meta: { ident, project: 'project1' }
  }
  const expected = {
    type: 'SET_DONE',
    payload: {
      service: 'users',
      type: 'user',
      data: [johnData, jennyData],
      isDone: true
    },
    meta: { ident, project: 'project1' }
  }

  const ret = await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
})

test('should not dispatch done action when SET fails', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: { status: 'error', error: 'Could not set' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      done: { isDone: true },
      type: 'user',
      retrieve: 'all'
    },
    meta: { ident, project: 'project1' }
  }
  const expected = {
    type: 'SET',
    payload: {
      service: 'users',
      type: 'user',
      data: [johnData, jennyData],
      isDone: true
    },
    meta: { ident, project: 'project1' }
  }

  const ret = await sync(action, { dispatch, getService })

  t.false(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'error', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
})

test('should dispatch done action when some SETs succeedes', async (t) => {
  const johnData = { id: 'john', type: 'user', attributes: { name: 'John' } }
  const jennyData = { id: 'jenny', type: 'user', attributes: { name: 'Jenny' } }
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [johnData, jennyData] },
    SET: [{ status: 'queued' }, { status: 'error', error: 'Failed' }]
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      done: { isDone: true },
      type: 'user',
      retrieve: 'all',
      useIndividualSet: true
    },
    meta: { ident, project: 'project1' }
  }
  const expected = {
    type: 'SET',
    payload: {
      service: 'users',
      type: 'user',
      data: [johnData],
      isDone: true
    },
    meta: { ident, project: 'project1' }
  }

  const ret = await sync(action, { dispatch, getService })

  t.deepEqual(dispatch.args[4][0], expected)
  t.is(ret.status, 'error', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
})

test('should do nothing when there is no updates', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [] },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all' }

  const ret = await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.false(dispatch.calledWithMatch({ type: 'SET_META' }))
  t.is(ret.status, 'noaction')
})

test('should set 0 items for empty array when syncNoData flag is set', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: [] },
    SET: { status: 'queued', data: [] }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all', syncNoData: true }

  const ret = await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 1)
  t.deepEqual(ret.data[0].data, [])
})

test('should set 0 items for undefined when syncNoData flag is set', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: undefined },
    SET: { status: 'queued', data: [] }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all', syncNoData: true }

  const ret = await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 1)
  t.deepEqual(ret.data[0].data, [])
})

test('should not set lastSyncedAt when there is no updates after date filter', async (t) => {
  const updatedAt = new Date('2017-05-12T13:04:32Z')
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    GET: { status: 'ok', data: [{ id: 'john', type: 'user', attributes: { updatedAt } }] },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'updated' }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.false(dispatch.calledWithMatch({ type: 'SET_META' }))
})

test('should pass updatedAfter as param when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: { from: 'users', to: 'store', type: 'user', retrieve: 'updated' },
    meta: {}
  }

  await sync(action, { dispatch, getService })

  const getAction = dispatch.args[1][0]
  t.is(getAction.type, 'GET')
  t.deepEqual(getAction.payload.updatedAfter, lastSyncedAt)
})

test('should set updatedUntil to now when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: { from: 'users', to: 'store', type: 'user', retrieve: 'updated' },
    meta: {}
  }
  const now = new Date()

  await sync(action, { dispatch, getService })

  const getAction = dispatch.args[1][0]
  t.is(getAction.type, 'GET')
  t.true(getAction.payload.updatedUntil instanceof Date)
  t.true(getAction.payload.updatedUntil >= now)
  t.true(getAction.payload.updatedUntil < new Date(now.getTime() + 100))
})

test('should not set updatedUntil with value open to now when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      type: 'user',
      retrieve: 'updated',
      updatedUntil: 'open'
    },
    meta: {}
  }

  await sync(action, { dispatch, getService })

  const getAction = dispatch.args[1][0]
  t.is(getAction.type, 'GET')
  t.is(getAction.payload.updatedUntil, undefined)
})

test('should pass updatedAfter as param when retrieving updated with metaKey', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: { from: 'users', to: 'store', type: 'user', retrieve: 'updated', metaKey: 'products' },
    meta: {}
  }
  const expected = {
    type: 'GET_META',
    payload: {
      service: 'users',
      metaKey: 'products',
      keys: 'lastSyncedAt'
    }
  }

  await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
})

test('should not pass updatedAfter when not set as metadata', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt: null } } },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'updated' }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.false(dispatch.calledWithMatch({ payload: { updatedAfter: sinon.match.date } }))
})

test('should not pass updatedAfter when metadata not found', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'notfound', error: 'Not found' },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'updated' }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.false(dispatch.calledWithMatch({ payload: { updatedAfter: sinon.match.date } }))
})

test('should pass on updatedAfter and updatedUntil when set on payload', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    SET: { status: 'queued' }
  }))
  const payload = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'updated',
    updatedAfter,
    updatedUntil
  }
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      updatedAfter,
      updatedUntil
    }
  }
  const notExpected = {
    type: 'GET_META'
  }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
  t.false(dispatch.calledWithMatch(notExpected))
})

test('should pass on updatedAfter and updatedUntil as dates when set as iso strings', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const updatedAfter = '2017-05-13T23:59:59.999Z'
  const updatedUntil = '2017-05-14T23:59:59.999Z'
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    SET: { status: 'queued' }
  }))
  const payload = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'updated',
    updatedAfter,
    updatedUntil
  }
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      updatedAfter: new Date(updatedAfter),
      updatedUntil: new Date(updatedUntil)
    }
  }
  const notExpected = {
    type: 'GET_META'
  }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
  t.false(dispatch.calledWithMatch(notExpected))
})

test('should filter out items before updatedAfter', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    GET: {
      status: 'ok',
      data: [
        { id: 'ent1', attributes: { updatedAt: date1 } },
        { id: 'ent2', attributes: { updatedAt: date2 } }
      ]
    },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'updated' }
  const expected = {
    type: 'SET',
    payload: {
      data: sinon.match((value) => value.length === 1 && value[0].id === 'ent2')
    }
  }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
})

test('should filter out items before updatedAfter and after updatedUntil', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
  const date1 = new Date('2017-05-13T23:59:59.999Z')
  const date2 = new Date('2017-05-14T18:43:01Z')
  const date3 = new Date('2017-05-15T01:35:40Z')
  const dispatch = sinon.spy(setupDispatch({
    GET: {
      status: 'ok',
      data: [
        { id: 'ent1', attributes: { updatedAt: date1 } },
        { id: 'ent2', attributes: { updatedAt: date2 } },
        { id: 'ent3', attributes: { updatedAt: date3 } }
      ]
    },
    SET: { status: 'queued' }
  }))
  const payload = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'updated',
    updatedAfter,
    updatedUntil
  }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.is(dispatch.args[2][0].type, 'SET')
  t.is(dispatch.args[2][0].payload.data.length, 1)
  t.is(dispatch.args[2][0].payload.data[0].id, 'ent2')
})

test('should set updatedAfter and updatedUntil on SET action', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
  const dispatch = sinon.spy(setupDispatch({
    GET: {
      status: 'ok',
      data: [{ id: 'ent1', attributes: { updatedAt: new Date('2017-05-14T18:43:01Z') } }]
    },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      type: 'user',
      retrieve: 'updated',
      updatedAfter,
      updatedUntil
    }
  }

  await sync(action, { dispatch, getService })

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[2][0].type, 'SET')
  t.deepEqual(dispatch.args[2][0].payload.updatedAfter, updatedAfter)
  t.deepEqual(dispatch.args[2][0].payload.updatedUntil, updatedUntil)
})

test('should set updatedUntil to now on SET action', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const dispatch = sinon.spy(setupDispatch({
    GET: {
      status: 'ok',
      data: [{ id: 'ent1', attributes: { updatedAt: new Date('2017-05-14T18:43:01Z') } }]
    },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      type: 'user',
      retrieve: 'updated',
      updatedAfter
    }
  }
  const now = new Date()

  await sync(action, { dispatch, getService })

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[2][0].type, 'SET')
  t.deepEqual(dispatch.args[2][0].payload.updatedAfter, updatedAfter)
  t.true(dispatch.args[2][0].payload.updatedUntil instanceof Date)
  t.true(dispatch.args[2][0].payload.updatedUntil >= now)
  t.true(dispatch.args[2][0].payload.updatedUntil < new Date(now.getTime() + 100))
})

test('should not filter away items based on updatedUntil when updatedUntil is open', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedAt = new Date(Date.now() + 5000)
  const dispatch = sinon.spy(setupDispatch({
    GET: {
      status: 'ok',
      data: [{ id: 'ent1', attributes: { updatedAt } }]
    },
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: 'users',
      to: 'store',
      type: 'user',
      retrieve: 'updated',
      updatedAfter,
      updatedUntil: 'open'
    }
  }

  const ret = await sync(action, { dispatch, getService })

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 1)
  t.is(dispatch.args[2][0].payload.updatedUntil, undefined)
})

test('should not set updatedAfter and updatedUntil on SET action', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET: {
      status: 'ok',
      data: [{ id: 'ent1', attributes: { updatedAt: new Date('2017-05-14T18:43:01Z') } }]
    },
    SET: { status: 'queued' }
  }))
  const payload = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all'
  }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.is(dispatch.args[2][0].type, 'SET')
  t.is(typeof dispatch.args[2][0].payload.updatedAfter, 'undefined')
  t.is(typeof dispatch.args[2][0].payload.updatedUntil, 'undefined')
})

test('should pass ident to GET_META', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'updated' }
  const expected = {
    type: 'GET_META',
    payload: {
      service: 'users',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }

  await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
})

test('should combine and set items from several from-actions', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
  const dispatch = sinon.spy(setupDispatch({
    GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
    GET: [
      {
        status: 'ok',
        data: [
          { id: 'ent1', attributes: { updatedAt: date1 } },
          { id: 'ent2', attributes: { updatedAt: date2 } }
        ]
      },
      {
        status: 'ok',
        data: [
          { id: 'ent3', attributes: { updatedAt: date1 } },
          { id: 'ent4', attributes: { updatedAt: date2 } }
        ]
      }
    ],
    SET: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: [
        { service: 'users', department: 'west' },
        { service: 'users', department: 'east' }
      ],
      to: 'store',
      type: 'user',
      retrieve: 'updated'
    }
  }
  const expected = {
    type: 'SET',
    payload: {
      data: sinon.match((value) => value.length === 2 && value[0].id === 'ent2' && value[1].id === 'ent4')
    }
  }

  await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
})

test('should override action on from and to', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET_SPECIAL: {
      status: 'ok',
      data: [{ id: 'ent2', type: 'entry', attributes: {}, relationships: {} }]
    },
    SET_SPECIAL: { status: 'queued' }
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: { service: 'users', department: 'west', action: 'GET_SPECIAL' },
      to: { service: 'store', action: 'SET_SPECIAL' },
      type: 'user',
      retrieve: 'updated'
    }
  }
  const expected = {
    type: 'SET_SPECIAL',
    payload: {
      data: sinon.match((value) => value.length === 1 && value[0].id === 'ent2')
    }
  }

  await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))
})

test.serial('should set meta on several services', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const attributes = {}
  const dispatch = sinon.spy(setupDispatch({
    GET: [
      {
        status: 'ok',
        data: [{ id: 'ent1', attributes }, { id: 'ent2', attributes }]
      },
      {
        status: 'ok',
        data: [{ id: 'ent3', attributes }, { id: 'ent4', attributes }]
      }
    ]
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: [
        { service: 'users', department: 'west' },
        { service: 'accounts', department: 'east' }
      ],
      to: 'store',
      type: 'user',
      retrieve: 'updated'
    },
    meta: { ident }
  }
  const expected1 = { type: 'SET_META', payload: { service: 'users', meta: { lastSyncedAt } }, meta: { ident } }
  const expected2 = { type: 'SET_META', payload: { service: 'accounts', meta: { lastSyncedAt } }, meta: { ident } }

  await sync(action, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected1))
  t.true(dispatch.calledWithMatch(expected2))

  clock.restore()
})

test('should return error when one of several gets returns with error', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET: [
      {
        status: 'ok',
        data: [{ id: 'ent1', attributes: { } }, { id: 'ent2', attributes: { } }]
      },
      { status: 'error', error: 'Could not do it' }
    ]
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: [
        { service: 'users', department: 'west' },
        { service: 'users', department: 'east' }
      ],
      to: 'store',
      type: 'user',
      retrieve: 'updated'
    }
  }

  const ret = await sync(action, { dispatch, getService })

  t.is(ret.status, 'error')
  t.is(typeof ret.error, 'string')
})

test('should return error when all gets return with error', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET: [
      { status: 'error', error: 'Terrible mistake' },
      { status: 'error', error: 'Could not do it' }
    ]
  }))
  const action = {
    type: 'SYNC',
    payload: {
      from: [
        { service: 'users', department: 'west' },
        { service: 'users', department: 'east' }
      ],
      to: 'store',
      type: 'user',
      retrieve: 'updated'
    }
  }

  const ret = await sync(action, { dispatch, getService })

  t.is(ret.status, 'error')
  t.is(typeof ret.error, 'string')
})
