import test from 'ava'
import sinon = require('sinon')
import { Action, InternalDispatch, TypedData } from '../types'
import createError from '../utils/createError'

import sync from './sync'

// Setup

interface Handler {
  (action: Action): Action
}

interface Meta {
  lastSyncedAt?: Date
}

const updateAction =
  (status: string, response: Record<string, unknown> = {}) =>
  (action: Action): Action => ({
    ...action,
    response: {
      ...action.response,
      ...response,
      status,
    },
  })

function responseFromArray(handlers: Handler[] | Handler, action: Action) {
  const handler = Array.isArray(handlers) ? handlers.shift() : handlers
  return handler ? handler(action) : action
}

const setupDispatch =
  (handlers: Record<string, Handler[] | Handler> = {}): InternalDispatch =>
  async (action) => {
    const response = action
      ? responseFromArray(handlers[action.type], action)
      : null
    return (
      response || {
        type: 'GET',
        payload: {},
        response: { status: 'ok', data: [] },
      }
    )
  }

const data = [
  {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1',
    createdAt: new Date('2021-01-03T18:43:11Z'),
    updatedAt: new Date('2021-01-03T18:43:11Z'),
  },
  {
    id: 'ent2',
    $type: 'entry',
    title: 'Entry 2',
    createdAt: new Date('2021-01-03T18:45:07Z'),
    updatedAt: new Date('2021-01-05T09:11:13Z'),
  },
]

const data2 = [
  {
    id: 'ent3',
    $type: 'entry',
    title: 'Entry 3',
    createdAt: new Date('2021-01-04T23:49:58Z'),
    updatedAt: new Date('2021-01-03T23:50:23Z'),
  },
]

const ident = { id: 'johnf' }

// Tests

test('should get from source service and set on target service', async (t) => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', params: { from: 'entries', to: 'store' } },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET',
    payload: { type: 'entry', params: {}, targetService: 'entries' },
    meta: { ident, project: 'project1' },
  }
  const expected2 = {
    type: 'SET',
    payload: { type: 'entry', data, params: {}, targetService: 'store' },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should not SET with no data', async (t) => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', params: { from: 'entries', to: 'store' } },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data: [] }),
      SET: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'noaction', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.is(dispatch.args[0][0].type, 'GET')
})

test('should SET with no data when alwaysSet is true', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: 'entries', to: 'store', alwaysSet: true },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data: [] }),
      SET: updateAction('ok'),
    })
  )
  const expected2 = {
    type: 'SET',
    payload: { type: 'entry', data: [], params: {}, targetService: 'store' },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 2)
  t.is(dispatch.args[0][0].type, 'GET')
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should use params from from and to', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: { service: 'entries', type: 'special', onlyPublic: true },
        to: { service: 'store', type: 'other', overwrite: false },
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET',
    payload: {
      type: 'special',
      params: { onlyPublic: true },
      targetService: 'entries',
    },
    meta: { ident, project: 'project1' },
  }
  const expected2 = {
    type: 'SET',
    payload: {
      type: 'other',
      data,
      params: { overwrite: false },
      targetService: 'store',
    },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should override action types', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: { service: 'entries', action: 'GET_ALL' },
        to: { service: 'store', action: 'SET_SOME' },
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_ALL: updateAction('ok', { data }),
      SET_SOME: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET_ALL',
    payload: { type: 'entry', params: {}, targetService: 'entries' },
    meta: { ident, project: 'project1' },
  }
  const expected2 = {
    type: 'SET_SOME',
    payload: { type: 'entry', data, params: {}, targetService: 'store' },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should not queue SET when dontQueueSet is true', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: 'entries', to: 'store', dontQueueSet: true },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expected2 = {
    type: 'SET',
    payload: { type: 'entry', data, params: {}, targetService: 'store' },
    meta: { ident, project: 'project1', queue: false },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should get from several source services', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: ['entries', 'otherEntries'], to: 'store' },
      targetService: 'store',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [updateAction('ok', { data }), updateAction('ok', { data: data2 })],
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET',
    payload: { type: 'entry', params: {}, targetService: 'entries' },
    meta: { ident, project: 'project1' },
  }
  const expected2 = {
    type: 'GET',
    payload: { type: 'entry', params: {}, targetService: 'otherEntries' },
    meta: { ident, project: 'project1' },
  }
  const expected3 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [data[0], data2[0], data[1]],
      params: {},
      targetService: 'store',
    },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 3)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
  t.deepEqual(dispatch.args[2][0], expected3)
})

test('should remove untyped data', async (t) => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', params: { from: 'entries', to: 'store' } },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data: [undefined, ...data, { id: 'ent0' }] }),
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET',
    payload: { type: 'entry', params: {}, targetService: 'entries' },
    meta: { ident, project: 'project1' },
  }
  const expected2 = {
    type: 'SET',
    payload: { type: 'entry', data, params: {}, targetService: 'store' },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should pass on updatedAfter and updatedUntil, and set updatedSince and updatedBefore', async (t) => {
  const updatedAfter = new Date('2021-01-03T02:11:07Z')
  const updatedSince = new Date('2021-01-03T02:11:07.001Z')
  const updatedUntil = new Date('2021-01-18T02:14:34Z')
  const updatedBefore = new Date('2021-01-18T02:14:34.001Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: 'entries', to: 'store', updatedAfter, updatedUntil },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET',
    payload: {
      type: 'entry',
      params: {
        updatedAfter,
        updatedSince,
        updatedUntil,
        updatedBefore,
      },
      targetService: 'entries',
    },
    meta: { ident, project: 'project1' },
  }
  const expected2 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data,
      params: { updatedAfter, updatedSince, updatedUntil, updatedBefore },
      targetService: 'store',
    },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should pass on updatedSince and updatedBefore, and set updatedAfter and updatedUntil', async (t) => {
  const updatedAfter = new Date('2021-01-03T02:11:06.999Z')
  const updatedSince = new Date('2021-01-03T02:11:07Z')
  const updatedUntil = new Date('2021-01-18T02:14:33.999Z')
  const updatedBefore = new Date('2021-01-18T02:14:34Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: 'entries', to: 'store', updatedSince, updatedBefore },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET',
    payload: {
      type: 'entry',
      params: {
        updatedAfter,
        updatedSince,
        updatedUntil,
        updatedBefore,
      },
      targetService: 'entries',
    },
    meta: { ident, project: 'project1' },
  }
  const expected2 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data,
      params: { updatedAfter, updatedSince, updatedUntil, updatedBefore },
      targetService: 'store',
    },
    meta: { ident, project: 'project1', queue: true },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should use lastSyncedAt meta as updatedAfter when retrieve = updated', async (t) => {
  const lastSyncedAt = new Date('2021-01-03T04:48:18Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: 'entries', to: 'store', retrieve: 'updated' },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: updateAction('ok', { data: { meta: { lastSyncedAt } } }),
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET_META',
    payload: {
      type: 'entry',
      params: { keys: 'lastSyncedAt', metaKey: undefined },
      targetService: 'entries',
    },
    meta: { ident, project: 'project1' },
  }
  const expectedParams = {
    updatedAfter: lastSyncedAt,
    updatedSince: new Date('2021-01-03T04:48:18.001Z'),
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 4)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0].payload.params, expectedParams)
  t.deepEqual(dispatch.args[2][0].payload.params, expectedParams)
})

test('should use metaKey when fetching lastSyncedAt', async (t) => {
  const lastSyncedAt = new Date('2021-01-03T04:48:18Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: 'entries',
        to: 'store',
        retrieve: 'updated',
        metaKey: 'sports',
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: updateAction('ok', { data: { meta: { lastSyncedAt } } }),
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expected1 = {
    type: 'GET_META',
    payload: {
      type: 'entry',
      params: { keys: 'lastSyncedAt', metaKey: 'sports' },
      targetService: 'entries',
    },
    meta: { ident, project: 'project1' },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.deepEqual(dispatch.args[0][0], expected1)
})

test('should not use lastSyncedAt meta when updatedAfter is provided', async (t) => {
  const lastSyncedAt = new Date('2021-01-03T04:48:18Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: 'entries',
        to: 'store',
        retrieve: 'updated',
        updatedAfter: new Date('2021-01-02T01:00:11Z'),
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: updateAction('ok', { data: { meta: { lastSyncedAt } } }),
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expectedParams = {
    updatedAfter: new Date('2021-01-02T01:00:11Z'),
    updatedSince: new Date('2021-01-02T01:00:11.001Z'),
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].type, 'GET')
  t.deepEqual(dispatch.args[0][0].payload.params, expectedParams)
})

test('should use lastSyncedAt meta from several services', async (t) => {
  const lastSyncedAt1 = new Date('2021-01-03T04:48:18Z')
  const lastSyncedAt2 = new Date('2021-01-03T02:30:11Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
        metaKey: 'sports',
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        updateAction('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt1 } },
        }),
        updateAction('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt2 } },
        }),
      ],
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )
  const expectedParams3 = {
    updatedAfter: lastSyncedAt1,
    updatedSince: new Date('2021-01-03T04:48:18.001Z'),
  }
  const expectedParams4and5 = {
    updatedAfter: lastSyncedAt2,
    updatedSince: new Date('2021-01-03T02:30:11.001Z'),
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.deepEqual(dispatch.args[0][0].type, 'GET_META')
  t.deepEqual(dispatch.args[0][0].payload.type, 'entry')
  t.deepEqual(dispatch.args[0][0].payload.targetService, 'entries')
  t.deepEqual(dispatch.args[0][0].payload.params?.metaKey, 'sports')
  t.deepEqual(dispatch.args[1][0].type, 'GET_META')
  t.deepEqual(dispatch.args[1][0].payload.type, 'entry')
  t.deepEqual(dispatch.args[1][0].payload.targetService, 'other')
  t.deepEqual(dispatch.args[1][0].payload.params?.metaKey, 'sports')
  t.deepEqual(dispatch.args[2][0].payload.params, expectedParams3)
  t.deepEqual(dispatch.args[3][0].payload.params, expectedParams4and5)
  t.deepEqual(dispatch.args[4][0].payload.params, expectedParams4and5)
})

test('should filter away data updated before updatedAfter or after updatedUntil', async (t) => {
  const updatedAfter = new Date('2021-01-03T20:00:00Z')
  const updatedUntil = new Date('2021-01-04T20:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: 'entries', to: 'store', updatedAfter, updatedUntil },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', {
        data: [...data, { id: 'ent4', $type: 'entry' }, ...data2, 'invalid'],
      }),
      SET: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.true(Array.isArray(dispatch.args[1][0].payload.data))
  const setData = dispatch.args[1][0].payload.data as TypedData[]
  t.is(setData.length, 1)
  t.is(setData[0].id, 'ent3')
})

test('should filter away data with different lastSyncedAt for each service', async (t) => {
  const lastSyncedAt1 = new Date('2021-01-04T10:11:44Z')
  const lastSyncedAt2 = new Date('2021-01-02T00:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: { from: ['entries', 'other'], to: 'store', retrieve: 'updated' },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        updateAction('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt1 } },
        }),
        updateAction('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt2 } },
        }),
      ],
      GET: [updateAction('ok', { data }), updateAction('ok', { data: data2 })],
      SET: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.true(Array.isArray(dispatch.args[4][0].payload.data))
  const setData = dispatch.args[4][0].payload.data as TypedData[]
  t.is(setData.length, 2)
  t.is(setData[0].id, 'ent3')
  t.is(setData[1].id, 'ent2')
})

test('should treat no updatedAfter as open-ended', async (t) => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: 'entries',
        to: 'store',
        updatedAfter,
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', {
        data: [
          ...data,
          {
            id: 'ent4',
            $type: 'entry',
            updatedAt: new Date(Date.now() + 3600000),
          }, // Future data should not be filtered away with no updatedUntil
        ],
      }),
      SET: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.is((dispatch.args[1][0].payload.data as unknown[]).length, 3)
})

test('should set updatedUntil to now', async (t) => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: 'entries',
        to: 'store',
        updatedAfter,
        updatedUntil: 'now',
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', {
        data: [
          ...data,
          {
            id: 'ent4',
            $type: 'entry',
            updatedAt: new Date(Date.now() + 3600000),
          }, // Will be filtered away, as it is in the
        ],
      }),
      SET: updateAction('ok'),
    })
  )
  const before = Date.now()

  const ret = await sync(action, dispatch)

  const after = Date.now()
  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
  const setUpdatedUntil = dispatch.args[1][0].payload.params?.updatedUntil
  t.true(setUpdatedUntil instanceof Date)
  t.true((setUpdatedUntil as Date).getTime() >= before)
  t.true((setUpdatedUntil as Date).getTime() <= after)
  t.is((dispatch.args[1][0].payload.data as unknown[]).length, 2)
})

test('should set lastSyncedAt meta to updatedUntil', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
        updatedUntil: new Date('2021-01-05T00:00:00Z'),
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [updateAction('ok', { data }), updateAction('ok', { data: data2 })],
      SET: updateAction('ok'),
      SET_META: updateAction('ok'),
    })
  )
  const expected6 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      params: {
        meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
        metaKey: undefined,
      },
      targetService: 'entries',
    },
    meta: { ident, project: 'project1' },
  }
  const expected7 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      params: {
        meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
        metaKey: undefined,
      },
      targetService: 'other',
    },
    meta: { ident, project: 'project1' },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.deepEqual(dispatch.args[5][0], expected6)
  t.deepEqual(dispatch.args[6][0], expected7)
})

test('should set lastSyncedAt meta to now when no updatedUntil', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [updateAction('ok', { data }), updateAction('ok', { data: data2 })],
      SET: updateAction('ok'),
      SET_META: updateAction('ok'),
    })
  )
  const before = Date.now()

  const ret = await sync(action, dispatch)

  const after = Date.now()
  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 7)
  const lastSyncedAt1 = (dispatch.args[5][0].payload.params?.meta as Meta)
    .lastSyncedAt
  t.true(lastSyncedAt1 && lastSyncedAt1.getTime() >= before)
  t.true(lastSyncedAt1 && lastSyncedAt1.getTime() <= after)
  const lastSyncedAt2 = (dispatch.args[6][0].payload.params?.meta as Meta)
    .lastSyncedAt
  t.true(lastSyncedAt2 && lastSyncedAt2.getTime() >= before)
  t.true(lastSyncedAt2 && lastSyncedAt2.getTime() <= after)
})

test('should set lastSyncedAt meta to last updatedAt from data of each service', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
        setLastSyncedAtFromData: true,
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        updateAction('ok', {
          data: { meta: { lastSyncedAt: new Date('2021-01-03T04:48:18Z') } },
        }),
        updateAction('ok', {
          data: { meta: { lastSyncedAt: new Date('2021-01-03T02:30:11Z') } },
        }),
      ],
      GET: [updateAction('ok', { data }), updateAction('ok', { data: data2 })],
      SET: updateAction('ok'),
      SET_META: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.deepEqual(
    (dispatch.args[5][0].payload.params?.meta as Meta).lastSyncedAt,
    new Date('2021-01-05T09:11:13Z')
  )
  t.deepEqual(
    (dispatch.args[6][0].payload.params?.meta as Meta).lastSyncedAt,
    new Date('2021-01-03T23:50:23Z')
  )
})

test('should use metaKey when setting lastSyncedAt', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
        metaKey: 'sports',
        updatedUntil: new Date('2021-01-05T00:00:00Z'),
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [updateAction('ok', { data }), updateAction('ok', { data: data2 })],
      SET: updateAction('ok'),
      SET_META: updateAction('ok'),
    })
  )
  const expected6 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      params: {
        meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
        metaKey: 'sports',
      },
      targetService: 'entries',
    },
    meta: { ident, project: 'project1' },
  }
  const expected7 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      params: {
        meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
        metaKey: 'sports',
      },
      targetService: 'other',
    },
    meta: { ident, project: 'project1' },
  }

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.deepEqual(dispatch.args[5][0], expected6)
  t.deepEqual(dispatch.args[6][0], expected7)
})

test('should not get or set lastSyncedAt meta when service id is missing', async (t) => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      params: {
        from: {},
        to: 'store',
        retrieve: 'updated',
        updatedUntil: new Date('2021-01-05T00:00:00Z'),
      },
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [updateAction('ok', { data }), updateAction('ok', { data: data2 })],
      SET: updateAction('ok'),
      SET_META: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'ok')
  t.is(dispatch.callCount, 2)
})

test('should return error when get action fails', async (t) => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', params: { from: 'entries', to: 'store' } },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: (action: Action) => createError(action, 'Fetching failed'),
      SET: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, 'SYNC: Could not get data. Fetching failed')
  t.is(dispatch.callCount, 1)
})

test('should return error when set action fails', async (t) => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', params: { from: 'entries', to: 'store' } },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data }),
      SET: (action: Action) => createError(action, 'Service is sleeping'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, 'SYNC: Could not set data. Service is sleeping')
  t.is(dispatch.callCount, 2)
})

test('should return badrequest when missing from and to', async (t) => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry' },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateAction('ok', { data }),
      SET: updateAction('ok'),
    })
  )

  const ret = await sync(action, dispatch)

  t.is(ret.response?.status, 'badrequest')
  t.is(
    ret.response?.error,
    'SYNC: `type`, `to`, and `from` parameters are required'
  )
  t.is(dispatch.callCount, 0)
})
