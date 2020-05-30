import test from 'ava'
import sinon = require('sinon')
import { transform } from 'map-transform'
import createSchema from '../../schema'
import builtInFunctions from '../../transformers/builtIns'
import { Data, Exchange } from '../../types'
import { MapOptions } from '../types'
import { completeExchange } from '../../utils/exchangeMapping'
import jsonTransform from '../../tests/helpers/resources/transformers/jsonTransform'

import createEndpoint from './create'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      published: { $cast: 'boolean', $default: false },
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
    published: 'activated',
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

const entryMapping3 = [
  '[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
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
    entry3: entryMapping3,
  },
  functions: {
    ...builtInFunctions,
    shouldHaveToken,
    alwaysOk,
    jsonTransform,
  },
}

const exchange = completeExchange({
  type: 'GET',
  status: 'ok',
  request: {
    type: 'entry',
    data: [
      { id: 'ent1', $type: 'entry', title: 'Entry 1' },
      { id: 'ent2', $type: 'entry', title: 'Entry 2', published: true },
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
})

const serviceOptions = {}

// Tests -- props

test('should set id on endpoint', (t) => {
  const endpointDef = {
    id: 'endpoint1',
  }

  const ret = createEndpoint(serviceOptions, {})(endpointDef)

  t.is(ret.id, 'endpoint1')
})

test('should set match on endpoint', (t) => {
  const endpointDef = {
    id: 'endpoint1',
    match: { scope: 'member' },
  }

  const ret = createEndpoint(serviceOptions, {})(endpointDef)

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

  const ret = createEndpoint(serviceOptions, {})(endpointDef)

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
    serviceOptions,
    {},
    undefined,
    prepareOptions
  )(endpointDef)

  t.deepEqual(ret.options, expected)
})

// Tests -- isMatch

test('should return true when endpoint is a match to an exchange', (t) => {
  const endpointDef = {
    match: { filters: { 'request.data.draft': { const: false } } },
    options: {},
  }
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
      data: { draft: false },
    },
  })
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  t.true(endpoint.isMatch(exchange))
})

test('should return false when no match to exchange', (t) => {
  const endpointDef = {
    match: { scope: 'member' },
    options: {},
  }
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
    },
  })
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  t.false(endpoint.isMatch(exchange))
})

// Tests -- mutateResponse

test('should map response from service with endpoint mutation', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
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
          published: false,
          createdAt: theTime,
          updatedAt: theTime,
        },
      ],
    },
  }
  const clock = sinon.useFakeTimers(theTime)
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  const ret = endpoint.mutateResponse(exchange)

  clock.restore()
  t.deepEqual(ret, expected)
})

test('should map exchange props from response', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content', { $apply: 'entry' }],
      status: 'data.result',
      error: 'data.message',
      'params.id': 'data.key',
      'paging.next': {
        offset: 'data.offset',
        type: { $transform: 'fixed', value: 'entry' },
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithProps = {
    ...exchange,
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
        key: '7839',
        result: 'badrequest',
        message: 'Not valid',
        offset: 'page2',
      },
    },
  }
  const expectedPaging = { next: { offset: 'page2', type: 'entry' } }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateResponse(exchangeWithProps)

  t.is(ret.status, 'badrequest')
  t.is(ret.request.id, '7839')
  t.is(ret.response.error, 'Not valid')
  t.is(ret.response.data.length, 1)
  t.deepEqual(ret.response.paging, expectedPaging)
})

test('should map response from service with service and endpoint mutations', (t) => {
  const serviceMutation = {
    data: ['data', { $transform: 'jsonTransform' }],
    error: 'params.message',
  }
  const endpointDef = {
    mutation: {
      data: ['data.content', { $apply: 'entry' }],
      status: 'data.result',
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithProps = {
    ...exchange,
    request: {
      params: { message: 'Too much' },
    },
    response: {
      data: JSON.stringify({
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
        result: 'badrequest',
      }),
    },
  }

  const endpoint = createEndpoint(
    serviceOptions,
    mapOptions,
    serviceMutation
  )(endpointDef)
  const ret = endpoint.mutateResponse(exchangeWithProps)

  t.is(ret.response.data.length, 1)
  t.is(ret.response.data[0].id, 'ent1')
  t.is(ret.status, 'badrequest')
  t.is(ret.response.error, 'Too much')
})

test('should map response from service with service mutation only', (t) => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithProps = {
    ...exchange,
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
      },
    },
  }
  const serviceMutation = {
    data: ['data.content', { $apply: 'entry' }],
  }

  const endpoint = createEndpoint(
    serviceOptions,
    mapOptions,
    serviceMutation
  )(endpointDef)
  const ret = endpoint.mutateResponse(exchangeWithProps)

  t.is(ret.status, 'ok', ret.response.error)
  t.is(ret.response.data.length, 1)
  t.is(ret.response.data[0].id, 'ent1')
})

test('should keep exchange props not mapped from response', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content', { $apply: 'entry' }],
      status: 'data.result',
      error: 'data.message',
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithProps = {
    ...exchange,
    status: 'error',
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
        message: 'Not valid',
      },
    },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateResponse(exchangeWithProps)

  t.is(ret.status, 'error')
  t.is(ret.response.error, 'Not valid')
  t.is(ret.response.data.length, 1)
})

test('should not include error from response when not an error', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content', { $apply: 'entry' }],
      error: 'data.message',
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithProps = {
    ...exchange,
    status: 'queued',
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
        message: 'Not valid',
      },
    },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateResponse(exchangeWithProps)

  t.is(ret.status, 'queued')
  t.is(ret.response.error, undefined)
})

test('should map to undefined from response when unknown path', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.unknown', { $apply: 'entry2' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = {
    ...exchange,
    response: { data: undefined },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateResponse(exchange)

  t.deepEqual(ret, expected)
})

test('should map to empty array from service when unknown path and expecting array', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.unknown', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = {
    ...exchange,
    response: { data: [] },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateResponse(exchange)

  t.deepEqual(ret, expected)
})

test('should map from service without defaults', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithoutDefaults = {
    ...exchange,
    response: {
      ...exchange.response,
      returnNoDefaults: true,
    },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateResponse(exchangeWithoutDefaults)

  t.is(ret.response.data[0].published, undefined)
})

test('should not map from service when no mutation pipeline', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = exchange

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateResponse(exchange)

  t.deepEqual(ret, expected)
})

test('should map response to service (incoming)', (t) => {
  const statusFromId = (id: unknown) => (id === '404' ? 'notfound' : 'ok')
  const endpointDef = {
    mutation: {
      $flip: true,
      'data.content': ['data', { $apply: 'entry' }],
      status: ['data[0].id', transform(statusFromId)],
      error: 'data[0].title',
      'params.id': 'data[0].id',
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const incomingExchange = {
    ...exchange,
    type: 'REQUEST',
    request: {
      type: 'entry',
    },
    response: {
      data: [
        {
          $type: 'entry',
          id: '404',
          title: 'Not found',
          published: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    incoming: true,
  }
  const expectedData = {
    content: { items: [{ key: '404', header: 'Not found', activated: true }] },
  }
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  const ret = endpoint.mutateResponse(incomingExchange)

  t.is(ret.status, 'notfound')
  t.is(ret.response.error, 'Not found')
  t.is(ret.request.id, '404') // TODO: Is this correct behavior?
  t.deepEqual(ret.response.data, expectedData)
})

test('should not map response from service when direction is rev', (t) => {
  const endpointDef = {
    mutation: {
      $direction: 'rev',
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = exchange
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  const ret = endpoint.mutateResponse(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- mutateRequest

test('should map request with endpoint mutation', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
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
              { key: 'ent1', header: 'Entry 1', activated: false },
              { key: 'ent2', header: 'Entry 2', activated: true },
            ],
          },
        },
      },
    },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateRequest(exchange)

  t.deepEqual(ret, expected)
})

test('should map request with root array path', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data', { $apply: 'entry3' }], // Has root path '[]'
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = {
    ...exchange,
    request: {
      type: 'entry',
      data: [
        { key: 'ent1', header: 'Entry 1' },
        { key: 'ent2', header: 'Entry 2' },
      ],
    },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateRequest(exchange)

  t.deepEqual(ret, expected)
})

test('should map to service with no defaults', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithoutDefaults = {
    ...exchange,
    request: {
      ...exchange.request,
      sendNoDefaults: true,
    },
  }

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateRequest(exchangeWithoutDefaults)

  t.is(ret.request.data.content.data.items[0].activated, undefined)
  t.is(ret.request.data.content.data.items[1].activated, true)
})

test('should not map to service when no mutation pipeline', (t) => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = exchange

  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = endpoint.mutateRequest(exchange)

  t.deepEqual(ret, expected)
})

test('should not map request with mutation when direction is set to fwd', (t) => {
  const endpointDef = {
    mutation: {
      $direction: 'fwd',
      data: ['data.content', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const exchangeWithoutRequestData = {
    ...exchange,
    request: {
      type: 'entry',
      data: undefined,
    },
  }
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  const ret = endpoint.mutateRequest(exchangeWithoutRequestData)

  t.is(ret.request.data, undefined)
})

test('should map request from service (incoming)', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const incomingExchange = {
    ...exchange,
    type: 'EXCHANGE',
    request: {
      type: 'entry',
      data: {
        content: { data: { items: [{ key: 'ent1', header: 'Entry 1' }] } },
      },
    },
    incoming: true,
  }
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  const ret = endpoint.mutateRequest(incomingExchange)

  const data = ret.request.data
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
  t.is(data[0].$type, 'entry')
  t.is(data[0].title, 'Entry 1')
})

test.skip('should map request from service with types', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const incomingExchange = {
    ...exchange,
    type: 'EXCHANGE',
    request: {
      type: 'account',
      data: {
        content: {
          data: {
            items: [{ id: 'ent1', $type: 'entry', title: 'Entry 1' }],
            accounts: [{ id: 'account1', name: 'John F.' }],
          },
        },
      },
    },
    incoming: true,
  }
  const endpoint = createEndpoint(serviceOptions, mapOptions)(endpointDef)

  const ret = endpoint.mutateRequest(incomingExchange)

  const data = ret.request.data
  t.is(data.length, 1)
  t.is(data[0].id, 'account1')
  t.is(data[0].$type, 'account')
  t.is(data[0].name, 'John F.')
})

// Tests -- validate

test('should run validation pipeline until error', (t) => {
  const endpointDef = {
    match: {},
    validate: ['shouldHaveToken', 'alwaysOk'],
  }
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
    },
  })
  const expected = {
    ...exchange,
    status: 'badrequest',
  }

  const { validate } = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret, expected)
})

test('should run all validations when no error', (t) => {
  const endpointDef = {
    match: {},
    validate: ['shouldHaveToken', 'alwaysOk'],
  }
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
      params: {
        token: 't0k3n',
      },
    },
  })
  const expected = {
    ...exchange,
    meta: { ok: true }, // Comes from `alwaysOk`
  }

  const { validate } = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret, expected)
})

test('should support both functions and references in validation pipeline', (t) => {
  const endpointDef = {
    match: {},
    validate: transform(shouldHaveToken()),
  }
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
    },
  })

  const { validate } = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret.status, 'badrequest')
})

test('should skip unknown references in validation pipeline', (t) => {
  const endpointDef = {
    match: {},
    validate: ['unknown', 'shouldHaveToken', 'alwaysOk'],
  }
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
    },
  })

  const { validate } = createEndpoint(serviceOptions, mapOptions)(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret.status, 'badrequest')
})
