import test from 'ava'
import sinon = require('sinon')
import { transform } from 'map-transform'
import createSchema from '../../schema'
import builtInFunctions from '../../transformers/builtIns'
import { Data, Exchange } from '../../types'
import { MapOptions } from '../types'

import createEndpoint from './create'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
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
  },
  { $apply: 'cast_entry' },
]

const entryMapping2 = [
  'items',
  {
    $iterate: true,
    id: 'key',
    title: 'title',
  },
  { $apply: 'cast_entry' },
]

const shouldHaveToken = () => (exchange: Data) =>
  typeof exchange === 'object' && exchange !== null
    ? {
        ...exchange,
        status: ((exchange as unknown) as Exchange).request.params?.token
          ? null
          : 'badrequest',
      }
    : exchange

const alwaysOk = () => (exchange: Data) =>
  typeof exchange === 'object' && exchange !== null
    ? { ...exchange, status: null, meta: { ok: true } }
    : exchange

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    entry: entryMapping,
    entry2: entryMapping2,
  },
  functions: {
    ...builtInFunctions,
    shouldHaveToken,
    alwaysOk,
  },
}

const exchangeDefaults = {
  status: null,
  request: {},
  response: {},
  options: {},
  meta: {},
}

const exchange = {
  ...exchangeDefaults,
  type: 'GET',
  status: 'ok',
  request: {
    type: 'entry',
    data: [
      { id: 'ent1', $type: 'entry', title: 'Entry 1' },
      { id: 'ent2', $type: 'entry', title: 'Entry 2' },
    ],
  },
  response: {
    data: {
      content: {
        data: {
          items: [{ key: 'ent1', header: 'Entry 1', title: 'The long title' }],
        },
      },
    },
  },
  ident: { id: 'johnf' },
}

const serviceMappings = {}
const serviceOptions = {}

// Tests -- props

test('should set id on endpoint', (t) => {
  const endpointDef = {
    id: 'endpoint1',
  }

  const ret = createEndpoint(serviceMappings, serviceOptions, {})(endpointDef)

  t.is(ret.id, 'endpoint1')
})

test('should set match on endpoint', (t) => {
  const endpointDef = {
    id: 'endpoint1',
    match: { scope: 'member' },
  }

  const ret = createEndpoint(serviceMappings, serviceOptions, {})(endpointDef)

  t.deepEqual(ret.match, { scope: 'member' })
})

test('should set options from service and endpoint', (t) => {
  const serviceOptions = {
    baseUri: 'http://some.api/1.0',
    uri: '/entries',
  }
  const endpointDef = {
    options: { uri: '/accounts' },
  }
  const expected = {
    baseUri: 'http://some.api/1.0',
    uri: '/accounts',
  }

  const ret = createEndpoint(serviceMappings, serviceOptions, {})(endpointDef)

  t.deepEqual(ret.options, expected)
})

test('should set run options through prepareOptions', (t) => {
  const prepareOptions = (options: MapOptions) => ({
    ...options,
    prepared: true,
  })
  const serviceOptions = {
    baseUri: 'http://some.api/1.0',
    uri: '/entries',
  }
  const endpointDef = {
    options: { uri: '/accounts' },
  }
  const expected = {
    baseUri: 'http://some.api/1.0',
    uri: '/accounts',
    prepared: true,
  }

  const ret = createEndpoint(
    serviceMappings,
    serviceOptions,
    {},
    prepareOptions
  )(endpointDef)

  t.deepEqual(ret.options, expected)
})

// Tests -- isMatch

test('should return true when endpoint is a match to an exchange', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    match: { filters: { 'request.data.draft': { const: false } } },
    options: {},
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
      data: { draft: false },
    },
  }
  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)

  t.true(endpoint.isMatch(exchange))
})

test('should return false when no match to exchange', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    match: { scope: 'member' },
    options: {},
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
    },
  }
  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)

  t.false(endpoint.isMatch(exchange))
})

// Tests -- mapResponse

test('should map from service with service mappings', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    responseMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' },
  }
  const theTime = new Date()
  const expected = {
    ...exchange,
    response: {
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'Entry 1',
          createdAt: theTime,
          updatedAt: theTime,
        },
      ],
    },
  }
  const clock = sinon.useFakeTimers(theTime)

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapResponse(exchange)

  clock.restore()
  t.deepEqual(ret, expected)
})

test('should map from service with endpoint mappings', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    responseMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' },
    mappings: { entry: 'entry2' },
  }
  const theTime = new Date()
  const expected = {
    ...exchange,
    response: {
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'The long title',
          createdAt: theTime,
          updatedAt: theTime,
        },
      ],
    },
  }
  const clock = sinon.useFakeTimers(theTime)

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapResponse(exchange)

  clock.restore()
  t.deepEqual(ret, expected)
})

// Tests -- mapRequest

test('should map to service with service mappings and specified type', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    requestMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = {
    ...exchange,
    request: {
      type: 'entry',
      data: {
        content: {
          data: {
            items: [
              { key: 'ent1', header: 'Entry 1' },
              { key: 'ent2', header: 'Entry 2' },
            ],
          },
        },
      },
    },
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapRequest(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- validate

test('should run validation pipeline until error', (t) => {
  const endpointDef = {
    match: {},
    validate: ['shouldHaveToken', 'alwaysOk'],
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
    },
  }
  const expected = {
    ...exchange,
    status: 'badrequest',
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret, expected)
})

test('should run all validations when no error', (t) => {
  const endpointDef = {
    match: {},
    validate: ['shouldHaveToken', 'alwaysOk'],
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
      params: {
        token: 't0k3n',
      },
    },
  }
  const expected = {
    ...exchange,
    meta: { ok: true }, // Comes from `alwaysOk`
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret, expected)
})

test('should support both functions and references in validation pipeline', (t) => {
  const endpointDef = {
    match: {},
    validate: transform(shouldHaveToken()),
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
    },
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret.status, 'badrequest')
})

test('should skip unknown references in validation pipeline', (t) => {
  const endpointDef = {
    match: {},
    validate: ['unknown', 'shouldHaveToken', 'alwaysOk'],
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
    },
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret.status, 'badrequest')
})
