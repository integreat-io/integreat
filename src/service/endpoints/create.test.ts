import test from 'ava'
import sinon = require('sinon')
import { transform } from 'map-transform'
import createSchema from '../../schema'
import builtInFunctions from '../../transformers/builtIns'
import { TypedData, Data, Exchange, MapOptions } from '../../types'

import createEndpoint from './create'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      one: { $cast: 'integer', $default: 1 },
      two: 'integer'
    },
    access: 'auth'
  }),
  account: createSchema({
    id: 'account',
    shape: {
      name: 'string'
    },
    access: {
      identFromField: 'id',
      actions: {
        TEST: 'all'
      }
    }
  })
}

const entryMapping = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    one: 'one',
    two: 'two'
  },
  { $apply: 'cast_entry' }
]

const entryMapping2 = [
  'items',
  {
    $iterate: true,
    id: 'key',
    title: 'two'
  },
  { $apply: 'cast_entry' }
]

const entryMapping3 = [
  '[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header'
  },
  { $apply: 'cast_entry' }
]

const accountMapping = [
  'accounts',
  {
    $iterate: true,
    id: 'id',
    name: 'name'
  },
  { $apply: 'cast_account' }
]

const shouldHaveToken = () => (exchange: Data) =>
  typeof exchange === 'object' && exchange !== null
    ? {
        ...exchange,
        status: ((exchange as unknown) as Exchange).request.params?.token
          ? null
          : 'badrequest'
      }
    : exchange

const alwaysOk = () => (exchange: Data) =>
  typeof exchange === 'object' && exchange !== null
    ? { ...exchange, status: null, meta: { ok: true } }
    : exchange

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    ['cast_account']: schemas.account.mapping,
    entry: entryMapping,
    entry2: entryMapping2,
    entry3: entryMapping3,
    account: accountMapping
  },
  functions: {
    ...builtInFunctions,
    shouldHaveToken,
    alwaysOk
  }
}

const exchangeDefaults = {
  status: null,
  request: {},
  response: {},
  options: {},
  meta: {}
}

const exchange = {
  ...exchangeDefaults,
  type: 'GET',
  status: 'ok',
  request: {
    type: 'entry',
    data: [
      { id: 'ent1', $type: 'entry', title: 'Entry 1' },
      { id: 'account1', $type: 'account', name: 'John F.' },
      { id: 'ent2', $type: 'entry', title: 'Entry 2' }
    ]
  },
  response: {
    data: {
      content: {
        data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
      }
    }
  },
  ident: { id: 'johnf' }
}

const serviceMappings = {}
const serviceOptions = {}

// Tests -- props

test('should set id on endpoint', t => {
  const endpointDef = {
    id: 'endpoint1'
  }

  const ret = createEndpoint(serviceMappings, serviceOptions, {})(endpointDef)

  t.is(ret.id, 'endpoint1')
})

test('should set match on endpoint', t => {
  const endpointDef = {
    id: 'endpoint1',
    match: { scope: 'member' }
  }

  const ret = createEndpoint(serviceMappings, serviceOptions, {})(endpointDef)

  t.deepEqual(ret.match, { scope: 'member' })
})

test('should set options from service and endpoint', t => {
  const serviceOptions = {
    baseUri: 'http://some.api/1.0',
    uri: '/entries'
  }
  const endpointDef = {
    options: { uri: '/accounts' }
  }
  const expected = {
    baseUri: 'http://some.api/1.0',
    uri: '/accounts'
  }

  const ret = createEndpoint(serviceMappings, serviceOptions, {})(endpointDef)

  t.deepEqual(ret.options, expected)
})

test('should set run options through prepareOptions', t => {
  const prepareOptions = (options: MapOptions) => ({
    ...options,
    prepared: true
  })
  const serviceOptions = {
    baseUri: 'http://some.api/1.0',
    uri: '/entries'
  }
  const endpointDef = {
    options: { uri: '/accounts' }
  }
  const expected = {
    baseUri: 'http://some.api/1.0',
    uri: '/accounts',
    prepared: true
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

test('should return true when endpoint is a match to an exchange', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    match: { filters: { 'request.data.draft': { const: false } } },
    options: {}
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
      data: { draft: false }
    }
  }
  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)

  t.true(endpoint.isMatch(exchange))
})

test('should return false when no match to exchange', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    match: { scope: 'member' },
    options: {}
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry'
    }
  }
  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)

  t.false(endpoint.isMatch(exchange))
})

// Tests -- mapFromService

test('should map from service with service mappings', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' }
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
          one: 1,
          two: 2,
          createdAt: theTime,
          updatedAt: theTime
        }
      ]
    }
  }
  const clock = sinon.useFakeTimers(theTime)

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchange)

  clock.restore()
  t.deepEqual(ret, expected)
})

test('should map from service with endpoint mappings', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' },
    mappings: { entry: 'entry2' }
  }
  const theTime = new Date()
  const expected = {
    ...exchange,
    response: {
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: '2',
          one: 1,
          two: undefined,
          createdAt: theTime,
          updatedAt: theTime
        }
      ]
    }
  }
  const clock = sinon.useFakeTimers(theTime)

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchange)

  clock.restore()
  t.deepEqual(ret, expected)
})

test('should map several types', t => {
  const serviceMappings = { entry: 'entry', account: 'account' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
    mappings: { entry: 'entry2' }
  }
  const exchangeWithTypes = {
    ...exchange,
    request: {
      type: ['entry', 'account']
    },
    response: {
      data: {
        items: [
          { key: 'ent1', header: 'Entry 1' },
          { key: 'ent2', header: 'Entry 2' }
        ],
        accounts: [{ id: 'account1', name: 'John F.' }]
      }
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeWithTypes)

  const data = ret.response.data as TypedData[]
  t.is(data.length, 3)
  t.is(data[0].id, 'ent1')
  t.is(data[1].id, 'ent2')
  t.is(data[2].id, 'account1')
})

test('should skip unknown types', t => {
  const serviceMappings = { entry: 'entry', account: 'account' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
    mappings: { entry: 'entry2' }
  }
  const exchangeUnknownType = {
    ...exchange,
    request: {
      type: ['entry', 'unknown']
    },
    response: {
      data: {
        items: [{ key: 'ent1', header: 'Entry 1' }]
      }
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeUnknownType)

  const data = ret.response.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
})

test('should map with no type mapping', t => {
  const endpointDef = {
    fromMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' }
  }
  const expected = {
    ...exchange,
    response: {
      data: undefined
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchange)

  t.deepEqual(ret, expected)
})

test('should map without type', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeNoType = {
    ...exchange,
    request: {}
  }
  const expected = {
    ...exchangeNoType,
    response: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeNoType)

  t.deepEqual(ret, expected)
})

test('should return undefined when mapping from non-existing path', t => {
  const serviceMappings = { entry: 'entry2' }
  const endpointDef = {
    fromMapping: 'content.unknown',
    options: { uri: 'http://some.api/1.0' }
  }
  const expected = {
    ...exchange,
    response: {
      data: undefined
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchange)

  t.deepEqual(ret, expected)
})

test('should map response object with fromMapping', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: {
      data: 'data.content',
      status: 'data.result',
      error: 'data.message',
      'params.id': 'data.key'
    },
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithStatus = {
    ...exchange,
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
        key: '7839',
        result: 'error',
        message: 'Well. It failed'
      }
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeWithStatus)

  t.is(ret.status, 'error')
  t.is(ret.response.error, 'Well. It failed')
  t.is((ret.response.data as TypedData[]).length, 1)
  t.is(ret.response.params?.id, '7839')
})

test('should keep response props not overriden by mapping', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: {
      data: 'data.content'
    },
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithStatus = {
    ...exchange,
    status: 'error',
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
      },
      error: 'Well. It failed'
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeWithStatus)

  t.is(ret.status, 'error')
  t.is(ret.response.error, 'Well. It failed')
  t.is((ret.response.data as TypedData[]).length, 1)
})

test('should not include error prop when no error', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: {
      error: 'data.message'
    },
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithNoError = {
    ...exchange,
    status: 'queued',
    response: {
      data: {}
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeWithNoError)

  t.is(ret.status, 'queued')
  t.false(
    ret.response.hasOwnProperty('error'),
    'Response has `error` property.'
  )
})

// TODO: Really?
test('should not include error prop when no status', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: {
      error: 'data.message'
    },
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithNoError = {
    ...exchange,
    status: null,
    response: {
      data: {}
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeWithNoError)

  t.is(ret.status, null)
  t.false(
    ret.response.hasOwnProperty('error'),
    'Response has `error` property.'
  )
})

test('should map paging with fromMapping', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    fromMapping: {
      data: 'data.content',
      'paging.next': {
        offset: 'data.offset',
        type: { $transform: 'fixed', value: 'entry' }
      }
    },
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithPaging = {
    ...exchange,
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
        offset: 'page2'
      }
    }
  }
  const expectedPaging = { next: { offset: 'page2', type: 'entry' } }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapFromService(exchangeWithPaging)

  t.deepEqual(ret.response.paging, expectedPaging)
})

test.todo('should cast one item to array')

// Tests -- mapToService

test('should map to service with service mappings and specified type', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    toMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' }
  }
  const expected = {
    ...exchange,
    request: {
      type: 'entry',
      data: {
        content: {
          data: {
            items: [
              { key: 'ent1', header: 'Entry 1', one: 1, two: undefined },
              { key: 'ent2', header: 'Entry 2', one: 1, two: undefined }
            ]
          }
        }
      }
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapToService(exchange)

  t.deepEqual(ret, expected)
})

test('should not map by type when no type is specified', t => {
  const serviceMappings = { entry: 'entry' }
  const endpointDef = {
    toMapping: 'content.data',
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithoutType = {
    ...exchange,
    request: {
      ...exchange.request,
      type: undefined
    }
  }
  const expected = {
    ...exchangeWithoutType,
    request: {
      ...exchangeWithoutType.request,
      data: {
        content: {
          data: exchangeWithoutType.request.data
        }
      }
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapToService(exchangeWithoutType)

  t.deepEqual(ret, expected)
})

test('should map to service with array as root path', t => {
  const serviceMappings = { entry: 'entry3' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' }
  }
  const expected = {
    ...exchange,
    request: {
      type: 'entry',
      data: [
        { key: 'ent1', header: 'Entry 1' },
        { key: 'ent2', header: 'Entry 2' }
      ]
    }
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapToService(exchange)

  t.deepEqual(ret, expected)
})

test('should map to service with several types', t => {
  const serviceMappings = { entry: 'entry', account: 'account' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithTypes = {
    ...exchange,
    request: {
      ...exchange.request,
      type: ['entry', 'account']
    }
  }
  const expectedData = {
    items: [
      { key: 'ent1', header: 'Entry 1', one: 1, two: undefined },
      { key: 'ent2', header: 'Entry 2', one: 1, two: undefined }
    ],
    accounts: [{ id: 'account1', name: 'John F.' }]
  }

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapToService(exchangeWithTypes)

  t.deepEqual(ret.request.data, expectedData)
})

test('should map data to service with no specified type', t => {
  const serviceMappings = { entry: 'entry', account: 'account' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithTypes = {
    ...exchange,
    request: {
      ...exchange.request,
      type: undefined
    }
  }
  const expected = exchangeWithTypes

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapToService(exchangeWithTypes)

  t.deepEqual(ret, expected)
})

test.skip('should map to service when one is array', t => {
  const serviceMappings = { entry: 'entry3', account: 'account' }
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' }
  }
  const exchangeWithTypes = {
    ...exchange,
    request: {
      ...exchange.request,
      type: ['entry', 'account']
    }
  }
  const expectedData = [
    { key: 'ent1', header: 'Entry 1', one: 1, two: undefined },
    { key: 'ent2', header: 'Entry 2', one: 1, two: undefined },
    { accounts: [{ id: 'account1', name: 'John F.' }] }
  ]

  const endpoint = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mapToService(exchangeWithTypes)

  t.deepEqual(ret.request.data, expectedData)
})

// Tests -- validate

test('should run validation pipeline until error', t => {
  const endpointDef = {
    match: {},
    validate: ['shouldHaveToken', 'alwaysOk']
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry'
    }
  }
  const expected = {
    ...exchange,
    status: 'badrequest'
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret, expected)
})

test('should run all validations when no error', t => {
  const endpointDef = {
    match: {},
    validate: ['shouldHaveToken', 'alwaysOk']
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
      params: {
        token: 't0k3n'
      }
    }
  }
  const expected = {
    ...exchange,
    meta: { ok: true } // Comes from `alwaysOk`
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret, expected)
})

test('should support both functions and references in validation pipeline', t => {
  const endpointDef = {
    match: {},
    validate: transform(shouldHaveToken())
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry'
    }
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret.status, 'badrequest')
})

test('should skip unknown references in validation pipeline', t => {
  const endpointDef = {
    match: {},
    validate: ['unknown', 'shouldHaveToken', 'alwaysOk']
  }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry'
    }
  }

  const { validate } = createEndpoint(
    serviceMappings,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = validate(exchange)

  t.deepEqual(ret.status, 'badrequest')
})
