import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import jsonAdapter from 'integreat-adapter-json'
import jsonServiceDef from './tests/helpers/jsonServiceDef.js'
import user from './tests/helpers/defs/schemas/user.js'
import resources from './tests/helpers/resources/index.js'
import { QUEUE_SYMBOL } from './handlers/index.js'
import {
  IdentType,
  Definitions,
  Resources,
  Action,
  HandlerDispatch,
  TypedData,
  Transporter,
} from './types.js'

import Instance from './Instance.js'

// Setup

const services = [
  {
    id: 'entries',
    ...jsonServiceDef,
    transporter: 'http',
    endpoints: [
      {
        options: { uri: 'http://some.api/entries' },
        mutation: {
          response: 'response',
          'response.data': ['response.data', { $apply: 'entries_entry' }],
        },
      },
    ],
  },
  {
    id: 'queue',
    transporter: 'http', // We use http here for convenience, as this service is never used
    endpoints: [],
  },
]

const schemas = [
  {
    id: 'entry',
    service: 'entries',
    shape: {
      title: 'string',
      text: 'string',
      sections: 'string[]',
      author: 'user',
      createdAt: 'date',
      updatedAt: 'date',
    },
    access: 'all',
  },
  {
    id: 'article',
    shape: {
      title: 'string',
    },
    access: 'all',
  },
  user,
]

const mutations = {
  ['entries_entry']: [
    {
      $iterate: true,
      id: 'key',
      title: ['headline', { $transform: 'exclamate' }],
      text: { $alt: ['body', 'text'] },
      'sections[]': ['type', { $transform: 'map', dictionary: 'section' }],
      unknown: [],
      author: 'creator',
      createdAt: 'date',
    },
    { $cast: 'entry' },
  ],
}

const dictionaries = {
  section: [['newsitem', 'news'] as const, ['fashionblog', 'fashion'] as const],
}

const resourcesWithTransformer = {
  ...resources,
  transformers: {
    ...resources.transformers,
    exclamate: () => () => (value: unknown) =>
      typeof value === 'string' ? `${value}!` : value,
  },
} as unknown as Resources

// Tests

test('should return object with id, dispatch, on, schemas, services, identType, and queueService', () => {
  const identConfig = { type: 'account' }
  const great = new Instance(
    {
      id: 'great1',
      services,
      schemas,
      mutations,
      identConfig,
      queueService: 'queue',
    },
    resourcesWithTransformer,
  )

  assert.equal(great.id, 'great1')
  assert.equal(typeof great.dispatch, 'function')
  assert.equal(typeof great.on, 'function')
  assert.equal(!!great.schemas, true)
  assert.equal(!!great.schemas.get('entry'), true)
  assert.equal(!!great.services, true)
  assert.equal(!!great.services.entries, true)
  assert.equal(great.identType, 'account')
  assert.equal(great.queueService, 'queue')
})

test('should throw when no services', () => {
  assert.throws(() => {
    new Instance(
      { schemas } as unknown as Definitions,
      resourcesWithTransformer,
    )
  })
})

test('should throw when no schemas', () => {
  assert.throws(() => {
    new Instance(
      { services } as unknown as Definitions,
      resourcesWithTransformer,
    )
  })
})

test('should throw when queueService is not referencing an included service', () => {
  const identConfig = { type: 'account' }
  const expectedError = { name: 'TypeError' }

  assert.throws(() => {
    new Instance(
      {
        id: 'great1',
        services,
        schemas,
        mutations,
        identConfig,
        queueService: 'unknown',
      },
      resourcesWithTransformer,
    )
  }, expectedError)
})

test('should dispatch with resources', async () => {
  const action = { type: 'TEST', payload: {} }
  const handler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { TEST: handler }
  const identConfig = { type: 'account' }
  const expectedOptions = { identConfig, queueService: 'queue' }

  const great = new Instance(
    { services, schemas, mutations, identConfig, queueService: 'queue' },
    { ...resourcesWithTransformer, handlers },
  )
  await great.dispatch(action)

  assert.equal(handler.callCount, 1) // If the action handler was called, the action was dispatched
  const resource = handler.args[0][1]
  assert.deepEqual(resource.options, expectedOptions)
})

test('should expose dispatched actions count', async () => {
  const action = { type: 'TEST', payload: {} }
  const handler = async function testHandler() {
    await new Promise((resolve) => setTimeout(resolve, 100, undefined))
    return { status: 'ok' }
  }
  const handlers = { TEST: handler }
  const identConfig = { type: 'account' }

  const great = new Instance(
    { services, schemas, mutations, identConfig, queueService: 'queue' },
    { ...resourcesWithTransformer, handlers },
  )
  const count0 = great.dispatchedCount
  great.dispatch(action)
  const count1 = great.dispatchedCount
  great.dispatch(action)
  const count2 = great.dispatchedCount
  const p = great.dispatch(action)

  assert.equal(count0, 0)
  assert.equal(count1, 1)
  assert.equal(count2, 2)
  await p
  assert.equal(great.dispatchedCount, 0)
})

test('should dispatch with builtin action handler', async () => {
  const send = sinon.stub().resolves({ status: 'ok', data: '[]' })
  const resourcesWithTransAndSend = {
    ...resourcesWithTransformer,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send,
      } as Transporter,
    },
  }
  const action = { type: 'GET', payload: { type: 'entry' } }

  const great = new Instance(
    { services, schemas, mutations },
    resourcesWithTransAndSend,
  )
  await great.dispatch(action)

  assert.equal(send.callCount, 1) // If the send method was called, the GET action was dispatched
})

test('should use adapters', async () => {
  const send = sinon
    .stub()
    .resolves({ status: 'ok', data: '[{"key":"ent1","headline":"Entry 1"}]' })
  const servicesWithJson = [
    {
      ...services[0],
      adapters: ['json'], // Lookup with id
    },
  ]
  const resourcesWithTransSendAndAdapters = {
    ...resourcesWithTransformer,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send,
      } as Transporter,
    },
    adapters: {
      json: jsonAdapter,
    },
  }
  const action = { type: 'GET', payload: { type: 'entry' } }

  const great = new Instance(
    { services: servicesWithJson, schemas, mutations },
    resourcesWithTransSendAndAdapters,
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'ent1')
  assert.equal(data[0].title, 'Entry 1!')
  assert.equal(data[0].$type, 'entry')
})

test('should set adapter id', async () => {
  const send = sinon
    .stub()
    .resolves({ status: 'ok', data: '[{"key":"ent1","headline":"Entry 1"}]' })
  const servicesWithJson = [
    {
      ...services[0],
      adapters: ['json'], // Lookup with id
      options: { adapters: { json: {} } },
    },
  ]
  const resourcesWithTransSendAndAdapters = {
    ...resourcesWithTransformer,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send,
      } as Transporter,
    },
    adapters: {
      json: {
        ...jsonAdapter,
        id: undefined, // Just to make sure there's no preset id
        prepareOptions: (options: Record<string, unknown>) => ({
          ...options,
          setByPrepare: true, // This is only invoked when the adapter has an id
        }),
        normalize: (action: Action, options: Record<string, unknown>) => ({
          ...action,
          response: { ...action.response, params: options }, // Pass on options as params
        }),
      },
    },
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { options: {} },
  }

  const great = new Instance(
    { services: servicesWithJson, schemas, mutations },
    resourcesWithTransSendAndAdapters,
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(ret.params?.setByPrepare, true)
})

test('should throw when trying to use an unknown transporter', async () => {
  const servicesWithUnknownTransporter = [
    {
      ...services[0],
      transporter: 'unknown',
    },
  ]
  const expectedError = {
    name: 'TypeError',
    message: "Service 'entries' references unknown transporter 'unknown'",
  }

  assert.throws(
    () =>
      new Instance(
        { services: servicesWithUnknownTransporter, schemas, mutations },
        resourcesWithTransformer,
      ),
    expectedError,
  )
})

test('should call middleware', async () => {
  const action = { type: 'TEST', payload: {} }
  const otherAction = sinon.stub().resolves({ status: 'ok' })
  const handlers = {
    OTHER: otherAction,
    TEST: async (action: Action) => ({
      ...action.response,
      status: 'noaction',
    }),
  }
  const middleware = [
    (next: HandlerDispatch) => async (_action: Action) =>
      next({ type: 'OTHER', payload: {} }),
  ]

  const great = new Instance(
    { services, schemas, mutations },
    { ...resourcesWithTransformer, handlers },
    middleware,
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(otherAction.callCount, 1) // If other action handler was called, middleware changed action
})

test('should mutate data', async () => {
  const data0 = {
    key: 'ent1',
    headline: 'Entry 1',
    body: 'The first article',
    type: 'newsitem',
    date: '2019-10-11T18:43:00Z',
  }
  const resourcesWithTransAndSend = {
    ...resourcesWithTransformer,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send: async (action: Action) => ({
          ...action.response,
          status: 'ok',
          data: JSON.stringify([data0]),
        }),
      } as Transporter,
    },
  }

  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = new Instance(
    { services, schemas, mutations, dictionaries },
    resourcesWithTransAndSend,
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  const data = ret.data as Record<string, unknown>[]
  assert.equal(data.length, 1)
  const item = data[0]
  assert.equal(item.id, 'ent1')
  assert.equal(item.title, 'Entry 1!')
  assert.equal(item.text, 'The first article')
  assert.deepEqual(item.sections, ['news'])
  assert.deepEqual(item.createdAt, new Date('2019-10-11T18:43:00Z'))
})

test('should use provided nonvalues', async () => {
  const nonvalues = [null, undefined]
  const data0 = {
    key: 'ent1',
    headline: 'Entry 1',
    body: '',
    text: 'This will be used if empty string is a nonvalue',
  }
  const resourcesWithTransAndSend = {
    ...resourcesWithTransformer,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send: async (action: Action) => ({
          ...action.response,
          status: 'ok',
          data: JSON.stringify([data0]),
        }),
      } as Transporter,
    },
  }

  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = new Instance(
    { services, schemas, mutations, dictionaries, nonvalues },
    resourcesWithTransAndSend,
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  const item = (ret.data as Record<string, unknown>[])[0]
  assert.equal(item.id, 'ent1')
  assert.equal(item.text, '')
})

test('should provided map-transform', async () => {
  const mockMapTransform = () => async (data: unknown) => data // Don't transform anything
  const resourcesWithMapTransform = {
    ...resourcesWithTransformer,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send: async (action: Action) => ({
          ...action.response,
          status: 'ok',
          data: JSON.stringify({ id: 'ent1' }),
        }),
      } as Transporter,
    },
    mapTransform: mockMapTransform,
  }

  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = new Instance(
    { services, schemas, mutations, dictionaries },
    resourcesWithMapTransform,
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(ret.data, undefined) // When we get `undefined`, we know nothing was transformed, i.e. our map-transform mock was used
})

test('should dispatch scheduled', async () => {
  const queueStub = sinon.stub().resolves({ status: 'queued' })
  const handlers = { [QUEUE_SYMBOL]: queueStub }
  const jobs = [
    {
      id: 'action1',
      cron: '45 * * * *',
      action: { type: 'GET', payload: { type: 'entry' } },
    },
  ]
  const fromDate = new Date('2021-05-11T14:32Z')
  const toDate = new Date('2021-05-11T14:59Z')
  const expected = [
    {
      type: 'RUN',
      payload: { jobId: 'action1' },
      response: {
        status: 'queued',
        origin: 'dispatch',
        access: { ident: { id: 'scheduler', type: IdentType.Scheduler } },
      },
      meta: {
        ident: { id: 'scheduler', type: IdentType.Scheduler },
        queue: true,
      },
    },
  ]

  const great = new Instance(
    { services, schemas, mutations, jobs, queueService: 'queue' },
    { ...resourcesWithTransformer, handlers },
  )
  const ret = await great.dispatchScheduled(fromDate, toDate)

  assert.deepEqual(ret, expected)
})

test('should generate id when job def is missing one', async () => {
  const queueStub = sinon.stub().resolves({ status: 'queued' })
  const handlers = { [QUEUE_SYMBOL]: queueStub }
  const jobs = [
    {
      // No id
      cron: '45 * * * *',
      action: { type: 'GET', payload: { type: 'entry' } },
    },
  ]
  const fromDate = new Date('2021-05-11T14:32Z')
  const toDate = new Date('2021-05-11T14:59Z')

  const great = new Instance(
    { services, schemas, mutations, jobs, queueService: 'queue' },
    { ...resourcesWithTransformer, handlers },
  )
  const ret = await great.dispatchScheduled(fromDate, toDate)

  assert.equal(ret.length, 1)
  assert.equal(ret[0].type, 'RUN')
  assert.equal(typeof ret[0].payload.jobId, 'string')
  assert.equal((ret[0].payload.jobId as string).length, 21)
})

test('should skip jobs without schedule', async () => {
  const jobs = [{ id: 'someAction', action: { type: 'TEST', payload: {} } }]
  const fromDate = new Date('2021-05-11T14:32Z')
  const toDate = new Date('2021-05-11T14:59Z')

  const great = new Instance(
    { services, schemas, mutations, jobs },
    resourcesWithTransformer,
  )
  const ret = await great.dispatchScheduled(fromDate, toDate)

  assert.deepEqual(ret, [])
})

test('should set up RUN handler with jobs', async () => {
  const handler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { TEST: handler }
  const jobs = [
    {
      id: 'theJob',
      action: { type: 'TEST', payload: {} },
      mutation: { 'payload.timestamp': { $transform: 'now' } },
    },
  ]
  const nowDate = new Date()
  const action = {
    type: 'RUN',
    payload: { jobId: 'theJob' },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }

  const great = new Instance(
    { services, schemas, mutations, jobs },
    {
      ...resourcesWithTransformer,
      handlers,
      transformers: {
        ...resourcesWithTransformer.transformers,
        now: () => () => () => nowDate,
      },
    },
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(handler.callCount, 1)
  const dispatchedAction = handler.args[0][0]
  assert.equal(dispatchedAction.type, 'TEST')
  assert.deepEqual(dispatchedAction.payload, { timestamp: nowDate })
  assert.deepEqual(dispatchedAction.meta.ident, { id: 'johnf' })
  assert.equal(dispatchedAction.meta.cid, '23456')
  assert.equal(dispatchedAction.meta.jobId, 'theJob')
})

test('should use auth', async () => {
  const authenticators = {
    mock: {
      authenticate: async (options: Record<string, unknown> | null) => ({
        status: options?.status as string,
      }),
      isAuthenticated: () => false,
      authentication: {},
    },
  }
  const resourcesWithTransSendAndAuth = {
    ...resourcesWithTransformer,
    authenticators,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send: async () => ({ status: 'ok', data: '[]' }),
      } as Transporter,
    },
  }
  const authServices = [
    {
      ...services[0],
      auth: 'mauth',
    },
  ]
  const auths = [
    {
      id: 'mauth',
      authenticator: 'mock',
      options: { status: 'refused' },
    },
  ]
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = new Instance(
    { services: authServices, schemas, mutations, auths },
    resourcesWithTransSendAndAuth,
  )
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'noaccess', ret.error)
})

test('should set id on authenticators', async () => {
  const dispatchMock = sinon.stub().resolves({ status: 'ok' })
  const authenticators = {
    mock: {
      // No id
      authenticate: async (options: Record<string, unknown> | null) => ({
        status: options?.status as string,
      }),
      isAuthenticated: () => false,
      authentication: {},
    },
  }
  const action = { type: 'GET', payload: { type: 'entry' } }
  const resourcesWithTransSendAndAuth: Resources = {
    ...resourcesWithTransformer,
    authenticators,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters?.http,
        send: async () => ({ status: 'ok', data: '[]' }),
        shouldListen: () => true,
        listen: async (_dispatch, _connect, authenticate) => {
          return await authenticate({ status: 'granted' }, action)
          // We return auth response right away, as we know it will fail
        },
      } as Transporter,
    },
  }
  const authServices = [
    {
      ...services[0],
      auth: { outgoing: true, incoming: 'mauth' },
    },
  ]
  const auths = [
    {
      id: 'mauth',
      authenticator: 'mock',
      options: { status: 'refused' },
    },
  ]

  const great = new Instance(
    { services: authServices, schemas, mutations, auths },
    resourcesWithTransSendAndAuth,
  )
  const ret = await great.services.entries.listen(dispatchMock)

  assert.equal(ret.status, 'autherror', ret.error)
  assert.equal(
    ret.error,
    "Could not authenticate. Authenticator 'mock' doesn't support validation", // The fact that we get `'mock'` here means that the authenticator id was set
  )
})

test('should throw when trying to use an unknown authenticator', async () => {
  const authServices = [
    {
      ...services[0],
      auth: 'mauth',
    },
  ]
  const auths = [
    {
      id: 'mauth',
      authenticator: 'unknown',
      options: {},
    },
  ]
  const expectedError = {
    name: 'Error',
    message:
      "Auth config 'mauth' references an unknown authenticator id 'unknown'",
  }

  assert.throws(
    () =>
      new Instance(
        { services: authServices, schemas, mutations, auths },
        resourcesWithTransformer,
      ),
    expectedError,
  )
})

test('should have listen method', async () => {
  const great = new Instance(
    { services, schemas, mutations },
    resourcesWithTransformer,
  )

  assert.equal(typeof great.listen, 'function')
})

test('should have stopListening method', async () => {
  const great = new Instance(
    { services, schemas, mutations },
    resourcesWithTransformer,
  )

  assert.equal(typeof great.stopListening, 'function')
})

test('should have close method', async () => {
  const great = new Instance(
    { services, schemas, mutations },
    resourcesWithTransformer,
  )

  assert.equal(typeof great.close, 'function')
})
