/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon from 'sinon'
import { jsonServiceDef } from './tests/helpers/json.js'
import builtInMutations from './mutations/index.js'
import user from './tests/helpers/defs/schemas/user.js'
import resources from './tests/helpers/resources/index.js'
import type { Action, HandlerDispatch } from './types.js'

import create, { Definitions, Resources } from './create.js'

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
  ...builtInMutations,
  ['entries_entry']: [
    {
      $iterate: true,
      id: 'key',
      title: ['headline', { $transform: 'exclamate' }],
      text: 'body',
      'sections[]': ['type', { $transform: 'map', dictionary: 'section' }],
      unknown: [],
      author: 'creator',
      createdAt: 'date',
    },
    { $apply: 'cast_entry' },
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

test('should return object with dispatch, on, schemas, services, identType, and queueService', (t) => {
  const identConfig = { type: 'account' }
  const great = create(
    { services, schemas, mutations, identConfig, queueService: 'queue' },
    resourcesWithTransformer
  )

  t.is(typeof great.dispatch, 'function')
  t.is(typeof great.on, 'function')
  t.truthy(great.schemas)
  t.truthy(great.schemas.entry)
  t.truthy(great.services)
  t.truthy(great.services.entries)
  t.is(great.identType, 'account')
  t.is(great.queueService, 'queue')
})

test('should throw when no services', (t) => {
  t.throws(() => {
    create({ schemas } as unknown as Definitions, resourcesWithTransformer)
  })
})

test('should throw when no schemas', (t) => {
  t.throws(() => {
    create({ services } as unknown as Definitions, resourcesWithTransformer)
  })
})

test('should dispatch with resources', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handler = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
  const handlers = { TEST: handler }
  const identConfig = { type: 'account' }
  const expectedOptions = { identConfig, queueService: 'queue' }

  const great = create(
    { services, schemas, mutations, identConfig, queueService: 'queue' },
    { ...resourcesWithTransformer, handlers }
  )
  await great.dispatch(action)

  t.is(handler.callCount, 1) // If the action handler was called, the action was dispatched
  const resource = handler.args[0][1]
  t.deepEqual(resource.options, expectedOptions)
})

test('should dispatch with builtin action handler', async (t) => {
  const send = sinon.stub().resolves({
    type: 'GET',
    payload: {},
    response: { status: 'ok', data: '[]' },
  })
  const resourcesWithTransAndSend = {
    ...resourcesWithTransformer,
    transporters: {
      ...resourcesWithTransformer.transporters,
      http: {
        ...resourcesWithTransformer.transporters!.http,
        send,
      },
    },
  }
  const action = { type: 'GET', payload: { type: 'entry' } }

  const great = create(
    { services, schemas, mutations },
    resourcesWithTransAndSend
  )
  await great.dispatch(action)

  t.is(send.callCount, 1) // If the send method was called, the GET action was dispatched
})

test('should call middleware', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const otherAction = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
  const handlers = {
    OTHER: otherAction,
    TEST: async (action: Action) => ({
      ...action,
      response: { ...action.response, status: 'noaction' },
    }),
  }
  const middleware = [
    (next: HandlerDispatch) => async (_action: Action) =>
      next({ type: 'OTHER', payload: {} }),
  ]

  const great = create(
    { services, schemas, mutations },
    { ...resourcesWithTransformer, handlers },
    middleware
  )
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(otherAction.callCount, 1) // If other action handler was called, middleware changed action
})

test('should map data', async (t) => {
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
        ...resourcesWithTransformer.transporters!.http,
        send: async (action: Action) => ({
          ...action.response,
          status: 'ok',
          data: JSON.stringify([data0]),
        }),
      },
    },
  }

  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = create(
    { services, schemas, mutations, dictionaries },
    resourcesWithTransAndSend
  )
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as Record<string, unknown>[]
  t.is(data.length, 1)
  const item = data[0]
  t.is(item.id, 'ent1')
  t.is(item.title, 'Entry 1!')
  t.is(item.text, 'The first article')
  t.deepEqual(item.sections, ['news'])
  t.deepEqual(item.createdAt, new Date('2019-10-11T18:43:00Z'))
})

test('should dispatch scheduled', async (t) => {
  const handler = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
  const handlers = { TEST: handler }
  const jobs = [
    { schedules: [{ m: [45] }], action: { type: 'TEST', payload: {} } },
  ]
  const fromDate = new Date('2021-05-11T14:32Z')
  const toDate = new Date('2021-05-11T14:59Z')

  const great = create(
    { services, schemas, mutations, jobs },
    { ...resourcesWithTransformer, handlers }
  )
  await great.dispatchScheduled(fromDate, toDate)

  t.is(handler.callCount, 1) // If the action handler was called, the action was dispatched
})

test('should skip jobs without schedule', async (t) => {
  const handler = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
  const handlers = { TEST: handler }
  const jobs = [{ id: 'someAction', action: { type: 'TEST', payload: {} } }]
  const fromDate = new Date('2021-05-11T14:32Z')
  const toDate = new Date('2021-05-11T14:59Z')

  const great = create(
    { services, schemas, mutations, jobs },
    { ...resourcesWithTransformer, handlers }
  )
  await great.dispatchScheduled(fromDate, toDate)

  t.is(handler.callCount, 0)
})

test('should set up RUN handler with jobs', async (t) => {
  const handler = sinon
    .stub()
    .resolves({ type: 'GET', payload: {}, response: { status: 'ok' } })
  const jobs = [
    {
      id: 'theJob',
      action: { type: 'TEST', payload: {} },
      mutation: { 'payload.timestamp': { $transform: 'now' } },
    },
  ]
  const nowDate = new Date()
  const transformers = { now: () => () => () => nowDate }
  const handlers = { TEST: handler }
  const action = {
    type: 'RUN',
    payload: { jobId: 'theJob' },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }
  const expected = {
    type: 'TEST',
    payload: { timestamp: nowDate },
    meta: { ident: { id: 'johnf' }, cid: '23456', jobId: 'theJob' },
  }

  const great = create(
    { services, schemas, mutations, jobs },
    { ...resourcesWithTransformer, handlers, transformers }
  )
  await great.dispatch(action)

  t.is(handler.callCount, 1)
  t.deepEqual(handler.args[0][0], expected)
})

test('should use auth', async (t) => {
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
        ...resourcesWithTransformer.transporters!.http,
        send: async () => ({ status: 'ok', data: '[]' }),
      },
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

  const great = create(
    { services: authServices, schemas, mutations, auths },
    resourcesWithTransSendAndAuth
  )
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
})

test('should throw when trying to use an unknown authenticator', async (t) => {
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

  const error = t.throws(() =>
    create(
      { services: authServices, schemas, mutations, auths },
      resourcesWithTransformer
    )
  )

  t.true(error instanceof Error)
  t.is(
    error?.message,
    "Auth config 'mauth' references an unknown authenticator id 'unknown'"
  )
})

test('should have listen method', async (t) => {
  const great = create(
    { services, schemas, mutations },
    resourcesWithTransformer
  )

  t.is(typeof great.listen, 'function')
})

test('should have close method', async (t) => {
  const great = create(
    { services, schemas, mutations },
    resourcesWithTransformer
  )

  t.is(typeof great.close, 'function')
})
