import test from 'node:test'
import assert from 'node:assert/strict'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entriesService from '../helpers/defs/services/entries.js'
import { heapUsedAfterCollect, inKib } from './heap.js'

import Integreat from '../../index.js'

// Setup

// Integreat creates one map-transform instance per endpoint mutation, per
// validator, per job step and so on, and hands every one of them the same map
// options with all registered pipelines. If map-transform prepares the
// pipelines it is given per instance rather than sharing prepared pipelines
// across them, the memory one Integreat instance retains grows steeply with the
// number of endpoints -- which is what map-transform 1.6.0-rc.4 did, and why it
// was reverted after being released in Integreat v1.6.5.
//
// We measure the marginal cost per endpoint rather than the total, as
// subtracting the fixed cost of an instance makes this far less brittle than an
// absolute threshold.
//
// Not run by `npm test` or `npm run test:legacy`. Run with `npm run test:memory`.

const entryMapping = [
  {
    $iterate: true,
    id: 'key',
    title: { $alt: ['headline', { $value: 'An entry' }] },
    text: 'body',
    'author.id': 'authorId',
  },
]

// Endpoints that all apply the same pipeline, each matching on its own param so
// none of them are discarded as duplicates
const createEndpoints = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `endpoint${index}`,
    match: { action: 'GET', params: { [`q${index}`]: false } },
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.data[]', { $apply: 'entries-entry' }],
      },
    },
    options: { uri: `/entries${index}` },
  }))

async function heapRetainedByInstance(endpointCount: number) {
  const defs = {
    ...definitions,
    mutations: { ...definitions.mutations, 'entries-entry': entryMapping },
    services: [
      { ...entriesService, endpoints: createEndpoints(endpointCount) },
    ],
  }
  const before = await heapUsedAfterCollect()
  const great = Integreat.create(defs, resources)
  const after = await heapUsedAfterCollect()
  assert.equal(Object.keys(great.services).length, 1) // Keep the instance alive past the measurement
  return after - before
}

const fewEndpoints = 10
const manyEndpoints = 100
// This is around 13 KiB per endpoint on map-transform 1.6.0-rc.6, and was the
// same on 1.5.4. It was around 67 KiB on the reverted 1.6.0-rc.4, and 22 KiB on
// 1.6.0-rc.5 before `prepareOptions` was taken into use.
const maxPerEndpoint = 35 * 1024

// Tests

test('should not retain memory per map transform instance when creating an instance', async () => {
  await heapRetainedByInstance(fewEndpoints) // Warm up, as the first instance pays one time costs

  const withFew = await heapRetainedByInstance(fewEndpoints)
  const withMany = await heapRetainedByInstance(manyEndpoints)

  const perEndpoint = (withMany - withFew) / (manyEndpoints - fewEndpoints)
  console.log(
    `Instance retained ${inKib(withFew)} KiB with ${fewEndpoints} endpoints and ${inKib(withMany)} KiB with ${manyEndpoints}, i.e. ${inKib(perEndpoint)} KiB per endpoint`,
  ) // Report the numbers, so they may be compared across map-transform versions
  assert.ok(
    perEndpoint < maxPerEndpoint,
    `Retained ${inKib(perEndpoint)} KiB per endpoint, expected less than ${inKib(maxPerEndpoint)} KiB`,
  )
})
