import test from 'ava'
import createSchema from '../../schema/index.js'
import type { Endpoint } from './types.js'

import createEndpointMappers from './index.js'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      one: { $type: 'integer', default: 1 },
      two: 'integer',
      source: 'source',
    },
    access: 'auth',
  }),
}

const entryMapping = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    one: 'one',
    two: 'two',
    source: '^params.source',
    author: '^access.ident.id',
  },
  { $apply: 'cast_entry' },
]

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    entry: entryMapping,
  },
  transformers: {},
}

const serviceId = 'accountStore'
const serviceOptions = {}

// Tests

test('should return match function', (t) => {
  const endpointDefs = [
    {
      id: 'endpoint1',
      match: { type: 'entry' },
      options: { uri: 'http://test.api/1' },
    },
    {
      id: 'endpoint2',
      match: { type: 'entry', scope: 'member' },
      options: { uri: 'http://test.api/2' },
    },
  ]
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
    },
  }

  const matchFn = createEndpointMappers(
    serviceId,
    endpointDefs,
    serviceOptions,
    mapOptions
  )
  const mapping = matchFn(action)

  t.truthy(mapping)
  t.is((mapping as Endpoint).id, 'endpoint2')
})

test('should match by id', (t) => {
  const endpointDefs = [
    {
      id: 'endpoint1',
      match: { type: 'entry' },
      options: { uri: 'http://test.api/1' },
    },
    {
      id: 'endpoint2',
      match: { type: 'entry' },
      options: { uri: 'http://test.api/2' },
    },
  ]
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
      endpoint: 'endpoint2',
    },
  }

  const matchFn = createEndpointMappers(
    serviceId,
    endpointDefs,
    serviceOptions,
    mapOptions
  )
  const mapping = matchFn(action)

  t.truthy(mapping)
  t.is((mapping as Endpoint).id, 'endpoint2')
})

test.todo('should merge options')
