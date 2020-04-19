import test from 'ava'
import sinon = require('sinon')
import { transform } from 'map-transform'
import createSchema from '../../schema'
import builtInFunctions from '../../transformers/builtIns'
import { completeExchange } from '../../utils/exchangeMapping'
import { TypedData } from '../../types'
import { prepareMappings, createMapper } from './create'

import mapResponse from './mapResponse'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      one: { $cast: 'integer', $default: 1 },
      two: 'integer',
    },
    access: 'auth',
  }),
  account: createSchema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: {
      identFromField: 'id',
      actions: {
        TEST: 'all',
      },
    },
  }),
}

const entryMapping = [
  'items',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    one: 'one',
    two: 'two',
  },
  { $apply: 'cast_entry' },
]

const accountMapping = [
  'accounts',
  {
    $iterate: true,
    id: 'id',
    name: 'name',
  },
  { $apply: 'cast_account' },
]

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    ['cast_account']: schemas.account.mapping,
    entry: entryMapping,
    account: accountMapping,
  },
  functions: { ...builtInFunctions },
}

const mappings = prepareMappings(
  { entry: 'entry', account: 'account' },
  mapOptions
)

const exchange = completeExchange({
  type: 'GET',
  status: 'ok',
  request: { type: 'entry' },
  response: {
    data: {
      content: {
        data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
      },
    },
  },
  ident: { id: 'johnf' },
})

// Tests

test('should map from service with mappings', (t) => {
  const clock = sinon.useFakeTimers()

  const mappings = prepareMappings({ entry: 'entry' }, mapOptions)
  const responseMapper = createMapper('content.data', mapOptions)
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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchange)

  t.deepEqual(ret, expected)
  clock.restore()
})

test('should map several types', (t) => {
  const responseMapper = null
  const exchangeWithTypes = {
    ...exchange,
    request: {
      type: ['entry', 'account'],
    },
    response: {
      data: {
        items: [
          { key: 'ent1', header: 'Entry 1' },
          { key: 'ent2', header: 'Entry 2' },
        ],
        accounts: [{ id: 'account1', name: 'John F.' }],
      },
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchangeWithTypes)

  const data = ret.response.data as TypedData[]
  t.is(data.length, 3)
  t.is(data[0].id, 'ent1')
  t.is(data[1].id, 'ent2')
  t.is(data[2].id, 'account1')
})

test('should map from service without defaults', (t) => {
  const returnNoDefaults = true
  const mappings = prepareMappings({ entry: 'entry' }, mapOptions)
  const responseMapper = createMapper('content.data', mapOptions)

  const ret = mapResponse(responseMapper, mappings, returnNoDefaults)(exchange)

  const data = ret.response.data as TypedData[]
  t.is(data[0].one, undefined) // Should not have default
  t.is(data[0].two, 2)
})

test('should use returnNoDefaults from exchange when set', (t) => {
  const returnNoDefaults = true
  const mappings = prepareMappings({ entry: 'entry' }, mapOptions)
  const responseMapper = createMapper('content.data', mapOptions)
  const exchangeWithDefaults = {
    ...exchange,
    response: {
      ...exchange.response,
      returnNoDefaults: false,
    },
  }

  const ret = mapResponse(
    responseMapper,
    mappings,
    returnNoDefaults
  )(exchangeWithDefaults)

  const data = ret.response.data as TypedData[]
  t.is(data[0].one, 1) // Should have default
  t.is(data[0].two, 2)
})

test('should skip unknown types', (t) => {
  const responseMapper = null
  const exchangeUnknownType = {
    ...exchange,
    request: {
      type: ['entry', 'unknown'],
    },
    response: {
      data: {
        items: [{ key: 'ent1', header: 'Entry 1' }],
      },
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchangeUnknownType)

  const data = ret.response.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
})

test('should not map data with no corresponding type mapping', (t) => {
  const mappings = prepareMappings({}, mapOptions)
  const responseMapper = createMapper('content.data', mapOptions)
  const expected = {
    ...exchange,
    response: {
      data: undefined,
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchange)

  t.deepEqual(ret, expected)
})

test('should return raw data when exchange has no type', (t) => {
  const responseMapper = createMapper('content.data', mapOptions)
  const exchangeNoType = {
    ...exchange,
    request: {},
  }
  const expected = {
    ...exchangeNoType,
    response: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchangeNoType)

  t.deepEqual(ret, expected)
})

test('should return undefined when mapping from non-existing path', (t) => {
  const responseMapper = createMapper('content.unknown', mapOptions)
  const expected = {
    ...exchange,
    response: {
      data: undefined,
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchange)

  t.deepEqual(ret, expected)
})

test('should map exchange props with responseMapping', (t) => {
  const responseMapper = createMapper(
    {
      data: 'data.content',
      status: 'data.result',
      error: 'data.message',
      'params.id': 'data.key',
    },
    mapOptions
  )
  const exchangeWithStatus = {
    ...exchange,
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
        key: '7839',
        result: 'badrequest',
        message: "You can't do it like this",
      },
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchangeWithStatus)

  t.is(ret.status, 'badrequest')
  t.is(ret.response.error, "You can't do it like this")
  t.is((ret.response.data as TypedData[]).length, 1)
  t.is(ret.request.id, '7839')
})

test('should keep response props not overriden by mapping', (t) => {
  const responseMapper = createMapper({ data: 'data.content' }, mapOptions)
  const exchangeWithStatus = {
    ...exchange,
    status: 'error',
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
      },
      error: 'Well. It failed',
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchangeWithStatus)

  t.is(ret.status, 'error')
  t.is(ret.response.error, 'Well. It failed')
  t.is((ret.response.data as TypedData[]).length, 1)
})

test('should not include error prop when no error', (t) => {
  const responseMapper = createMapper({ error: 'data.message' }, mapOptions)
  const exchangeWithNoError = {
    ...exchange,
    status: 'queued',
    response: {
      data: {},
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchangeWithNoError)

  t.is(ret.status, 'queued')
  t.false(
    ret.response.hasOwnProperty('error'),
    'Response has `error` property.'
  )
})

test('should set error status when error prop is set', (t) => {
  const responseMapper = createMapper({ error: 'data.message' }, mapOptions)
  const exchangeWithNoError = {
    ...exchange,
    status: 'ok',
    response: {
      data: { message: 'This did not go well' },
    },
  }

  const ret = mapResponse(responseMapper, mappings)(exchangeWithNoError)

  t.is(ret.status, 'error')
  t.is(ret.response.error, 'This did not go well')
})

test('should map paging with responseMapping', (t) => {
  const responseMapper = createMapper(
    {
      data: 'data.content',
      'paging.next': {
        offset: 'data.offset',
        type: { $transform: 'fixed', value: 'entry' },
      },
    },
    mapOptions
  )
  const exchangeWithPaging = {
    ...exchange,
    response: {
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
        offset: 'page2',
      },
    },
  }
  const expectedPaging = { next: { offset: 'page2', type: 'entry' } }

  const ret = mapResponse(responseMapper, mappings)(exchangeWithPaging)

  t.deepEqual(ret.response.paging, expectedPaging)
})

test('should map response to incoming exchange from service', (t) => {
  const mappings = prepareMappings({ entry: 'entry' }, mapOptions)
  const responseMapper = createMapper('content', mapOptions)
  const incomingExchange = {
    ...exchange,
    request: {
      type: 'entry',
    },
    response: {
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'Entry 1',
          two: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    incoming: true,
  }
  const expectedData = {
    content: { items: [{ key: 'ent1', header: 'Entry 1', one: 1, two: 2 }] },
  }

  const ret = mapResponse(responseMapper, mappings)(incomingExchange)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, expectedData)
})

test('should map response to incoming exchange with responseMapping', (t) => {
  const statusFromId = (id: unknown) => (id === '404' ? 'notfound' : 'ok')
  const responseMapper = createMapper(
    {
      $flip: true,
      $iterate: false,
      data: 'data.content',
      status: ['data.items[0].key', transform(statusFromId)],
      error: 'data.items[0].header',
      'params.id': 'data.items[0].key',
    },
    mapOptions
  )
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
          one: 1,
          two: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    incoming: true,
  }

  const ret = mapResponse(responseMapper, mappings)(incomingExchange)

  t.is(ret.status, 'notfound')
  t.is(ret.response.error, 'Not found')
  t.is(ret.request.id, '404') // TODO: Is this correct behavior?
})

test.todo('should cast one item to array') // Or not ...?
