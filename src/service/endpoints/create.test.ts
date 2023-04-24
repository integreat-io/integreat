import test from 'ava'
import sinon from 'sinon'
import jsonAdapter from '../../adapters/json.js'
import createSchema from '../../schema/index.js'
import builtInTransformers from '../../transformers/builtIns/index.js'
import transformers from '../../transformers/index.js'
import type { TypedData, Adapter } from '../../types.js'
import type { MapOptions } from '../types.js'
import { isAction, isObject } from '../../utils/is.js'
import createMapOptions from '../../utils/createMapOptions.js'

import createEndpoint from './create.js'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      published: { $type: 'boolean', default: false },
      createdAt: 'date',
      updatedAt: 'date',
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

const shouldHaveToken = () => () => (action: unknown) =>
  isAction(action)
    ? {
        ...action,
        response: {
          ...action.response,
          status: action.payload.token ? null : 'badrequest',
        },
      }
    : action

const alwaysOk = () => () => (action: unknown) =>
  isAction(action)
    ? {
        ...action,
        response: { ...action.response, status: null },
        meta: { ok: true },
      }
    : action

const pipelines = {
  entry: entryMapping,
  entry2: entryMapping2,
  entry3: entryMapping3,
}

const allTransformers = {
  ...builtInTransformers,
  ...transformers,
  shouldHaveToken,
  alwaysOk,
}

const mapOptions = createMapOptions(schemas, pipelines, allTransformers)

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

const mockAdapter: Adapter = {
  prepareOptions: (options, _serviceId) => options,
  async normalize(action, _options) {
    const data = action.response?.data
    return isObject(data)
      ? {
          ...action,
          response: {
            ...action.response,
            data: {
              content: {
                data: {
                  items: [
                    (data.content as any).data.items[0], // eslint-disable-line @typescript-eslint/no-explicit-any
                    (data.content as any).data.items[0], // eslint-disable-line @typescript-eslint/no-explicit-any
                  ],
                },
              },
            },
          },
        }
      : action
  },
  async serialize(action, _options) {
    const data = action.payload?.data
    return isObject(data)
      ? {
          ...action,
          payload: {
            ...action.payload,
            data: {
              content: {
                data: {
                  items: [
                    (data.content as any).data.items[0], // eslint-disable-line @typescript-eslint/no-explicit-any
                  ],
                },
              },
            },
          },
        }
      : action
  },
}

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

test('should mutate response from service with endpoint mutation', async (t) => {
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
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

  const ret = await endpoint.mutateResponse(actionWithResponse)

  clock.restore()
  t.deepEqual(ret, expected)
})

test('should mutate action props from response', async (t) => {
  const endpointDef = {
    mutation: {
      response: [
        'response',
        {
          '.': '.',
          data: ['data.content', { $apply: 'entry' }],
          status: 'data.result',
          error: 'data.message',
          'params.id': 'data.key',
          'paging.next': {
            offset: 'data.offset',
            type: { $transform: 'fixed', value: 'entry' },
          },
        },
      ],
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
  const ret = await endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'badrequest')
  t.is(ret.response?.error, 'Not valid')
  t.is((ret.response?.data as TypedData[]).length, 1)
  t.deepEqual(ret.response?.paging, expectedPaging)
  t.is(ret.response?.params?.id, '7839')
})

test('should mutate response from service with service and endpoint mutations', async (t) => {
  const serviceMutation = [
    {
      response: {
        '.': 'response',
        data: ['response.data', { $transform: 'json' }],
        error: 'payload.message',
      },
    },
    { response: { '.': 'response', status: 'response.status' } }, // Just to check that we're not missing any props
  ]
  const endpointDef = {
    mutation: {
      response: {
        '.': 'response',
        data: ['response.data.content', { $apply: 'entry' }],
        status: 'response.data.result',
      },
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
  const ret = await endpoint.mutateResponse(actionWithProps)

  const data = ret.response?.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
  t.is(ret.response?.status, 'badrequest')
  t.is(ret.response?.error, 'Too much')
})

test('should mutate response from service with service mutation only', async (t) => {
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
    response: 'response',
    'response.data': ['response.data.content', { $apply: 'entry' }],
  }

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    serviceMutation
  )(endpointDef)
  const ret = await endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  const data = ret.response?.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
})

test('should mutate response from service with service adapter', async (t) => {
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithJSON = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      data: JSON.stringify(actionWithResponse.response.data),
    },
  }
  const serviceAdapters = [jsonAdapter]
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    undefined,
    undefined,
    serviceAdapters
  )(endpointDef)

  const ret = await endpoint.mutateResponse(actionWithJSON)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(Array.isArray(ret.response?.data), 'Should be an array')
  t.true(
    isObject((ret.response?.data as TypedData[])[0]),
    'Should be an object'
  )
})

test('should mutate response from service with endpoint adapter', async (t) => {
  const endpointAdapters = [mockAdapter]
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    adapters: endpointAdapters,
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithJSON = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      data: JSON.stringify(actionWithResponse.response.data),
    },
  }
  const serviceAdapters = [jsonAdapter]
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    undefined,
    undefined,
    serviceAdapters
  )(endpointDef)

  const ret = await endpoint.mutateResponse(actionWithJSON)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(Array.isArray(ret.response?.data), 'Should be an array')
  t.is((ret.response?.data as TypedData[]).length, 2) // Mock adapter duplicates the array
})

test('should mutate response from service with service adapter and no mutation pipeline', async (t) => {
  const endpointDef = {
    allowRawResponse: true,
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithJSON = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
      data: JSON.stringify(actionWithResponse.response.data),
    },
  }
  const serviceAdapters = [jsonAdapter]
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    undefined,
    undefined,
    serviceAdapters
  )(endpointDef)
  const expectedData = {
    content: {
      data: {
        items: [{ key: 'ent1', header: 'Entry 1', title: 'The long title' }],
      },
    },
  }

  const ret = await endpoint.mutateResponse(actionWithJSON)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.deepEqual(ret.response?.data, expectedData)
})

test('should mutate response to service (incoming) with service adapter', async (t) => {
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }

  const serviceAdapters = [jsonAdapter]
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    undefined,
    undefined,
    serviceAdapters
  )(endpointDef)
  const isIncoming = true
  const expectedData =
    '{"content":{"data":{"items":[{"key":null,"activated":false}]}}}'

  const ret = await endpoint.mutateResponse(actionWithResponse, isIncoming)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(ret.response?.data, expectedData)
})

test('should keep action props not mapped from response', async (t) => {
  const endpointDef = {
    mutation: {
      response: [
        'response',
        {
          '.': '.',
          data: ['data.content', { $apply: 'entry' }],
          status: 'data.result',
          error: 'data.message',
        },
      ],
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
  const ret = await endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, 'Not valid')
  t.is((ret.response?.data as TypedData[]).length, 1)
})

test('should set status to error for response with an error', async (t) => {
  const endpointDef = {
    mutation: {
      response: [
        'response',
        {
          data: ['data.content', { $apply: 'entry' }],
          error: 'data.message',
        },
      ],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const actionWithProps = {
    ...actionWithResponse,
    response: {
      ...actionWithResponse.response,
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
  const ret = await endpoint.mutateResponse(actionWithProps)

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, 'Not valid')
})

test('should mutate to undefined from response when unknown path', async (t) => {
  const endpointDef = {
    mutation: {
      response: 'response',
      'response.data': ['response.data.unknown', { $apply: 'entry2' }],
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
  const ret = await endpoint.mutateResponse(actionWithResponse)

  t.deepEqual(ret, expected)
})

test('should mutate to empty array from service when unknown path and expecting array', async (t) => {
  const endpointDef = {
    mutation: {
      response: 'response',
      'response.data': ['response.data.content.unknown', { $apply: 'entry' }],
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
  const ret = await endpoint.mutateResponse(actionWithResponse)

  t.deepEqual(ret, expected)
})

test('should not mutate from service when no mutation pipeline', async (t) => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = actionWithResponse

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = await endpoint.mutateResponse(actionWithResponse)

  t.deepEqual(ret, expected)
})

test('should not mutate response from service when direction is rev', async (t) => {
  const endpointDef = {
    mutation: {
      $direction: 'rev',
      response: 'response',
      'response.data': ['response.data.content.data', { $apply: 'entry' }], // Not relevant in a rev-mutation, so this is just for testing
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = actionWithResponse
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)

  const ret = await endpoint.mutateResponse(actionWithResponse)

  t.deepEqual(ret, expected)
})

// Tests -- mutateRequest

test('should mutate request with endpoint mutation', async (t) => {
  const endpointDef = {
    mutation: {
      payload: 'payload',
      'payload.data': ['payload.data.content.data', { $apply: 'entry' }],
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
  const ret = await endpoint.mutateRequest(action)

  t.deepEqual(ret, expected)
})

test('should mutate request with service mutation', async (t) => {
  const serviceMutation = [
    {
      $direction: 'rev',
      $flip: true,
      payload: {
        '.': 'payload',
        data: ['payload.data', { $transform: 'json' }],
      },
      meta: {
        '.': 'meta',
        options: {
          '.': 'meta.options',
          headers: {
            '.': 'meta.options.headers',
            'Content-Type': {
              $transform: 'value',
              value: 'application/json',
            },
          },
        },
      },
    },
    {
      $direction: 'rev',
      $flip: true,
      meta: {
        '.': 'meta',
        options: {
          '.': 'meta.options',
          uri: { $transform: 'generateUri', templatePath: 'meta.options.uri' },
        },
      },
    },
  ]
  const endpointDef = {
    mutation: {
      payload: 'payload',
      'payload.data': ['payload.data.content.data', { $apply: 'entry' }],
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
      options: { uri: '/entries/{payload.type}:{payload.id}' },
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
  const ret = await endpoint.mutateRequest(actionWithOptions)

  t.deepEqual(ret, expected)
})

test('should mutate request with root array path', async (t) => {
  const endpointDef = {
    mutation: {
      $flip: true,
      payload: {
        $modify: 'payload',
        data: ['payload.data', { $apply: 'entry3' }], // Has root path '[]'
      },
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
  const ret = await endpoint.mutateRequest(action)

  t.deepEqual(ret, expected)
})

test('should not mutate to service when no mutation pipeline', async (t) => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = action

  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions
  )(endpointDef)
  const ret = await endpoint.mutateRequest(action)

  t.deepEqual(ret, expected)
})

test('should not mutate request with mutation when direction is set to fwd', async (t) => {
  const endpointDef = {
    mutation: {
      $direction: 'fwd',
      payload: 'payload',
      'payload.data': ['payload.data.content', { $apply: 'entry' }],
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

  const ret = await endpoint.mutateRequest(actionWithoutRequestData)

  t.is(ret.payload.data, undefined)
})

test('should mutate request from service (incoming)', async (t) => {
  const endpointDef = {
    mutation: {
      payload: 'payload',
      'payload.data': ['payload.data.content.data', { $apply: 'entry' }],
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

  const ret = await endpoint.mutateRequest(incomingAction, isIncoming)

  const data = ret.payload.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
  t.is(data[0].$type, 'entry')
  t.is(data[0].title, 'Entry 1')
})

test('should mutate request with adapter', async (t) => {
  const endpointDef = {
    mutation: {
      payload: 'payload',
      'payload.data': ['payload.data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = {
    ...action,
    payload: {
      type: 'entry',
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
  }
  const serviceAdapters = [jsonAdapter]
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    undefined,
    undefined,
    serviceAdapters
  )(endpointDef)

  const ret = await endpoint.mutateRequest(action)

  t.deepEqual(ret, expected)
})

test('should mutate request with endpoint adapter', async (t) => {
  const endpointAdapters = [mockAdapter]
  const endpointDef = {
    mutation: {
      payload: 'payload',
      'payload.data': ['payload.data.content.data', { $apply: 'entry' }],
    },
    adapters: endpointAdapters,
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = {
    ...action,
    payload: {
      type: 'entry',
      data: JSON.stringify({
        content: {
          data: {
            items: [
              { key: 'ent1', header: 'Entry 1', activated: false }, // Mock adapter keeps only the first item
            ],
          },
        },
      }),
    },
  }
  const serviceAdapters = [jsonAdapter]
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    undefined,
    undefined,
    serviceAdapters
  )(endpointDef)

  const ret = await endpoint.mutateRequest(action)

  t.deepEqual(ret, expected)
})

test('should mutate request from service (incoming) with adapter', async (t) => {
  const endpointDef = {
    mutation: {
      payload: 'payload',
      'payload.data': ['payload.data.content.data', { $apply: 'entry' }],
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const incomingAction = {
    ...action,
    type: 'SET',
    payload: {
      type: 'entry',
      data: JSON.stringify({
        content: { data: { items: [{ key: 'ent1', header: 'Entry 1' }] } },
      }),
    },
  }
  const serviceAdapters = [jsonAdapter]
  const endpoint = createEndpoint(
    serviceId,
    serviceOptions,
    mapOptions,
    undefined,
    undefined,
    serviceAdapters
  )(endpointDef)
  const isIncoming = true

  const ret = await endpoint.mutateRequest(incomingAction, isIncoming)

  const data = ret.payload.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
  t.is(data[0].$type, 'entry')
  t.is(data[0].title, 'Entry 1')
})
