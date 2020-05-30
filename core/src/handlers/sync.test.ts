import test from 'ava'
import sinon = require('sinon')
import { Response, Action, Dispatch, Data, DataObject } from '../types'
import { completeExchange } from '../utils/exchangeMapping'

import sync from './sync'

// Setup

const responseFromArray = (responses: Response[] | Response) =>
  Array.isArray(responses) ? responses.shift() : responses

const setupDispatch = (responses = {}): Dispatch => async (
  action: Action | null
) => {
  const response = action ? responseFromArray(responses[action.type]) : null
  return response || { status: 'ok', data: [] }
}

const ident = { id: 'johnf' }

// Tests

test('should dispatch GET to service', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: { service: 'users', active: true },
        to: { service: 'store' },
        retrieve: 'all',
      },
    },
    ident,
    meta: { project: 'project1', queue: true },
  })
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      active: true,
    },
    meta: { ident, project: 'project1' },
  }

  await sync(exchange, dispatch)

  t.deepEqual(dispatch.args[0][0], expected)
})

test('should return error when GET responds with error', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'notfound' })
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: { from: 'users', to: 'store', retrieve: 'all' },
    },
  })

  const ret = await sync(exchange, dispatch)

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(typeof ret.response.error, 'string')
})

test('should queue SET to target', async (t) => {
  const johnData = { id: 'john', $type: 'user', name: 'John' }
  const jennyData = { id: 'jenny', $type: 'user', name: 'Jenny' }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [johnData, jennyData] },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: { service: 'store', language: 'no' },
        retrieve: 'all',
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const expected = {
    type: 'SET',
    payload: {
      service: 'store',
      type: 'user',
      data: [johnData, jennyData],
      language: 'no',
    },
    meta: { ident, project: 'project1' },
  }

  const ret = await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.response.data))
  t.is((ret.response.data as Data[]).length, 2)
})

test.serial('should set lastSyncedAt on service', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [{ id: 'john', type: 'user' }] },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: { from: 'users', to: 'store', retrieve: 'all' },
    },
    ident,
  })
  const expected = {
    type: 'SET_META',
    payload: { service: 'users', meta: { lastSyncedAt } },
    meta: { ident },
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))

  clock.restore()
})

test('should do nothing when there is no updates', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [] },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: { from: 'users', to: 'store', retrieve: 'all' },
    },
    ident,
  })

  const ret = await sync(exchange, dispatch)

  t.false(dispatch.calledWithMatch({ type: 'SET_META' }))
  t.is(ret.status, 'noaction')
})

test('should set 0 items for empty array when syncNoData flag is set', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [] },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'all',
        syncNoData: true,
      },
    },
    ident,
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  const data = ret.response.data as DataObject[]
  t.is(data.length, 2)
  t.deepEqual(data[0].data, [])
})

test('should set 0 items for undefined when syncNoData flag is set', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: undefined },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'all',
        syncNoData: true,
      },
    },
    ident,
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  const data = ret.response.data as DataObject[]
  t.is(data.length, 2)
  t.deepEqual(data[0].data, [])
})

test('should not set lastSyncedAt when there is no updates after date filter', async (t) => {
  const updatedAt = new Date('2017-05-12T13:04:32Z')
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      GET: { status: 'ok', data: [{ id: 'john', $type: 'user', updatedAt }] },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
      },
    },
  })

  await sync(exchange, dispatch)

  t.false(dispatch.calledWithMatch({ type: 'SET_META' }))
})

test('should pass updatedAfter as param when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
      },
    },
  })
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      updatedAfter: lastSyncedAt,
    },
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should not pass updatedAfter when not set as metadata', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt: null } } },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
      },
    },
  })

  await sync(exchange, dispatch)

  t.false(
    dispatch.calledWithMatch({ payload: { updatedAfter: sinon.match.date } })
  )
})

test('should not pass updatedAfter when metadata not found', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'notfound', error: 'Not found' },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
      },
    },
  })

  await sync(exchange, dispatch)

  t.false(
    dispatch.calledWithMatch({ payload: { updatedAfter: sinon.match.date } })
  )
})

test('should pass on updatedAfter and updatedUntil when set on payload', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
        updatedAfter,
        updatedUntil,
      },
    },
  })
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      updatedAfter,
      updatedUntil,
    },
  }
  const notExpected = {
    type: 'GET_META',
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
  t.false(dispatch.calledWithMatch(notExpected))
})

test('should pass on updatedAfter and updatedUntil as dates when set as iso strings', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const updatedAfter = '2017-05-13T23:59:59.999Z'
  const updatedUntil = '2017-05-14T23:59:59.999Z'
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
        updatedAfter,
        updatedUntil,
      },
    },
  })
  const expected = {
    type: 'GET',
    payload: {
      service: 'users',
      type: 'user',
      updatedAfter: new Date(updatedAfter),
      updatedUntil: new Date(updatedUntil),
    },
  }
  const notExpected = {
    type: 'GET_META',
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
  t.false(dispatch.calledWithMatch(notExpected))
})

test('should filter out items before updatedAfter', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      GET: {
        status: 'ok',
        data: [
          { id: 'ent1', updatedAt: date1 },
          { id: 'ent2', updatedAt: date2 },
        ],
      },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
      },
    },
  })
  const expected = {
    type: 'SET',
    payload: {
      data: sinon.match(
        (value) => value.length === 1 && value[0].id === 'ent2'
      ),
    },
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should filter out items before updatedAfter and after updatedUntil', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
  const date1 = new Date('2017-05-13T23:59:59.999Z')
  const date2 = new Date('2017-05-14T18:43:01Z')
  const date3 = new Date('2017-05-15T01:35:40Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        status: 'ok',
        data: [
          { id: 'ent1', updatedAt: date1 },
          { id: 'ent2', updatedAt: date2 },
          { id: 'ent3', updatedAt: date3 },
        ],
      },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
        updatedAfter,
        updatedUntil,
      },
    },
  })

  await sync(exchange, dispatch)

  t.truthy(dispatch.args[2][0])
  const action = dispatch.args[2][0] as Action
  t.is(action.type, 'SET')
  t.is((action.payload.data as DataObject[]).length, 1)
  t.is((action.payload.data as DataObject[])[0].id, 'ent2')
})

test('should set updatedAfter and after updatedUntil on SET action', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        status: 'ok',
        data: [{ id: 'ent1', updatedAt: new Date('2017-05-14T18:43:01Z') }],
      },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
        updatedAfter,
        updatedUntil,
      },
    },
  })

  await sync(exchange, dispatch)

  const action = dispatch.args[2][0] as Action
  t.is(action.type, 'SET')
  t.deepEqual(action.payload.updatedAfter, updatedAfter)
  t.deepEqual(action.payload.updatedUntil, updatedUntil)
})

test('should not set updatedAfter and after updatedUntil on SET action', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        status: 'ok',
        data: [{ id: 'ent1', updatedAt: new Date('2017-05-14T18:43:01Z') }],
      },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'all',
      },
    },
  })

  await sync(exchange, dispatch)

  const action = dispatch.args[2][0] as Action
  t.is(action.type, 'SET')
  t.is(typeof action.payload.updatedAfter, 'undefined')
  t.is(typeof action.payload.updatedUntil, 'undefined')
})

test('should pass ident to GET_META', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: 'store',
        retrieve: 'updated',
      },
    },
    ident,
  })
  const expected = {
    type: 'GET_META',
    payload: {
      service: 'users',
      keys: 'lastSyncedAt',
    },
    meta: { ident },
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should combine and set items from several from-actions', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      GET: [
        {
          status: 'ok',
          data: [
            { id: 'ent1', updatedAt: date1 },
            { id: 'ent2', updatedAt: date2 },
          ],
        },
        {
          status: 'ok',
          data: [
            { id: 'ent3', updatedAt: date1 },
            { id: 'ent4', updatedAt: date2 },
          ],
        },
      ],
      SET: { status: 'queued' },
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { service: 'users', department: 'west' },
          { service: 'users', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
  })
  const expected = {
    type: 'SET',
    payload: {
      data: sinon.match(
        (value) =>
          value.length === 2 && value[0].id === 'ent2' && value[1].id === 'ent4'
      ),
    },
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test.serial('should set meta on several services', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        {
          status: 'ok',
          data: [{ id: 'ent1' }, { id: 'ent2' }],
        },
        {
          status: 'ok',
          data: [{ id: 'ent3' }, { id: 'ent4' }],
        },
      ],
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { service: 'users', department: 'west' },
          { service: 'accounts', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
    ident,
  })
  const expected1 = {
    type: 'SET_META',
    payload: { service: 'users', meta: { lastSyncedAt } },
    meta: { ident },
  }
  const expected2 = {
    type: 'SET_META',
    payload: { service: 'accounts', meta: { lastSyncedAt } },
    meta: { ident },
  }

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected1))
  t.true(dispatch.calledWithMatch(expected2))

  clock.restore()
})

test('should return error when one of several gets returns with error', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        {
          status: 'ok',
          data: [{ id: 'ent1' }, { id: 'ent2' }],
        },
        { status: 'error', error: 'Could not do it' },
      ],
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { service: 'users', department: 'west' },
          { service: 'users', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'error')
  t.is(typeof ret.response.error, 'string')
})

test('should return error when all gets return with error', async (t) => {
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        { status: 'error', error: 'Terrible mistake' },
        { status: 'error', error: 'Could not do it' },
      ],
    })
  )
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { service: 'users', department: 'west' },
          { service: 'users', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'error')
  t.is(typeof ret.response.error, 'string')
})
