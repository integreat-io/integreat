import test from 'ava'
import sinon = require('sinon')
import createSchema from '../../schema'
import builtInFunctions from '../../transformers/builtIns'
import { DataObject } from '../../types'
import { MapOptions } from '../types'
import json from '../../transformers/json'
import { isAction } from '../../utils/is'

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

const shouldHaveToken = () => (action: unknown) =>
  isAction(action)
    ? {
        ...action,
        response: {
          ...action.response,
          status: action.payload.token ? null : 'badrequest',
        },
      }
    : action

const alwaysOk = () => (action: unknown) =>
  isAction(action)
    ? {
        ...action,
        response: { ...action.response, status: null },
        meta: { ok: true },
      }
    : action

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
    json,
  },
}

const action = {
  type: 'GET',
  payload: {
    type: 'entry',
    data: [
      { id: 'ent1', $type: 'entry', title: 'Entry 1' },
      { id: 'ent2', $type: 'entry', title: 'Entry 2', published: true },
    ],
  },
  meta: { ident: { id: 'johnf' } },
}

const actionWithResponse = {
  ...action,
  response: {
    status: 'ok',
    data: {
      content: {
        data: {
          items: [{ key: 'ent1', header: 'Entry 1', title: 'The long title' }],
        },
      },
    },
  },
}

const serviceId = 'accountStore'
const serviceOptions = {}

// Tests -- props

test('should set id, allowRawRequest, and allowRawResponse on endpoint', (t) => {
  const endpointDef = {
    id: 'endpoint1',
    allowRawRequest: true,
    allowRawResponse: true,
  }

  const ret = createEndpoint(serviceId, serviceOptions, {})(endpointDef)

  t.is(ret.id, 'endpoint1')
  t.true(ret.allowRawRequest)
  t.true(ret.allowRawResponse)
})

test('should set match on endpoint', (t) => {
  const endpointDef = {
    id: 'endpoint1',
    match: { scope: 'member' },
  }

  const ret = createEndpoint(serviceId, serviceOptions, {})(endpointDef)

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

  const ret = createEndpoint(serviceId, serviceOptions, {})(endpointDef)

  t.deepEqual(ret.options, expected)
})

test('should set run options through prepareOptions', (t) => {
  const prepareOptions = (options: MapOptions, serviceId: string) => ({
    ...options,
    serviceId,
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
    serviceId: 'accountStore',
    prepared: true,
  }

  const ret = createEndpoint(
    serviceId,
    serviceOptions,
    {},
    undefined,
    prepareOptions
  )(endpointDef)

  t.deepEqual(ret.options, expected)
})

// Tests -- isMatch

test('should return true when endpoint is a match to an action', (t) => {
  const endpointDef = {
    match: { filters: { 'payload.data.draft': { const: false } } },
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      data: { draft: false },
    },
  }
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)

  t.true(endpoint.isMatch(action))
})

test('should return false when no match to action', (t) => {
  const endpointDef = {
    match: { scope: 'member' },
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
    },
  }
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)

  t.false(endpoint.isMatch(action))
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
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
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
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)

  const ret = endpoint.mutateResponse(actionWithResponse)

  clock.restore()
  t.deepEqual(ret, expected)
})

test('should map action props from response', (t) => {
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
  const actionWithProps = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
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

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'badrequest')
  t.is(ret.payload.id, '7839')
  t.is(ret.response?.error, 'Not valid')
  t.is((ret.response?.data as DataObject[]).length, 1)
  t.deepEqual(ret.response?.paging, expectedPaging)
})

test('should map response from service with service and endpoint mutations', (t) => {
  const serviceMutation = [
    {
      '.': '.',
      data: ['data', { $transform: 'json' }],
      error: 'params.message',
    },
    { '.': '.', status: 'status' }, // Just to check that we're not missing any props
  ]
  const endpointDef = {
    mutation: {
      data: ['data.content', { $apply: 'entry' }],
      status: 'data.result',
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithProps = {
    ...actionWithResponse,
    payload: {
      message: 'Too much',
    },
    response: {
      ...actionWithResponse.response,
      data: JSON.stringify({
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
        result: 'badrequest',
      }),
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    serviceMutation
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithProps)

  const data = ret.response?.data as DataObject[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
  t.is(ret.response?.status, 'badrequest')
  t.is(ret.response?.error, 'Too much')
})

test('should map response from service with service mutation only', (t) => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithProps = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
      },
    },
  }
  const serviceMutation = {
    data: ['data.content', { $apply: 'entry' }],
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    serviceMutation
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  const data = ret.response?.data as DataObject[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
})

test('should keep action props not mapped from response', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content', { $apply: 'entry' }],
      status: 'data.result',
      error: 'data.message',
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithProps = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      status: 'error',
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
        message: 'Not valid',
      },
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, 'Not valid')
  t.is((ret.response?.data as DataObject[]).length, 1)
})

test('should set status to error for response with an error', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content', { $apply: 'entry' }],
      error: 'data.message',
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithProps = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      status: 'queued',
      data: {
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
        message: 'Not valid',
      },
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, 'Not valid')
})

test('should map to undefined from response when unknown path', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.unknown', { $apply: 'entry2' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      data: undefined,
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithResponse)

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
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      data: [],
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithResponse)

  t.deepEqual(ret, expected)
})

test('should map from service without defaults', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithoutDefaults = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      returnNoDefaults: true,
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithoutDefaults)

  t.is((ret.response?.data as DataObject[])[0].published, undefined)
})

test('should not map from service when no mutation pipeline', (t) => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = actionWithResponse

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateResponse(actionWithResponse)

  t.deepEqual(ret, expected)
})

test('should not map response from service when direction is rev', (t) => {
  const endpointDef = {
    mutation: {
      $direction: 'rev',
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = actionWithResponse
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)

  const ret = endpoint.mutateResponse(actionWithResponse)

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
    ...action,
    payload: {
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

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateRequest(action)

  t.deepEqual(ret, expected)
})

test('should map request with service mutation', (t) => {
  const serviceMutation = [
    {
      $direction: 'rev',
      $flip: true,
      '.': '.',
      options: {
        '.': 'options',
        headers: {
          '.': 'options.headers',
          'Content-Type': {
            $transform: 'value',
            value: 'application/json',
          },
        },
      },
      data: ['data', { $transform: 'json' }],
    },
    {
      $direction: 'rev',
      $flip: true,
      '.': '.',
      options: {
        '.': 'options',
        uri: { $transform: 'template', templatePath: 'options.uri' },
      },
    },
  ]
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithOptions = {
    ...action,
    payload: {
      ...action.payload,
      id: 'ent1',
    },
    meta: {
      ...action.meta,
      options: { uri: '/entries/{{params.type}}:{{params.id}}' },
    },
  }
  const expected = {
    ...actionWithOptions,
    payload: {
      ...actionWithOptions.payload,
      data: JSON.stringify({
        content: {
          data: {
            items: [
              { key: 'ent1', header: 'Entry 1', activated: false },
              { key: 'ent2', header: 'Entry 2', activated: true },
            ],
          },
        },
      }),
    },
    meta: {
      ...actionWithOptions.meta,
      options: {
        uri: '/entries/entry:ent1',
        headers: { 'Content-Type': 'application/json' },
      },
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    serviceMutation
  )(endpointDef)
  const ret = endpoint.mutateRequest(actionWithOptions)

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
    ...action,
    payload: {
      type: 'entry',
      data: [
        { key: 'ent1', header: 'Entry 1' },
        { key: 'ent2', header: 'Entry 2' },
      ],
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateRequest(action)

  t.deepEqual(ret, expected)
})

test('should map to service with no defaults', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithoutDefaults = {
    ...action,
    payload: {
      ...action.payload,
      sendNoDefaults: true,
    },
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateRequest(actionWithoutDefaults)

  const items = (
    ((ret.payload.data as DataObject).content as DataObject).data as DataObject
  ).items as DataObject[]
  t.is(items[0].activated, undefined)
  t.is(items[1].activated, true)
})

test('should not map to service when no mutation pipeline', (t) => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = action

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = endpoint.mutateRequest(action)

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
  const actionWithoutRequestData = {
    ...action,
    payload: {
      type: 'entry',
      data: undefined,
    },
  }
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)

  const ret = endpoint.mutateRequest(actionWithoutRequestData)

  t.is(ret.payload.data, undefined)
})

test('should map request from service (incoming)', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const incomingAction = {
    ...action,
    type: 'SET',
    payload: {
      type: 'entry',
      data: {
        content: { data: { items: [{ key: 'ent1', header: 'Entry 1' }] } },
      },
    },
  }
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const isIncoming = true

  const ret = endpoint.mutateRequest(incomingAction, isIncoming)

  const data = ret.payload.data as DataObject[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
  t.is(data[0].$type, 'entry')
  t.is(data[0].title, 'Entry 1')
})

test.failing('should map request from service with types', (t) => {
  const endpointDef = {
    mutation: {
      data: ['data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const incomingAction = {
    ...action,
    type: 'SET',
    payload: {
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
  }
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const isIncoming = true

  const ret = endpoint.mutateRequest(incomingAction, isIncoming)

  const data = ret.payload.data as DataObject[]
  t.is(data.length, 1)
  t.is(data[0].id, 'account1')
  t.is(data[0].$type, 'account')
  t.is(data[0].name, 'John F.')
})
