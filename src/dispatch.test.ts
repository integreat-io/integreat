import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import mapTransform from 'map-transform'
import httpTransporter from 'integreat-transporter-http'
import Service from './service/Service.js'
import Schema from './schema/Schema.js'
import { QUEUE_SYMBOL } from './handlers/index.js'
import createMapOptions from './utils/createMapOptions.js'
import type {
  Action,
  Middleware,
  ActionHandler,
  ActionHandlerResources,
} from './types.js'

import dispatch from './dispatch.js'

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
    {
      mapTransform,
      mapOptions,
      schemas,
      transporters: { http: httpTransporter },
    },
  ),
}

const options = {}
const actionIds = new Set<string>()
const emit = () => undefined
const resources = { services, schemas, options, actionIds, emit }

// Tests

test('should route to relevant action handler', async () => {
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

  assert.deepEqual(ret, expected)
})

test('should route action with queue flag to queue handler', async () => {
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

  assert.equal(ret.status, 'queued')
  assert.equal(setHandler.callCount, 0)
  assert.equal(queueHandler.callCount, 1)
  const handlerAction = queueHandler.args[0][0]
  assert.equal(handlerAction.meta?.queue, true)
})

test('should route action with queue timestamp to queue handler', async () => {
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

  assert.equal(ret.status, 'queued')
  assert.equal(setHandler.callCount, 0)
  assert.equal(queueHandler.callCount, 1)
  const handlerAction = queueHandler.args[0][0]
  assert.equal(handlerAction.meta?.queue, 1708201154626)
})

test('should not route to queue handler when no queue service', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(queueHandler.callCount, 0)
  assert.equal(setHandler.callCount, 1)
  const handlerAction = setHandler.args[0][0]
  assert.equal(!!handlerAction.meta?.queue, false)
})

test('should not route to queue handler when queue service is configured with an unknown service', async () => {
  const options = { queueService: 'unknown' }
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
  const queueHandler = sinon.stub().resolves({
    status: 'error',
    error: "Could not queue to unknown service 'unknown'",
  })
  const handlers = {
    SET: setHandler,
    [QUEUE_SYMBOL]: queueHandler,
  }

  const ret = await dispatch({ ...resources, options, handlers })(action)

  assert.equal(ret.status, 'error')
  assert.equal(ret.error, "Could not queue to unknown service 'unknown'")
  assert.equal(queueHandler.callCount, 1)
  assert.equal(setHandler.callCount, 0)
})

test('should set dispatchedAt meta', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  assert.equal(typeof calledAction.meta?.dispatchedAt, 'number')
  assert.equal((calledAction.meta?.dispatchedAt as number) >= before, true)
  assert.equal((calledAction.meta?.dispatchedAt as number) <= after, true)
})

test('should override any present dispatchedAt meta', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  assert.equal(typeof calledAction.meta?.dispatchedAt, 'number')
  assert.equal((calledAction.meta?.dispatchedAt as number) >= before, true)
  assert.equal((calledAction.meta?.dispatchedAt as number) <= after, true)
})

test('should remove auth object in meta if set', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  assert.equal(calledAction.meta?.auth, undefined)
})

test('should set id and cid in meta when not already set', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  assert.equal(typeof calledAction.meta?.id, 'string')
  assert.equal(calledAction.meta?.cid, calledAction.meta?.id)
})

test('should not touch id and cid from action', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  assert.equal(calledAction.meta?.id, '11004')
  assert.equal(calledAction.meta?.cid, '11005')
})

test('should set cid to same value as id when not already set', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(getSpy.callCount, 1)
  const calledAction = getSpy.args[0][0] as Action
  assert.equal(calledAction.meta?.id, '11004')
  assert.equal(calledAction.meta?.cid, '11004')
})

test('should add action id to list of dispatched actions and remove it when done', async () => {
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

  assert.equal(actionIds.has('action1'), true) // Should have id while action is running
  await p
  assert.equal(actionIds.has('action1'), false) // Id is removed when action is done
})
test('should emit done event when we clear the last action id', async () => {
  const emit = sinon.stub()
  const actionIds = new Set<string>()
  const action = (index: number) => ({
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' }, id: `action${index}` },
  })
  let count = 0
  const ms = [200, 50, 100]
  const handlers = {
    GET: async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, ms[count++], undefined),
      )
      return { status: 'ok', data: [] }
    },
  }

  const callCount0 = emit.callCount
  const p0 = dispatch({ ...resources, handlers, actionIds, emit })(action(0))
  const callCount1 = emit.callCount
  const p1 = dispatch({ ...resources, handlers, actionIds, emit })(action(1))
  const callCount2 = emit.callCount
  const p2 = dispatch({ ...resources, handlers, actionIds, emit })(action(2))
  await p0
  await p1
  await p2

  assert.equal(callCount0, 0)
  assert.equal(callCount1, 0)
  assert.equal(callCount2, 0)
  assert.equal(emit.callCount, 1)
  assert.equal(emit.args[0][0], 'done')
})

test('should map payload property service to targetService', async () => {
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

  assert.equal(ret.status, 'ok', ret.error)
  assert.deepEqual(ret.data, [{ id: 'ent1', type: 'entry' }])
})

test('should set origin when handler return error response with no origin', async () => {
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

  assert.deepEqual(ret, expected)
})

test('should return status noaction when no action', async () => {
  const action = null
  const handlers = {}
  const expected = {
    status: 'noaction',
    error: 'Dispatched no action',
    origin: 'dispatch',
  }

  const ret = await dispatch({ ...resources, handlers })(action)

  assert.deepEqual(ret, expected)
})

test('should return badrequest when unknown action', async () => {
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

  assert.deepEqual(ret, expected)
})

test('should call action handler with action, dispatch, getService, and options', async () => {
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

  assert.equal(getHandler.callCount, 1)
  const dispatchedAction = getHandler.args[0][0]
  assert.equal(dispatchedAction.type, 'GET')
  assert.deepEqual(dispatchedAction.payload, {})
  assert.deepEqual(dispatchedAction.meta.ident, ident)
  assert.equal(dispatchedAction.meta.id, '11004')
  assert.equal(dispatchedAction.meta.cid, '11004')
  const passedResources = getHandler.args[0][1]
  assert.equal(typeof passedResources.dispatch, 'function')
  assert.equal(typeof passedResources.getService, 'function')
  assert.equal(passedResources.options, options)
})

test('should call middleware', async () => {
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

  assert.equal(ret.status, '<(fromAction)>')
})

test('should call middleware before queueing', async () => {
  const action = { type: 'TEST', payload: {}, meta: { queue: true } }
  const queueHandler = sinon.stub().resolves({ status: 'queued' })
  const handlers = {
    TEST: async () => ({ status: 'fromAction' }),
    [QUEUE_SYMBOL]: queueHandler,
  }
  const options = { queueService: 'queue' }
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
  const ret = await dispatch({ ...resources, options, handlers, middleware })(
    action,
  )

  assert.equal(ret.status, '<(queued)>')
})

test('should allow middleware to abort middleware chain', async () => {
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

  assert.deepEqual(ret, expected)
  assert.equal(handler.callCount, 0)
})

test('should dispatch to middleware from action handlers', async () => {
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

  assert.equal(ret.status, '<<fromAction>>')
})

test('should complete ident', async () => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const getIdentHandler = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const handlers = { GET: getHandler, GET_IDENT: getIdentHandler }
  const options = {
    identConfig: { type: 'account', completeIdent: true },
  }
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' }, id: '11004', cid: '11004' },
  }
  const expectedIdent = { id: 'johnf', roles: ['editor'], isCompleted: true }

  const ret = await dispatch({
    ...resources,
    services,
    schemas,
    options,
    handlers,
  })(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(getIdentHandler.callCount, 1)
  assert.equal(getHandler.callCount, 1)
  const dispatchedAction = getHandler.args[0][0]
  assert.equal(dispatchedAction.type, 'GET')
  assert.deepEqual(dispatchedAction.payload, {})
  assert.deepEqual(dispatchedAction.meta.ident, expectedIdent)
})

test('should not complete an already completed ident', async () => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const getIdentHandler = sinon.stub().resolves({
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  })
  const handlers = { GET: getHandler, GET_IDENT: getIdentHandler }
  const options = {
    identConfig: { type: 'account', completeIdent: true },
  }
  const action = {
    type: 'GET',
    payload: {},
    meta: {
      ident: { id: 'johnf', isCompleted: true },
      id: '11004',
      cid: '11004',
    },
  }
  const expectedIdent = { id: 'johnf', isCompleted: true }

  const ret = await dispatch({
    ...resources,
    services,
    schemas,
    options,
    handlers,
  })(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(getIdentHandler.callCount, 0)
  assert.equal(getHandler.callCount, 1)
  const dispatchedAction = getHandler.args[0][0]
  assert.deepEqual(dispatchedAction.meta.ident, expectedIdent)
})

test('should pass on error response from complete ident', async () => {
  const getHandler = sinon.stub().resolves({ status: 'ok' })
  const getIdentHandler = sinon.stub().resolves({
    status: 'notfound',
    error: 'Not found',
  })
  const handlers = { GET: getHandler, GET_IDENT: getIdentHandler }
  const options = {
    identConfig: { type: 'account', completeIdent: true },
  }
  const ident = { id: 'johnf' }
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident, id: '11004', cid: '11004' },
  }

  const ret = await dispatch({
    ...resources,
    services,
    schemas,
    options,
    handlers,
  })(action)

  assert.equal(ret.status, 'noaccess', ret.error)
})

test('should support progress reporting', async () => {
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

  assert.equal(ret.status, 'ok')
  assert.equal(progressStub.callCount, 2)
  assert.equal(progressStub.args[0][0], 0.5)
  assert.equal(progressStub.args[1][0], 1)
})

test('should mutate incoming from source service', async () => {
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

  assert.equal(getHandler.callCount, 1)
  const calledAction = getHandler.args[0][0] as Action
  assert.deepEqual(calledAction.meta?.options, expectedActionOptions)
  assert.deepEqual(calledAction.payload, expectedActionPayload)
  assert.deepEqual(ret, expectedResponse)
})

test('should use queue timestamp from mutate incoming action', async () => {
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

  assert.equal(queueHandler.callCount, 1)
  const calledAction = queueHandler.args[0][0] as Action
  assert.equal(calledAction.meta?.queue, 1708201154626)
})

test('should validate incoming action with source service endpoint', async () => {
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

  assert.equal(getHandler.callCount, 0) // Return right away
  assert.deepEqual(ret, expectedResponse)
})

test('should return error when source service is not found', async () => {
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

  assert.deepEqual(ret, expected)
})

test('should return error when no endoint on source service matches', async () => {
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

  assert.deepEqual(ret, expected)
})

test('should return error instead of throwing', async () => {
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

  assert.deepEqual(ret, expected)
})
