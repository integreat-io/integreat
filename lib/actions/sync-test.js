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

const getService = (type, serviceId) => ({ meta: 'meta' })

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
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all' }
  const expected = { type: 'SET_META', payload: { service: 'users', meta: { lastSyncedAt } }, meta: { ident } }

  await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.true(dispatch.calledWithMatch(expected))

  clock.restore()
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
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all', syncNoData: true }

  const ret = await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 2)
  t.deepEqual(ret.data[0].data, [])
})

test('should set 0 items for undefined when syncNoData flag is set', async (t) => {
  const dispatch = sinon.spy(setupDispatch({
    GET: { status: 'ok', data: undefined },
    SET: { status: 'queued' }
  }))
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'all', syncNoData: true }

  const ret = await sync({ type: 'SYNC', payload, meta: { ident } }, { dispatch, getService })

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 2)
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
  const payload = { from: 'users', to: 'store', type: 'user', retrieve: 'updated' }
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      updatedAfter: lastSyncedAt
    }
  }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

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

test('should set updatedAfter and after updatedUntil on SET action', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
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
    retrieve: 'updated',
    updatedAfter,
    updatedUntil
  }

  await sync({ type: 'SYNC', payload }, { dispatch, getService })

  t.is(dispatch.args[2][0].type, 'SET')
  t.deepEqual(dispatch.args[2][0].payload.updatedAfter, updatedAfter)
  t.deepEqual(dispatch.args[2][0].payload.updatedUntil, updatedUntil)
})

test('should not set updatedAfter and after updatedUntil on SET action', async (t) => {
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
