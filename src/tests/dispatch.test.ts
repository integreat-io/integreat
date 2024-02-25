import test from 'ava'
import nock from 'nock'
import defs from './helpers/defs/index.js'
import resources from './helpers/resources/index.js'
import type { Action } from '../types.js'

import Integreat from '../index.js'

// Setup

test.after.always(() => {
  nock.restore()
})

// Tests

test('should set the number of actions currently dispatched', async (t) => {
  const resourcesWithWait = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: {
        ...resources.transporters!.http,
        async send(_action: Action) {
          await new Promise((resolve) => setTimeout(resolve, 200, undefined))
          return { status: 'ok', data: [] }
        },
      },
    },
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }
  const great = Integreat.create(defs, resourcesWithWait)

  const count0 = great.dispatchedCount
  great.dispatch(action)
  const count1 = great.dispatchedCount
  great.dispatch(action)
  const count2 = great.dispatchedCount
  const p = great.dispatch(action)
  const count3 = great.dispatchedCount

  t.is(count0, 0)
  t.is(count1, 1)
  t.is(count2, 2)
  t.is(count3, 3)
  await p
  t.is(great.dispatchedCount, 0)
})
