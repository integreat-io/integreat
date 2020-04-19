import test from 'ava'
import createSchema from '../../schema'
import builtInFunctions from '../../transformers/builtIns'
import { completeExchange } from '../../utils/exchangeMapping'
import { prepareMappings, createMapper } from './create'
import { DataObject } from '../../types'

import mapRequest from './mapRequest'

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
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    one: 'one',
    two: 'two',
  },
  { $apply: 'cast_entry' },
]

const entryMapping2 = [
  '[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
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
    entry2: entryMapping2,
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
  request: {
    type: 'entry',
    data: [
      { id: 'ent1', $type: 'entry', title: 'Entry 1' },
      { id: 'account1', $type: 'account', name: 'John F.' },
      { id: 'ent2', $type: 'entry', title: 'Entry 2' },
    ],
  },
  response: {},
  ident: { id: 'johnf' },
})

// Tests

test('should map to service with mappings and specified type', (t) => {
  const requestMapper = createMapper('content.data', mapOptions)
  const expected = {
    ...exchange,
    request: {
      type: 'entry',
      data: {
        content: {
          data: {
            items: [
              { key: 'ent1', header: 'Entry 1', one: 1, two: undefined },
              { key: 'ent2', header: 'Entry 2', one: 1, two: undefined },
            ],
          },
        },
      },
    },
  }

  const ret = mapRequest(requestMapper, mappings)(exchange)

  t.deepEqual(ret, expected)
})

test('should map to service without defaults', (t) => {
  const sendNoDefaults = true
  const requestMapper = createMapper('content.data', mapOptions)
  const expectedData = [
    { key: 'ent1', header: 'Entry 1' },
    { key: 'ent2', header: 'Entry 2' },
  ]

  const ret = mapRequest(requestMapper, mappings, sendNoDefaults)(exchange)

  const data = ((ret.request.data as DataObject).content as DataObject)
    .data as DataObject
  t.deepEqual(data.items, expectedData)
})

test('should use sendNoDefaults from exchange when set', (t) => {
  const sendNoDefaults = true
  const requestMapper = createMapper('content.data', mapOptions)
  const exchangeWithDefaults = {
    ...exchange,
    request: {
      ...exchange.request,
      sendNoDefaults: false,
    },
  }
  const expectedData = [
    { key: 'ent1', header: 'Entry 1', one: 1, two: undefined },
    { key: 'ent2', header: 'Entry 2', one: 1, two: undefined },
  ]

  const ret = mapRequest(
    requestMapper,
    mappings,
    sendNoDefaults
  )(exchangeWithDefaults)

  const data = ((ret.request.data as DataObject).content as DataObject)
    .data as DataObject
  t.deepEqual(data.items, expectedData)
})

test('should not map by type when no type is specified', (t) => {
  const requestMapper = createMapper('content.data', mapOptions)
  const exchangeWithoutType = {
    ...exchange,
    request: {
      ...exchange.request,
      type: undefined,
    },
  }
  const expected = {
    ...exchangeWithoutType,
    request: {
      ...exchangeWithoutType.request,
      data: {
        content: {
          data: exchangeWithoutType.request.data,
        },
      },
    },
  }

  const ret = mapRequest(requestMapper, mappings)(exchangeWithoutType)

  t.deepEqual(ret, expected)
})

test('should map to service with array as root path', (t) => {
  const mappings = prepareMappings({ entry: 'entry2' }, mapOptions)
  const requestMapper = null
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

  const ret = mapRequest(requestMapper, mappings)(exchange)

  t.deepEqual(ret, expected)
})

test('should map to service with several types', (t) => {
  const requestMapper = null
  const exchangeWithTypes = {
    ...exchange,
    request: {
      ...exchange.request,
      type: ['entry', 'account'],
    },
  }
  const expectedData = {
    items: [
      { key: 'ent1', header: 'Entry 1', one: 1, two: undefined },
      { key: 'ent2', header: 'Entry 2', one: 1, two: undefined },
    ],
    accounts: [{ id: 'account1', name: 'John F.' }],
  }

  const ret = mapRequest(requestMapper, mappings)(exchangeWithTypes)

  t.deepEqual(ret.request.data, expectedData)
})

test('should map data to service with no specified type', (t) => {
  const requestMapper = null
  const exchangeWithTypes = {
    ...exchange,
    request: {
      ...exchange.request,
      type: undefined,
    },
  }
  const expected = exchangeWithTypes

  const ret = mapRequest(requestMapper, mappings)(exchangeWithTypes)

  t.deepEqual(ret, expected)
})

test('should map request from incoming exchange from service', (t) => {
  const rawData = {
    content: {
      data: {
        items: [{ id: 'ent1', $type: 'entry', title: 'Entry 1' }],
        accounts: [{ id: 'account1', name: 'John F.' }],
      },
    },
  }
  const requestMapper = createMapper('content.data', mapOptions)
  const incomingExchange = {
    ...exchange,
    type: 'EXCHANGE',
    request: { type: 'account', data: rawData },
    incoming: true,
  }

  const ret = mapRequest(requestMapper, mappings)(incomingExchange)

  const data = ret.request.data as DataObject[]
  t.is(data.length, 1)
  t.is(data[0]?.id, 'account1')
  t.is(data[0]?.$type, 'account')
  t.is(data[0]?.name, 'John F.')
})

test.failing('should map to service when one is array', (t) => {
  const mappings = prepareMappings(
    { entry: 'entry2', account: 'account' },
    mapOptions
  )
  const requestMapper = null
  const exchangeWithTypes = {
    ...exchange,
    request: {
      ...exchange.request,
      type: ['entry', 'account'],
    },
  }
  const expectedData = [
    { key: 'ent1', header: 'Entry 1', one: 1, two: undefined },
    { key: 'ent2', header: 'Entry 2', one: 1, two: undefined },
    { accounts: [{ id: 'account1', name: 'John F.' }] },
  ]

  const ret = mapRequest(requestMapper, mappings)(exchangeWithTypes)

  t.deepEqual(ret.request.data, expectedData)
})
