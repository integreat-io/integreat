import test from 'node:test'
import assert from 'node:assert/strict'
import mapTransform from 'map-transform'
import jsonAdapter from 'integreat-adapter-json'
import jsonTransformer from 'integreat-adapter-json/transformer.js'
import uriTransformer from 'integreat-adapter-uri/transformer.js'
import Schema from '../schema/Schema.js'
import Auth from './Auth.js'
import optionsAuth from '../authenticators/options.js'
import { isAction, isObject } from '../utils/is.js'
import createMapOptions from '../utils/createMapOptions.js'
import type { Action, TypedData, Adapter } from '../types.js'
import type { ServiceOptions } from './types.js'

import Endpoint from './Endpoint.js'

// Setup

const schemas = new Map()
schemas.set(
  'entry',
  new Schema({
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
)

const entryMapping = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    published: 'activated',
  },
  { $cast: 'entry' },
]

const entryMapping2 = [
  'items',
  {
    $iterate: true,
    id: 'key',
    title: 'title',
  },
  { $cast: 'entry' },
]

const entryMapping3 = [
  '[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
  },
  { $cast: 'entry' },
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
  shouldHaveToken,
  alwaysOk,
  json: jsonTransformer,
  uri: uriTransformer,
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
const options = { transporter: {} }

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
                    // Duplicate the array
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

test('should set id, allowRawRequest, allowRawResponse, and castWithoutDefaults on endpoint', () => {
  const endpointDef = {
    id: 'endpoint1',
    allowRawRequest: true,
    allowRawResponse: true,
    castWithoutDefaults: true,
  }

  const ret = new Endpoint(endpointDef, serviceId, options, mapTransform, {})

  assert.equal(ret.id, 'endpoint1')
  assert.equal(ret.allowRawRequest, true)
  assert.equal(ret.allowRawResponse, true)
  assert.equal(ret.castWithoutDefaults, true)
})

test('should expose given outgoing and incoming auth', () => {
  const endpointDef = {
    id: 'endpoint1',
    allowRawRequest: true,
    allowRawResponse: true,
    castWithoutDefaults: true,
  }
  const outgoingAuth = new Auth('outgoing', optionsAuth, { token: 's3cr3t' })
  const incomingAuth = [new Auth('incoming', optionsAuth, { token: 's4cr4t' })]

  const ret = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    {},
    undefined,
    undefined,
    undefined,
    outgoingAuth,
    incomingAuth,
  )

  assert.equal(ret.outgoingAuth, outgoingAuth)
  assert.equal(ret.incomingAuth, incomingAuth)
  assert.equal(ret.id, 'endpoint1')
})

test('should set match on endpoint', () => {
  const endpointDef = {
    id: 'endpoint1',
    match: { scope: 'member' },
  }

  const ret = new Endpoint(endpointDef, serviceId, options, mapTransform, {})

  assert.deepEqual(ret.match, { scope: 'member' })
})

// Tests -- isMatch

test('should return true when endpoint is a match to an action with conditions', async () => {
  const endpointDef = {
    match: {
      conditions: [
        { $transform: 'compare', path: 'payload.data.draft', match: false },
      ],
    },
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      data: { draft: false },
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  assert.equal(await endpoint.isMatch(action), true)
})

test('should return false when endpoint is not a match to an action with conditions', async () => {
  const endpointDef = {
    match: {
      conditions: [
        { $transform: 'compare', path: 'payload.data.draft', match: false },
      ],
    },
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  assert.equal(await endpoint.isMatch(action), false)
})

test('should return true when endpoint is a match to an action with filter', async () => {
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
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  assert.equal(await endpoint.isMatch(action), true)
})

test('should return false when no match to action', async () => {
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
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  assert.equal(await endpoint.isMatch(action), false)
})

// Tests -- validateAction

test('should return null when no validation', async () => {
  const endpointDef = {
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const ret = await endpoint.validateAction(action)

  assert.equal(ret, null)
})

test('should return null when validate is empty array', async () => {
  const endpointDef = {
    validate: [],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const ret = await endpoint.validateAction(action)

  assert.equal(ret, null)
})

test('should return null when validation passes', async () => {
  const endpointDef = {
    validate: [{ condition: 'payload.id' }],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const ret = await endpoint.validateAction(action)

  assert.equal(ret, null)
})

test('should return null when validation with several conditions passes', async () => {
  const endpointDef = {
    validate: [{ condition: 'payload.id' }, { condition: 'payload.type' }],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const ret = await endpoint.validateAction(action)

  assert.equal(ret, null)
})

test('should return badrequest response when validation fails', async () => {
  const endpointDef = {
    validate: [{ condition: 'payload.id' }],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      // No id
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const expectedResponse = {
    status: 'badrequest',
    error: 'Did not satisfy condition',
    origin: 'validate:service:accountStore:endpoint',
  }

  const ret = await endpoint.validateAction(action)

  assert.deepEqual(ret, expectedResponse)
})

test('should return badrequest response when one of several conditions fails', async () => {
  const endpointDef = {
    validate: [{ condition: 'payload.type' }, { condition: 'payload.id' }],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      // No id
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const expectedResponse = {
    status: 'badrequest',
    error: 'Did not satisfy condition',
    origin: 'validate:service:accountStore:endpoint',
  }

  const ret = await endpoint.validateAction(action)

  assert.deepEqual(ret, expectedResponse)
})

test('should return failResponse when provided', async () => {
  const endpointDef = {
    validate: [
      {
        condition: 'payload.id',
        failResponse: { status: 'error', error: 'This is no good' },
      },
    ],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      // No id
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const expectedResponse = {
    status: 'error',
    error: 'This is no good',
    origin: 'validate:service:accountStore:endpoint',
  }

  const ret = await endpoint.validateAction(action)

  assert.deepEqual(ret, expectedResponse)
})

test('should return response from several failed failResponse', async () => {
  const endpointDef = {
    validate: [
      {
        condition: 'payload.id',
        failResponse: { status: 'error', error: 'This is no good' },
      },
      {
        condition: 'payload.notMissing',
        failResponse: { status: 'notfound', error: 'Something is gone' },
      },
    ],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      // No id
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const expectedResponse = {
    status: 'error',
    error: '[error] This is no good | [notfound] Something is gone',
    origin: 'validate:service:accountStore:endpoint',
  }

  const ret = await endpoint.validateAction(action)

  assert.deepEqual(ret, expectedResponse)
})

test('should treat failResponse as error message when provided as a string', async () => {
  const endpointDef = {
    validate: [
      {
        condition: 'payload.id',
        failResponse: 'This is no good',
      },
    ],
    options: {},
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      // No id
    },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const expectedResponse = {
    status: 'badrequest',
    error: 'This is no good',
    origin: 'validate:service:accountStore:endpoint',
  }

  const ret = await endpoint.validateAction(action)

  assert.deepEqual(ret, expectedResponse)
})

// Tests -- mutate response

test('should mutate response from service with endpoint mutation', async () => {
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const before = Date.now()
  const ret = await endpoint.mutate(actionWithResponse, false)
  const after = Date.now()

  const data = (ret.response?.data as Record<string, unknown>[])[0]
  assert.equal(data.id, 'ent1')
  assert.equal(data.$type, 'entry')
  assert.equal(data.title, 'Entry 1')
  assert.equal(data.published, false)
  assert.equal((data.createdAt as Date).getTime() >= before, true)
  assert.equal((data.createdAt as Date).getTime() <= after, true)
  assert.equal(
    (data.createdAt as Date).getTime(),
    (data.updatedAt as Date).getTime(),
  )
})

test('should treat `mutate` as an alias of endpoint mutation', async () => {
  const endpointDef = {
    mutate: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const ret = await endpoint.mutate(actionWithResponse, false)

  assert.equal(ret.response?.status, 'ok', ret.response?.error)
  const data = ret.response?.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'ent1')
  assert.equal(data[0].$type, 'entry')
  assert.equal(data[0].title, 'Entry 1')
  assert.equal(data[0].published, false)
})

test('should run prepareOptions() on options before giving them to adapter', async () => {
  const prepareOptions = (options: ServiceOptions, serviceId: string) => ({
    ...options,
    serviceId,
    prepared: true,
  })
  const normalize = (action: Action, options: Record<string, unknown>) => ({
    ...action,
    response: {
      ...action.response,
      params: { serviceId: options.serviceId },
    },
  })
  const adapters = [{ ...jsonAdapter, id: 'json', prepareOptions, normalize }]
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expectedParams = {
    serviceId: 'accountStore', // We only get this param if the options was prepared before passing on to normalize()
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )

  const ret = await endpoint.mutate(actionWithResponse, false)

  assert.deepEqual(ret.response?.params, expectedParams)
})

test('should provide prepareOptions() with empty object when no adapter options', async () => {
  const prepareOptions = (options: ServiceOptions, _serviceId: string) =>
    options
  const normalize = (action: Action, options: Record<string, unknown>) => ({
    ...action,
    response: {
      ...action.response,
      params: options,
    },
  })
  const adapters = [{ ...jsonAdapter, id: 'json', prepareOptions, normalize }]
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )

  const ret = await endpoint.mutate(actionWithResponse, false)

  assert.deepEqual(ret.response?.params, {})
})

test('should mutate action props from response', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(actionWithProps, false)

  assert.equal(ret.response?.status, 'badrequest')
  assert.equal(ret.response?.error, 'Not valid')
  assert.equal((ret.response?.data as TypedData[]).length, 1)
  assert.deepEqual(ret.response?.paging, expectedPaging)
  assert.equal(ret.response?.params?.id, '7839')
})

test('should mutate response from service with service and endpoint mutations', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    serviceMutation,
  )
  const ret = await endpoint.mutate(actionWithProps, false)

  const data = ret.response?.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'ent1')
  assert.equal(ret.response?.status, 'badrequest')
  assert.equal(ret.response?.error, 'Too much')
})

test('should mutate response from service with service mutation only', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    serviceMutation,
  )
  const ret = await endpoint.mutate(actionWithProps, false)

  assert.equal(ret.response?.status, 'ok', ret.response?.error)
  const data = ret.response?.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'ent1')
})

test('should mutate response from service with service adapter', async () => {
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
  const adapters = [jsonAdapter]
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )

  const ret = await endpoint.mutate(actionWithJSON, false)

  assert.equal(ret.response?.status, 'ok', ret.response?.error)
  assert.equal(Array.isArray(ret.response?.data), true, 'Should be an array')
  assert.equal(
    isObject((ret.response?.data as TypedData[])[0]),
    true,
    'Should be an object',
  )
})

test('should mutate response from service with both service and endpoint adapters', async () => {
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
  const endpointAdapters = [mockAdapter]
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    serviceAdapters,
    endpointAdapters,
  )

  const ret = await endpoint.mutate(actionWithJSON, false)

  assert.equal(ret.response?.status, 'ok', ret.response?.error)
  assert.equal(Array.isArray(ret.response?.data), true, 'Should be an array')
  assert.equal((ret.response?.data as TypedData[]).length, 2) // Mock adapter duplicates the array
})

test('should run service mutation _before_ endpoint adapters', async () => {
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
  const endpointAdapters = [mockAdapter]
  const serviceMutation = {
    '.': '.',
    'response.data.content.data.items[0].header': { $value: 'Replaced title' },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    serviceMutation,
    serviceAdapters,
    endpointAdapters,
  )

  const ret = await endpoint.mutate(actionWithJSON, false)

  assert.equal(ret.response?.status, 'ok', ret.response?.error)
  assert.equal(Array.isArray(ret.response?.data), true, 'Should be an array')
  const data = ret.response?.data as TypedData[]
  assert.equal(data.length, 2) // Mock adapter duplicates the array
  assert.equal(data[0].title, 'Replaced title')
  assert.equal(data[1].title, 'Replaced title') // Will be 'Entry 1' if service mutation is run _after_ endpoint adapters
})

test('should mutate response from service with service adapter and no mutation pipeline', async () => {
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
  const adapters = [jsonAdapter]
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )
  const expectedData = {
    content: {
      data: {
        items: [{ key: 'ent1', header: 'Entry 1', title: 'The long title' }],
      },
    },
  }

  const ret = await endpoint.mutate(actionWithJSON, false)

  assert.equal(ret.response?.status, 'ok', ret.response?.error)
  assert.deepEqual(ret.response?.data, expectedData)
})

test('should return error when no action', async () => {
  const endpointDef = {
    mutation: {
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const expectedError = {
    name: 'Error',
    message: 'Endpoint mutation was run without action',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await assert.rejects(endpoint.mutate(undefined as any, false), expectedError)
})

test('should mutate response to service (incoming) with service adapter', async () => {
  const endpointDef = {
    mutation: {
      $direction: 'rev',
      response: {
        $modify: 'response',
        data: ['response.data.content.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }

  const adapters = [jsonAdapter]
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )
  const isRev = true
  const expectedData =
    '{"content":{"data":{"items":[{"key":null,"activated":false}]}}}'

  const ret = await endpoint.mutate(actionWithResponse, isRev)

  assert.equal(ret.response?.status, 'ok', ret.response?.error)
  assert.equal(ret.response?.data, expectedData)
})

test('should throw when mutations are applying unknown pipeline/mutation', async () => {
  const serviceMutation = [
    {
      response: {
        '.': 'response',
        data: ['response.data', { $apply: 'unknown' }, { $transform: 'json' }],
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
  const expectedError = {
    name: 'Error',
    message: "Failed to apply pipeline 'unknown'. Unknown pipeline",
  }

  assert.throws(
    () =>
      new Endpoint(
        endpointDef,
        serviceId,
        options,
        mapTransform,
        mapOptions,
        serviceMutation,
      ),
    expectedError,
  )
})

test('should keep action props not mapped from response', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(actionWithProps, false)

  assert.equal(ret.response?.status, 'error')
  assert.equal(ret.response?.error, 'Not valid')
  assert.equal((ret.response?.data as TypedData[]).length, 1)
})

test('should set status to error for response with an error', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(actionWithProps, false)

  assert.equal(ret.response?.status, 'error')
  assert.equal(ret.response?.error, 'Not valid')
})

test('should mutate to undefined from response when unknown path', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(actionWithResponse, false)

  assert.deepEqual(ret, expected)
})

test('should mutate to empty array from service when unknown path and expecting array', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(actionWithResponse, false)

  assert.deepEqual(ret, expected)
})

test('should not mutate from service when no mutation pipeline', async () => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = actionWithResponse

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(actionWithResponse, false)

  assert.deepEqual(ret, expected)
})

test('should not mutate response from service when direction is rev', async () => {
  const endpointDef = {
    mutation: {
      $direction: 'rev',
      response: 'response',
      'response.data': ['response.data.content.data', { $apply: 'entry' }], // Not relevant in a rev-mutation, so this is just for testing
    },
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = actionWithResponse
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const ret = await endpoint.mutate(actionWithResponse, false)

  assert.deepEqual(ret, expected)
})

// Tests -- mutate request

test('should mutate request with endpoint mutation', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(action, true)

  assert.deepEqual(ret, expected)
})

test('should mutate request with service mutation', async () => {
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
          uri: { $transform: 'uri', templatePath: 'meta.options.uri' },
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    serviceMutation,
  )
  const ret = await endpoint.mutate(actionWithOptions, true)

  assert.deepEqual(ret, expected)
})

test('should mutate request with root array path', async () => {
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

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(action, true)

  assert.deepEqual(ret, expected)
})

test('should not mutate to service when no mutation pipeline', async () => {
  const endpointDef = {
    options: { uri: 'http://some.api/1.0' },
  }
  const expected = action

  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const ret = await endpoint.mutate(action, true)

  assert.deepEqual(ret, expected)
})

test('should not mutate request with mutation when direction is set to fwd', async () => {
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
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )

  const ret = await endpoint.mutate(actionWithoutRequestData, true)

  assert.equal(ret.payload.data, undefined)
})

test('should mutate request from service (incoming)', async () => {
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
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
  )
  const isRev = false

  const ret = await endpoint.mutate(incomingAction, isRev)

  const data = ret.payload.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'ent1')
  assert.equal(data[0].$type, 'entry')
  assert.equal(data[0].title, 'Entry 1')
})

test('should mutate request with adapter', async () => {
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
      headers: { 'Content-Type': 'application/json' },
    },
    response: undefined,
  }
  const adapters = [jsonAdapter]
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )

  const ret = await endpoint.mutate(action, true)

  assert.deepEqual(ret, expected)
})

test('should mutate request with several adapters', async () => {
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
              { key: 'ent1', header: 'Entry 1', activated: false }, // Mock adapter keeps only the first item
            ],
          },
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    },
    response: undefined,
  }
  const adapters = [jsonAdapter, mockAdapter]
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )

  const ret = await endpoint.mutate(action, true)

  assert.deepEqual(ret, expected)
})

test('should mutate request from service (incoming) with adapter', async () => {
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
  const adapters = [jsonAdapter]
  const endpoint = new Endpoint(
    endpointDef,
    serviceId,
    options,
    mapTransform,
    mapOptions,
    undefined,
    adapters,
  )
  const isRev = false

  const ret = await endpoint.mutate(incomingAction, isRev)

  const data = ret.payload.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'ent1')
  assert.equal(data[0].$type, 'entry')
  assert.equal(data[0].title, 'Entry 1')
})

// Tests -- sortAndPrepare

test('should return endpoints defs in right order', () => {
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
  const expected = [endpointDefs[1], endpointDefs[0]]

  const endpoints = Endpoint.sortAndPrepare(endpointDefs)

  assert.deepEqual(endpoints, expected)
})

test('should treat scope: all as no scope', () => {
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
  const expected = [
    endpointDefs[1],
    {
      id: 'endpoint1',
      match: { type: 'entry' }, // No scope
      options: { uri: 'http://test.api/1' },
    },
  ]

  const endpoints = Endpoint.sortAndPrepare(endpointDefs)

  assert.deepEqual(endpoints, expected)
})

// Tests -- findMatchingEndpoint

test('should find matching endpoint', async () => {
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

  const endpoints = Endpoint.sortAndPrepare(endpointDefs).map(
    (defs) => new Endpoint(defs, serviceId, options, mapTransform, mapOptions),
  )
  const mapping = await Endpoint.findMatchingEndpoint(endpoints, action)

  assert.equal((mapping as Endpoint).id, 'endpoint2')
})

test('should match by id', async () => {
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

  const endpoints = Endpoint.sortAndPrepare(endpointDefs).map(
    (defs) => new Endpoint(defs, serviceId, options, mapTransform, mapOptions),
  )
  const mapping = await Endpoint.findMatchingEndpoint(endpoints, action)

  assert.equal((mapping as Endpoint).id, 'endpoint2')
})

test('should match scope all', async () => {
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

  const endpoints = Endpoint.sortAndPrepare(endpointDefs).map(
    (defs) => new Endpoint(defs, serviceId, options, mapTransform, mapOptions),
  )
  const mapping = await Endpoint.findMatchingEndpoint(endpoints, action)

  assert.equal((mapping as Endpoint).id, 'endpoint1')
})

test('should treat scope all as no scope', async () => {
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

  const endpoints = Endpoint.sortAndPrepare(endpointDefs).map(
    (defs) => new Endpoint(defs, serviceId, options, mapTransform, mapOptions),
  )
  const mapping = await Endpoint.findMatchingEndpoint(endpoints, action)

  assert.equal((mapping as Endpoint).id, 'endpoint2')
})
