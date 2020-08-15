import test from 'ava'
import { Endpoint } from './types'
import createSchema from '../../schema'

import createEndpointMappers from '.'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      one: { $cast: 'integer', $default: 1 },
      two: 'integer',
      service: 'service',
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
    service: '^params.service',
    author: '^access.ident.id',
  },
  { $apply: 'cast_entry' },
]

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    entry: entryMapping,
  },
  functions: {},
}

const exchangeDefaults = {
  status: null,
  request: {},
  response: {},
  options: {},
  meta: {},
}

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
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
      id: 'ent1',
    },
  }

  const matchFn = createEndpointMappers(
    endpointDefs,
    serviceOptions,
    mapOptions
  )
  const mapping = matchFn(exchange)

  t.truthy(mapping)
  t.is((mapping as Endpoint).id, 'endpoint2')
})

test.todo('should merge options')
