import test from 'node:test'
import assert from 'node:assert/strict'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import { heapUsedAfterCollect, inKib } from './heap.js'
import type { Action, Connection, Transporter } from '../../types.js'

import Integreat from '../../index.js'

// Setup

// Verifies that an Integreat instance does not retain memory per dispatch. This
// is the shape of the leak that made v1.6.5 grow in long running servers.
//
// Not run by `npm test` or `npm run test:legacy` -- the `.memory.ts` suffix
// keeps it out of both globs. Run it with `npm run test:memory`, which passes
// the `--expose-gc` flag this file needs.
//
// The mutations below deliberately apply pipelines from within an `$alt` branch
// and from another pipeline. A flat mutation would never reach the pipeline
// preparation code, leaving a leak there invisible to this test.

const defs = {
  ...definitions,
  mutations: {
    ...definitions.mutations,
    'entries-title': ['headline'],
    'entries-author': [{ id: 'authorId' }],
    'entries-entry': {
      $iterate: true,
      id: 'key',
      title: {
        $alt: ['missing', { $apply: 'entries-title' }, { $value: 'An entry' }],
      },
      text: 'body',
      author: { $apply: 'entries-author' },
    },
  },
}

const entriesData = {
  data: [
    {
      key: 'ent1',
      headline: 'Entry 1',
      body: 'The text of entry 1',
      authorId: 'johnf',
    },
  ],
}

const warmUpCount = 500
const measuredCount = 3000
// On map-transform 1.5.4 this grows the heap by around 258 KiB, i.e. it is
// flat. The threshold leaves ample room for noise, while a leak retaining
// state per dispatch would run into tens of MiB at this number of dispatches.
const maxGrowth = 5 * 1024 * 1024

// Tests

test('should not grow the heap when dispatching to the same instance', async () => {
  const send = async (action: Action, _connection: Connection | null) => ({
    ...action.response,
    status: 'ok',
    data: JSON.stringify(entriesData),
  })
  const resourcesWithSend = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: { ...resources.transporters?.http, send } as Transporter,
    },
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }
  const great = Integreat.create(defs, resourcesWithSend)

  for (let i = 0; i < warmUpCount; i++) {
    await great.dispatch(action) // Let one time preparation and caching settle
  }
  const before = await heapUsedAfterCollect()
  for (let i = 0; i < measuredCount; i++) {
    await great.dispatch(action)
  }
  const after = await heapUsedAfterCollect()

  const growth = after - before
  console.log(
    `Heap grew by ${inKib(growth)} KiB over ${measuredCount} dispatches`,
  ) // Report the number, so it may be compared across map-transform versions
  assert.ok(growth < maxGrowth, `Heap growth exceeded ${maxGrowth / 1024} KiB`)
})
