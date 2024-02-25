import test from 'ava'
import sinon from 'sinon'
import httpTransporter from 'integreat-transporter-http'
import Service from './service/Service.js'
import Schema from './schema/Schema.js'
import { QUEUE_SYMBOL } from './handlers/index.js'
import type {
  Action,
  Middleware,
  ActionHandler,
  ActionHandlerResources,
} from './types.js'

import dispatch from './dispatch.js'
import createMapOptions from './utils/createMapOptions.js'

// Setup

const schemas = new Map()
const entrySchema = new Schema(
  {
    id: 'entry',
    plural: 'entries',
    shape: {
      id: 'string',
      title: 'string',
    },
    access: 'auth',
  },
  schemas,
)
schemas.set('entry', entrySchema)

const mapOptions = createMapOptions(schemas)

const services = {
  api: new Service(
    {
      id: 'api',
      transporter: 'http',
      auth: true,
      options: {
        transporter: { uri: 'http://some.api/1.0' },
        adapters: { json: { someOtherFlag: true } },
        someFlag: true,
      },
      endpoints: [
        {
          id: 'incomingEntry',
          match: { type: 'entry', incoming: true },
          validate: [
            {
              condition: {
                $transform: 'compare',
                path: 'payload.id',
                not: true,
                match: 'ent99',
              },
              failResponse: {
                status: 'noaccess',
                error: '99 is off limits!',
              },
            },
          ],
          mutation: [
            {
              $direction: 'from',
              payload: {
                $modify: 'payload',
                data: 'payload.data',
                uri: {
                  $alt: ['meta.options.uri', 'meta.options.transporter.uri'],
                }, // None of these should be available
                flag: 'meta.options.someFlag',
              },
              meta: {
                $modify: 'meta',
                queue: { $value: 1708201154626 },
              },
            },
            {
              $direction: 'to',
              $flip: true,
              response: {
                $modify: 'response',
                data: 'response.data[0]',
                params: {
                  flag: 'meta.options.someFlag',
                },
              },
            },
          ],
        },
      ],
    },
    { mapOptions, schemas, transporters: { http: httpTransporter } },
  ),
}

const options = {}
const actionIds = new Set<string>()
const resources = { services, schemas, options, actionIds }

// Tests

test('should route to relevant action handler', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const handlers = {
    GET: async () => ({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }),
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', type: 'entry' }],
    access: { ident: { id: 'johnf' } },
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.deepEqual(ret, expected)
})

test('should route action with queue flag to queue handler', async (t) => {
  const options = { queueService: 'queue' }
  const action = {
    type: 'SET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const setHandler = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] })
  const queueHandler = sinon.stub().resolves({ status: 'queued' })
  const handlers = {
    SET: setHandler,
    [QUEUE_SYMBOL]: queueHandler,
  }

  const ret = await dispatch({ ...resources, options, handlers })(action)

  t.is(ret.status, 'queued')
  t.is(setHandler.callCount, 0)
  t.is(queueHandler.callCount, 1)
  const handlerAction = queueHandler.args[0][0]
  t.true(handlerAction.meta?.queue)
})

test('should route action with queue timestamp to queue handler', async (t) => {
  const options = { queueService: 'queue' }
  const action = {
    type: 'SET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, queue: 1708201154626 },
  }
  const setHandler = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] })
  const queueHandler = sinon.stub().resolves({ status: 'queued' })
  const handlers = {
    SET: setHandler,
    [QUEUE_SYMBOL]: queueHandler,
  }

  const ret = await dispatch({ ...resources, options, handlers })(action)

  t.is(ret.status, 'queued')
  t.is(setHandler.callCount, 0)
  t.is(queueHandler.callCount, 1)
  const handlerAction = queueHandler.args[0][0]
  t.is(handlerAction.meta?.queue, 1708201154626)
})

test('should not route to queue handler when no queue service', async (t) => {
  const options = { queueService: undefined }
  const action = {
    type: 'SET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const setHandler = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] })
  const queueHandler = sinon.stub().resolves({ status: 'queued' })
  const handlers = {
    SET: setHandler,
    [QUEUE_SYMBOL]: queueHandler,
  }

  const ret = await dispatch({ ...resources, options, handlers })(action)

  t.is(ret.status, 'ok')
  t.is(queueHandler.callCount, 0)
  t.is(setHandler.callCount, 1)
  const handlerAction = setHandler.args[0][0]
  t.falsy(handlerAction.meta?.queue)
})

test('should set dispatchedAt meta', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const before = Date.now()
  const ret = await dispatch({ ...resources, handlers })(action)
  const after = Date.now()

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(typeof calledAction.meta?.dispatchedAt, 'number')
  t.true((calledAction.meta?.dispatchedAt as number) >= before)
  t.true((calledAction.meta?.dispatchedAt as number) <= after)
})

test('should override any present dispatchedAt meta', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { dispatchedAt: new Date('2022-12-01T18:43:11Z').getTime() },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const before = Date.now()
  const ret = await dispatch({ ...resources, handlers })(action)
  const after = Date.now()

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(typeof calledAction.meta?.dispatchedAt, 'number')
  t.true((calledAction.meta?.dispatchedAt as number) >= before)
  t.true((calledAction.meta?.dispatchedAt as number) <= after)
})

test('should remove auth object in meta if set', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { auth: { token: '0ld4uTh' } },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ ...resources, handlers })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(calledAction.meta?.auth, undefined)
})

test('should set id and cid in meta when not already set', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ ...resources, handlers })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(typeof calledAction.meta?.id, 'string')
  t.is(calledAction.meta?.cid, calledAction.meta?.id)
})

test('should not touch id and cid from action', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { id: '11004', cid: '11005' },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ ...resources, handlers })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(calledAction.meta?.id, '11004')
  t.is(calledAction.meta?.cid, '11005')
})

test('should set cid to same value as id when not already set', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { id: '11004' },
  }
  const handlers = {
    GET: async (_action: Action) => ({
      status: 'ok',
      data: [{ id: 'ent1', type: 'entry' }],
    }),
  }
  const getSpy = sinon.spy(handlers, 'GET')

  const ret = await dispatch({ ...resources, handlers })(action)

  t.is(ret.status, 'ok')
  t.is(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  t.is(calledAction.meta?.id, '11004')
  t.is(calledAction.meta?.cid, '11004')
})

test('should add action id to list of dispatched actions and remove it when done', async (t) => {
  const actionIds = new Set<string>()
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, id: 'action1' },
  }
  const handlers = {
    GET: async () => {
      await new Promise((resolve) => setTimeout(resolve, 100, undefined))
      return { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }
    },
  }

  const p = dispatch({ ...resources, handlers, actionIds })(action)

  t.true(actionIds.has('action1')) // Should have id while action is running
  await p
  t.false(actionIds.has('action1')) // Id is removed when action is done
})

test('should map payload property service to targetService', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      service: 'entries',
    },
  }
  const handlers = {
    GET: async (action: Action) =>
      action.payload.targetService === 'entries'
        ? { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }
        : { status: 'error', error: 'Service not set' }, // Will be triggered when no `targetService`
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should set origin when handler return error response with no origin', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const handlers = {
    GET: async () => ({ status: 'error', error: 'Where did this come from?' }),
  }
  const expected = {
    status: 'error',
    error: 'Where did this come from?',
    access: { ident: { id: 'johnf' } },
    origin: 'handler:GET',
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.deepEqual(ret, expected)
})

test('should return status noaction when no action', async (t) => {
  const action = null
  const handlers = {}
  const expected = {
    status: 'noaction',
    error: 'Dispatched no action',
    origin: 'dispatch',
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.deepEqual(ret, expected)
})

test('should return badrequest when unknown action', async (t) => {
  const action = { type: 'UNKNOWN', payload: {} }
  const services = {}
  const handlers = {}
  const expected = {
    status: 'badrequest',
    error: 'No handler for UNKNOWN action',
    origin: 'dispatch',
    access: { ident: undefined },
  }
  const ret = await dispatch({ ...resources, services, handlers })(action)

  t.deepEqual(ret, expected)
})

test('should call action handler with action, dispatch, getService, and options', async (t) => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { GET: getHandler }
  const services = {}
  const schemas = new Map()
  const options = { identConfig: { type: 'account' }, queueService: 'queue' }
  const ident = { id: 'ident1', roles: [], tokens: [] }
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident, id: '11004', cid: '11004' },
  }

  await dispatch({ ...resources, services, schemas, options, handlers })(action)

  t.is(getHandler.callCount, 1)
  const dispatchedAction = getHandler.args[0][0]
  t.is(dispatchedAction.type, 'GET')
  t.deepEqual(dispatchedAction.payload, {})
  t.deepEqual(dispatchedAction.meta.ident, ident)
  t.is(dispatchedAction.meta.id, '11004')
  t.is(dispatchedAction.meta.cid, '11004')
  const passedResources = getHandler.args[0][1]
  t.is(typeof passedResources.dispatch, 'function')
  t.is(typeof passedResources.getService, 'function')
  t.is(passedResources.options, options)
})

test('should call middleware', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handlers = {
    TEST: async () => ({ status: 'fromAction' }),
  }
  const middleware: Middleware[] = [
    (next) => async (action) => ({
      ...action.response,
      status: `<${(await next(action)).status}>`,
    }),
    (next) => async (action) => ({
      ...action.response,
      status: `(${(await next(action)).status})`,
    }),
  ]
  const ret = await dispatch({ ...resources, handlers, middleware })(action)

  t.is(ret.status, '<(fromAction)>')
})

test('should allow middleware to abort middleware chain', async (t) => {
  const action = { type: 'TEST', payload: {} }
  const handler = sinon.stub().resolves({ status: 'ok' })
  const handlers = { TEST: handler }
  const middleware: Middleware[] = [
    (_next) => async (_action) => ({ status: 'error' }),
  ]
  const expected = {
    status: 'error',
    origin: 'middleware:dispatch',
    access: { ident: undefined },
  }

  const ret = await dispatch({ ...resources, handlers, middleware })(action)

  t.deepEqual(ret, expected)
  t.is(handler.callCount, 0)
})

test('should dispatch to middleware from action handlers', async (t) => {
  const action = { type: 'DISPATCHER', payload: {}, meta: {} }
  const handlers: Record<string, ActionHandler> = {
    TEST: async () => ({ status: 'fromAction' }),
    DISPATCHER: async (_action: Action, { dispatch }: ActionHandlerResources) =>
      dispatch({ type: 'TEST', payload: {} }),
  }
  const middleware: Middleware[] = [
    (next) => async (action) => ({
      ...action.response,
      status: `<${(await next(action)).status}>`,
    }),
  ]

  const ret = await dispatch({ ...resources, handlers, middleware })(action)

  t.is(ret.status, '<<fromAction>>')
})

test('should support progress reporting', async (t) => {
  const progressStub = sinon.stub()
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const handlers = {
    async GET(_action: Action, { setProgress }: ActionHandlerResources) {
      setProgress(0.5)
      return { status: 'ok', data: [] }
    },
  }

  const p = dispatch({ ...resources, handlers })(action)
  p.onProgress(progressStub)
  const ret = await p

  t.is(ret.status, 'ok')
  t.is(progressStub.callCount, 2)
  t.is(progressStub.args[0][0], 0.5)
  t.is(progressStub.args[1][0], 1)
})

test('should mutate incoming from source service', async (t) => {
  const getHandler = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry', title: 'Entry 1' }],
  })
  const handlers = { GET: getHandler }
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      sourceService: 'api',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedActionPayload = {
    id: 'ent1',
    type: 'entry',
    data: undefined,
    targetService: 'entries',
    flag: true,
    uri: 'http://some.api/1.0',
  }
  const expectedActionOptions = { someFlag: true, uri: 'http://some.api/1.0' }
  const expectedResponse = {
    status: 'ok',
    data: { id: 'ent1', $type: 'entry', title: 'Entry 1' },
    access: { ident: { id: 'johnf' } },
    params: { flag: true },
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.is(getHandler.callCount, 1)
  const calledAction = getHandler.args[0][0] as Action
  t.deepEqual(calledAction.meta?.options, expectedActionOptions)
  t.deepEqual(calledAction.payload, expectedActionPayload)
  t.deepEqual(ret, expectedResponse)
})

test('should use queue timestamp from mutate incoming action', async (t) => {
  const options = { queueService: 'queue' }
  const queueHandler = sinon.stub().resolves({ status: 'queued' })
  const handlers = { [QUEUE_SYMBOL]: queueHandler }
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      sourceService: 'api',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }

  await dispatch({ ...resources, options, handlers })(action)

  t.is(queueHandler.callCount, 1)
  const calledAction = queueHandler.args[0][0] as Action
  t.is(calledAction.meta?.queue, 1708201154626)
})

test('should validate incoming action with source service endpoint', async (t) => {
  const getHandler = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry', title: 'Entry 1' }],
  })
  const handlers = { GET: getHandler }
  const action = {
    type: 'GET',
    payload: {
      id: 'ent99', // The validation accepts any id but `'ent99'`
      type: 'entry',
      sourceService: 'api',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    status: 'noaccess',
    error: '99 is off limits!',
    data: undefined,
    origin: 'validate:service:api:endpoint:incomingEntry',
    access: { ident: { id: 'johnf' } },
    params: { flag: true },
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.is(getHandler.callCount, 0) // Return right away
  t.deepEqual(ret, expectedResponse)
})

test('should return error when source service is not found', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      sourceService: 'unknown',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async () => ({ status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }),
  }
  const expected = {
    status: 'badrequest',
    error: "Source service 'unknown' not found",
    origin: 'dispatch',
    access: { ident: undefined },
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.deepEqual(ret, expected)
})

test('should return error when no endoint on source service matches', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      type: 'unknown',
      sourceService: 'api',
      targetService: 'entries',
    },
  }
  const handlers = {
    GET: async () => ({ status: 'ok', data: [] }),
  }
  const expected = {
    status: 'badrequest',
    error: "No matching endpoint for incoming mapping on service 'api'",
    origin: 'dispatch',
    access: { ident: undefined },
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  t.deepEqual(ret, expected)
})

test('should return error instead of throwing', async (t) => {
  const action = { type: 'TEST', payload: {}, meta: { ident: { id: 'johnf' } } }
  const handlers = {
    TEST: async () => ({ status: 'fromAction' }),
  }
  const middleware: Middleware[] = [
    (_next) => async (_action) => {
      throw new Error("Too little memory. It's tiny")
    },
  ]
  const expected = {
    status: 'error',
    error: "Error thrown in dispatch: Too little memory. It's tiny",
    origin: 'dispatch',
    access: { ident: { id: 'johnf' } },
  }

  const ret = await dispatch({ ...resources, handlers, middleware })(action)

  t.deepEqual(ret, expected)
})
