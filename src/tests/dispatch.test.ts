import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from './helpers/defs/index.js'
import resources from './helpers/resources/index.js'
import type { Action, Transporter } from '../types.js'

import Integreat from '../index.js'

// Tests

test('should set the number of actions currently dispatched', async () => {
  const resourcesWithWait = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: {
        ...resources.transporters?.http,
        async send(_action: Action) {
          await new Promise((resolve) => setTimeout(resolve, 200, undefined))
          return { status: 'ok', data: [] }
        },
      } as Transporter,
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

  assert.equal(count0, 0)
  assert.equal(count1, 1)
  assert.equal(count2, 2)
  assert.equal(count3, 3)
  await p
  assert.equal(great.dispatchedCount, 0)

  nock.restore()
})
