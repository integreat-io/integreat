import test from 'ava'
import createSchema from '../../schema/index.js'
import type Endpoint from './Endpoint.js'

import createEndpoints, { endpointForAction } from './index.js'

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

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
  },
  transformers: {},
}

const serviceId = 'accountStore'
const serviceOptions = {}

// Tests

test('should return endpoints', (t) => {
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

  const endpoints = createEndpoints(
    serviceId,
    endpointDefs,
    serviceOptions,
    mapOptions
  )

  t.is(endpoints.length, 2)
  t.is(endpoints[0].id, 'endpoint2')
  t.is(endpoints[1].id, 'endpoint1')
})

test('should find matching endpoint', (t) => {
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

  const endpoints = createEndpoints(
    serviceId,
    endpointDefs,
    serviceOptions,
    mapOptions
  )
  const mapping = endpointForAction(action, endpoints)

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

  const endpoints = createEndpoints(
    serviceId,
    endpointDefs,
    serviceOptions,
    mapOptions
  )
  const mapping = endpointForAction(action, endpoints)

  t.truthy(mapping)
  t.is((mapping as Endpoint).id, 'endpoint2')
})

test('should match scope all', (t) => {
  const endpointDefs = [
    {
      id: 'endpoint1',
      match: { type: 'entry', scope: 'all' },
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
    },
  }

  const endpoints = createEndpoints(
    serviceId,
    endpointDefs,
    serviceOptions,
    mapOptions
  )
  const mapping = endpointForAction(action, endpoints)

  t.truthy(mapping)
  t.is((mapping as Endpoint).id, 'endpoint1')
})

test('should treat scope all as no scope', (t) => {
  const endpointDefs = [
    {
      id: 'endpoint1',
      match: { type: 'entry', scope: 'all' },
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

  const endpoints = createEndpoints(
    serviceId,
    endpointDefs,
    serviceOptions,
    mapOptions
  )
  const mapping = endpointForAction(action, endpoints)

  t.truthy(mapping)
  t.is((mapping as Endpoint).id, 'endpoint2')
})

test.todo('should merge options')
