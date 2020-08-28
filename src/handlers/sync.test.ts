import test from 'ava'
import sinon = require('sinon')
import { Exchange, InternalDispatch, Data, DataObject } from '../types'
import { completeExchange } from '../utils/exchangeMapping'

import sync from './sync'

// Setup

const responseFromArray = (responses: Exchange[] | Exchange) =>
  Array.isArray(responses) ? responses.shift() : responses

const setupDispatch = (
  responses: Record<string, Exchange[] | Exchange> = {}
): InternalDispatch => async (exchange) => {
  const response = exchange ? responseFromArray(responses[exchange.type]) : null
  return response || completeExchange({ status: 'ok', response: { data: [] } })
}

const ident = { id: 'johnf' }

// Tests

test('should dispatch GET to service', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: { target: 'users', active: true },
        to: { target: 'store' },
        retrieve: 'all',
      },
    },
    ident,
    meta: { project: 'project1', queue: true },
  })
  const dispatch = sinon
    .stub()
    .resolves({ ...exchange, response: { ...exchange.response, data: [] } })
  const expected = completeExchange({
    type: 'GET',
    request: {
      type: 'user',
      params: { active: true },
    },
    target: 'users',
    ident,
    meta: { project: 'project1' },
  })

  await sync(exchange, dispatch)

  t.deepEqual(dispatch.args[0][0], expected)
})

test('should return error when GET responds with error', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: { from: 'users', to: 'store', retrieve: 'all' },
    },
  })
  const dispatch = sinon.stub().resolves({ ...exchange, status: 'notfound' })

  const ret = await sync(exchange, dispatch)

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(typeof ret.response.error, 'string')
})

test('should queue SET to target', async (t) => {
  const johnData = { id: 'john', $type: 'user', name: 'John' }
  const jennyData = { id: 'jenny', $type: 'user', name: 'Jenny' }
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: 'users',
        to: { target: 'store', language: 'no' },
        retrieve: 'all',
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: [johnData, jennyData] },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = ({
    type: 'SET',
    request: {
      type: 'user',
      data: [johnData, jennyData],
      params: { language: 'no' },
    },
    target: 'store',
    ident,
    meta: { project: 'project1' },
  } as unknown) as Exchange

  const ret = await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.response.data))
  t.is((ret.response.data as Data[]).length, 2)
})

test.serial('should set lastSyncedAt on service', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: { from: 'users', to: 'store', retrieve: 'all' },
    },
    ident,
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: [{ id: 'john', type: 'user' }],
        },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = ({
    type: 'SET_META',
    request: { params: { meta: { lastSyncedAt } } },
    target: 'users',
    ident,
  } as unknown) as Exchange

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))

  clock.restore()
})

test('should do nothing when there is no updates', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: { from: 'users', to: 'store', retrieve: 'all' },
    },
    ident,
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: [] },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  const ret = await sync(exchange, dispatch)

  t.false(dispatch.calledWithMatch(completeExchange({ type: 'SET_META' })))
  t.is(ret.status, 'noaction')
})

test('should set 0 items for empty array when syncNoData flag is set', async (t) => {
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: [] },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  const data = ret.response.data as DataObject[]
  t.is(data.length, 2)
  t.deepEqual(data[0].data, [])
})

test('should set 0 items for undefined when syncNoData flag is set', async (t) => {
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: undefined },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  const data = ret.response.data as DataObject[]
  t.is(data.length, 2)
  t.deepEqual(data[0].data, [])
})

test('should not set lastSyncedAt when there is no updates after date filter', async (t) => {
  const updatedAt = new Date('2017-05-12T13:04:32Z')
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: { meta: { lastSyncedAt } } },
      },
      GET: {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: [{ id: 'john', $type: 'user', updatedAt }],
        },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  await sync(exchange, dispatch)

  t.false(dispatch.calledWithMatch(completeExchange({ type: 'SET_META' })))
})

test('should pass updatedAfter as param when retrieving updated', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: { meta: { lastSyncedAt } } },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = ({
    type: 'GET',
    request: {
      type: 'user',
      params: { updatedAfter: lastSyncedAt },
    },
    target: 'users',
  } as unknown) as Exchange

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should not pass updatedAfter when not set as metadata', async (t) => {
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: { meta: { lastSyncedAt: null } },
        },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  await sync(exchange, dispatch)

  t.false(
    dispatch.calledWithMatch(({
      request: { params: { updatedAfter: sinon.match.date } },
    } as unknown) as Exchange)
  )
})

test('should not pass updatedAfter when metadata not found', async (t) => {
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'notfound',
        response: { error: 'Not found' },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  await sync(exchange, dispatch)

  t.false(
    dispatch.calledWithMatch(({
      request: { params: { updatedAfter: sinon.match.date } },
    } as unknown) as Exchange)
  )
})

test('should pass on updatedAfter and updatedUntil when set on payload', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: { meta: { lastSyncedAt } } },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = ({
    type: 'GET',
    request: {
      type: 'user',
      params: {
        updatedAfter,
        updatedUntil,
      },
    },
    target: 'users',
  } as unknown) as Exchange
  const notExpected = ({
    type: 'GET_META',
  } as unknown) as Exchange

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
  t.false(dispatch.calledWithMatch(notExpected))
})

test('should pass on updatedAfter and updatedUntil as dates when set as iso strings', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const updatedAfter = '2017-05-13T23:59:59.999Z'
  const updatedUntil = '2017-05-14T23:59:59.999Z'
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: { meta: { lastSyncedAt } } },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = ({
    type: 'GET',
    request: {
      type: 'user',
      params: {
        updatedAfter: new Date(updatedAfter),
        updatedUntil: new Date(updatedUntil),
      },
    },
    target: 'users',
  } as unknown) as Exchange
  const notExpected = ({
    type: 'GET_META',
  } as unknown) as Exchange

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
  t.false(dispatch.calledWithMatch(notExpected))
})

test('should filter out items before updatedAfter', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: { meta: { lastSyncedAt } } },
      },
      GET: {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: [
            { id: 'ent1', updatedAt: date1 },
            { id: 'ent2', updatedAt: date2 },
          ],
        },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = ({
    type: 'SET',
    request: {
      data: sinon.match(
        (value) => value.length === 1 && value[0].id === 'ent2'
      ),
    },
  } as unknown) as Exchange

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should filter out items before updatedAfter and after updatedUntil', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
  const date1 = new Date('2017-05-13T23:59:59.999Z')
  const date2 = new Date('2017-05-14T18:43:01Z')
  const date3 = new Date('2017-05-15T01:35:40Z')
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: [
            { id: 'ent1', updatedAt: date1 },
            { id: 'ent2', updatedAt: date2 },
            { id: 'ent3', updatedAt: date3 },
          ],
        },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  await sync(exchange, dispatch)

  t.truthy(dispatch.args[2][0])
  const dispatched = dispatch.args[2][0]
  t.is(dispatched.type, 'SET')
  t.is((dispatched.request.data as DataObject[]).length, 1)
  t.is((dispatched.request.data as DataObject[])[0].id, 'ent2')
})

test('should set updatedAfter and after updatedUntil on SET action', async (t) => {
  const updatedAfter = new Date('2017-05-13T23:59:59.999Z')
  const updatedUntil = new Date('2017-05-14T23:59:59.999Z')
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: [{ id: 'ent1', updatedAt: new Date('2017-05-14T18:43:01Z') }],
        },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  await sync(exchange, dispatch)

  const dispatched = dispatch.args[2][0]
  t.is(dispatched.type, 'SET')
  t.deepEqual(dispatched.request.params?.updatedAfter, updatedAfter)
  t.deepEqual(dispatched.request.params?.updatedUntil, updatedUntil)
})

test('should not set updatedAfter and after updatedUntil on SET action', async (t) => {
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: [{ id: 'ent1', updatedAt: new Date('2017-05-14T18:43:01Z') }],
        },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )

  await sync(exchange, dispatch)

  const dispatched = dispatch.args[2][0]
  t.is(dispatched.type, 'SET')
  t.is(dispatched.request.params?.updatedAfter, undefined)
  t.is(dispatched.request.params?.updatedUntil, undefined)
})

test('should pass ident to GET_META', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
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
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: { meta: { lastSyncedAt } } },
      },
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = completeExchange({
    type: 'GET_META',
    request: {
      params: { keys: 'lastSyncedAt' },
    },
    target: 'users',
    ident,
  })

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should combine and set items from several from-actions', async (t) => {
  const lastSyncedAt = new Date('2017-05-13T18:43:00Z')
  const date1 = new Date('2017-05-12T13:04:32Z')
  const date2 = new Date('2017-05-13T18:45:03Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { target: 'users', department: 'west' },
          { target: 'users', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: {
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data: { meta: { lastSyncedAt } } },
      },
      GET: [
        {
          ...exchange,
          status: 'ok',
          response: {
            ...exchange.response,
            data: [
              { id: 'ent1', updatedAt: date1 },
              { id: 'ent2', updatedAt: date2 },
            ],
          },
        },
        {
          ...exchange,
          status: 'ok',
          response: {
            ...exchange.response,
            data: [
              { id: 'ent3', updatedAt: date1 },
              { id: 'ent4', updatedAt: date2 },
            ],
          },
        },
      ],
      SET: { ...exchange, status: 'queued' },
    })
  )
  const expected = ({
    type: 'SET',
    request: {
      data: sinon.match(
        (value) =>
          value.length === 2 && value[0].id === 'ent2' && value[1].id === 'ent4'
      ),
    },
  } as unknown) as Exchange

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test.serial('should set meta on several services', async (t) => {
  const lastSyncedAt = new Date()
  const clock = sinon.useFakeTimers(lastSyncedAt)
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { target: 'users', department: 'west' },
          { target: 'accounts', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
    ident,
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        {
          ...exchange,
          status: 'ok',
          response: {
            ...exchange.response,
            data: [{ id: 'ent1' }, { id: 'ent2' }],
          },
        },
        {
          ...exchange,
          status: 'ok',
          response: {
            ...exchange.response,
            data: [{ id: 'ent3' }, { id: 'ent4' }],
          },
        },
      ],
    })
  )
  const expected1 = ({
    type: 'SET_META',
    request: { params: { meta: { lastSyncedAt } } },
    target: 'users',
    ident,
  } as unknown) as Exchange
  const expected2 = ({
    type: 'SET_META',
    request: { params: { meta: { lastSyncedAt } } },
    target: 'accounts',
    ident,
  } as unknown) as Exchange

  await sync(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected1))
  t.true(dispatch.calledWithMatch(expected2))

  clock.restore()
})

test('should return error when one of several gets returns with error', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { target: 'users', department: 'west' },
          { target: 'users', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        {
          ...exchange,
          status: 'ok',
          response: {
            ...exchange.response,
            data: [{ id: 'ent1' }, { id: 'ent2' }],
          },
        },
        {
          ...exchange,
          status: 'error',
          response: { error: 'Could not do it' },
        },
      ],
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'error')
  t.is(typeof ret.response.error, 'string')
})

test('should return error when all gets return with error', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'user',
      params: {
        from: [
          { target: 'users', department: 'west' },
          { target: 'users', department: 'east' },
        ],
        to: 'store',
        retrieve: 'updated',
      },
    },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        {
          ...exchange,
          status: 'error',
          response: { error: 'Terrible mistake' },
        },
        {
          ...exchange,
          status: 'error',
          response: { error: 'Could not do it' },
        },
      ],
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'error')
  t.is(typeof ret.response.error, 'string')
})
