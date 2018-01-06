import test from 'ava'
import sinon from 'sinon'
import json from './adapters/json'
import createEndpoint from '../tests/helpers/createEndpoint'

import integreat from './integreat'

// Helpers

const sources = [{
  id: 'entries',
  adapter: 'mockdapter',
  endpoints: [createEndpoint({id: 'getOne', uri: 'http://some.api/entries/{id}'})],
  mappings: {
    entry: {
      attributes: {
        id: 'id',
        title: 'headline',
        text: 'body',
        age: {},
        unknown: {}
      },
      relationships: {
        author: {path: 'creator'}
      }
    }
  }
}]
const datatypes = [{
  id: 'entry',
  source: 'entries',
  attributes: {
    title: 'string',
    text: 'string',
    age: 'integer'
  },
  relationships: {
    author: 'user'
  }
}]

const adapters = {
  mockdapter: {
    prepareEndpoint: json.prepareEndpoint,
    send: async ({uri, auth}) => {
      if (auth && !auth.isAuthenticated()) {
        return {status: 'autherror', error: 'Could not authenticate'}
      }
      return {
        status: 'ok',
        data: {
          id: 'ent1',
          headline: 'The title',
          body: 'The text',
          age: '36',
          unknown: 'Mr. X',
          creator: 'john'
        }
      }
    },
    normalize: async (item, path) => item
  }
}

// Tests

test('should exist', (t) => {
  t.is(typeof integreat, 'function')
})

test('should return object with version, dispatch, queue, and datatypes', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.is(typeof great.version, 'string')
  t.is(typeof great.dispatch, 'function')
  t.is(typeof great.queue, 'function')
  t.truthy(great.datatypes)
  t.truthy(great.datatypes.entry)
})

test('should throw when no sources', (t) => {
  t.throws(() => {
    integreat({datatypes})
  })
})

test('should throw when no datatypes', (t) => {
  t.throws(() => {
    integreat({sources})
  })
})

test('should have chained on method', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  const ret = great.on('dispatch', () => {})

  t.is(ret, great)
})

// Tests -- mapping
// TODO: Move these tests to integration tests?

test('should map data from source specified by type', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
  t.is(item.attributes.text, 'The text')
})

test('should map with item transformers', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: [createEndpoint({id: 'getOne', uri: 'http://some.api/entries/{id}'})],
    mappings: {entry: {
      attributes: {title: 'headline'},
      transform: ['addExtra']
    }}
  }]
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const addExtra = (item) => ({
    ...item,
    attributes: ({
      ...item.attributes,
      extra: 'Extra!'
    })
  })
  const transformers = {addExtra}

  const great = integreat({sources, datatypes}, {adapters, transformers})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  const item = ret.data[0]
  t.truthy(item.attributes)
  t.is(item.attributes.extra, 'Extra!')
})

test('should filter items', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: [createEndpoint({id: 'getOne', uri: 'http://some.api/entries/{id}'})],
    mappings: {entry: {
      filterFrom: ['never']
    }}
  }]
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const never = (item) => false
  const filters = {never}

  const great = integreat({sources, datatypes}, {adapters, filters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [])
})

test('should use auth', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth',
    endpoints: [createEndpoint({id: 'getOne', uri: 'http://some.api/entries/{id}'})],
    mappings: {entry: {
      attributes: {title: {path: 'headline'}, text: {path: 'body'}}
    }}
  }]
  const options = {}
  const auths = [{
    id: 'mauth',
    strategy: 'mock',
    options
  }]
  const authstrats = {mock: sinon.stub().returns({isAuthenticated: () => false})}
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes, auths}, {adapters, authstrats})
  const ret = await great.dispatch(action)

  t.truthy(ret)
  t.is(ret.status, 'autherror')
  t.is(authstrats.mock.callCount, 1)
  t.true(authstrats.mock.calledWith(options))
})

test('should ignore unknown auth', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth'
  }]
  const options = {}
  const auths = [{
    id: 'mauth',
    strategy: 'unknown',
    options
  }]
  const authstrats = {}

  t.notThrows(() => {
    integreat({sources, datatypes, auths}, {adapters, authstrats})
  })
})

test('should ignore null auth', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth'
  }]
  const auths = [null]
  const authstrats = {}

  t.notThrows(() => {
    integreat({sources, datatypes, auths}, {adapters, authstrats})
  })
})

test('should invoke hooks', async (t) => {
  const hook = sinon.stub()
  const hooks = {hook}
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: [createEndpoint({id: 'getOne', uri: 'http://some.api/entries/{id}'})],
    mappings: {entry: {
      attributes: {title: {path: 'headline'}, text: {path: 'body'}}
    }},
    beforeRetrieve: 'hook'
  }]
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters, hooks})
  await great.dispatch(action)

  t.is(hook.callCount, 1)
})

// Tests -- datatypes
// TODO: Move these tests to integration tests?

test('should map with datatypes', async (t) => {
  const formatters = {integer: (value) => Number.parseInt(value)}
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters, formatters})
  const ret = await great.dispatch(action)

  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
  t.is(item.attributes.text, 'The text')
  t.is(item.attributes.age, 36)
  t.is(item.attributes.unknown, undefined)
  t.truthy(item.relationships)
  t.deepEqual(item.relationships.author, {id: 'john', type: 'user'})
})

test('should accept short form of datatypes on attrs', async (t) => {
  const datatypes = [{
    id: 'entry',
    source: 'entries',
    attributes: {id: 'string', age: 'integer'}
  }]
  const formatters = {integer: (value) => Number.parseInt(value)}
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters, formatters})
  const ret = await great.dispatch(action)

  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.age, 36)
})

test('should accept short form of datatypes on rels', async (t) => {
  const datatypes = [{
    id: 'entry',
    source: 'entries',
    relationships: {author: 'user'}
  }]
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters})
  const ret = await great.dispatch(action)

  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.relationships)
  t.deepEqual(item.relationships.author, {id: 'john', type: 'user'})
})

// Tests -- dispatch

test('should provide worker with dispatch and queue methods', async (t) => {
  const params = {}
  const action = {
    type: 'RUN',
    payload: {
      worker: 'sync',
      params
    }
  }
  const sync = sinon.stub().resolves({status: 'ok'})
  const workers = {sync}
  const great = integreat({sources, datatypes}, {workers, adapters})

  const ret = await great.dispatch(action)

  t.deepEqual(ret, {status: 'ok'})
  t.is(sync.callCount, 1)
  const resources = sync.args[0][1]
  t.is(resources.dispatch, great.dispatch)
  t.is(resources.queue, great.queue)
})

test('should emit dispatch event', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const great = integreat({sources, datatypes}, {adapters})
  const listener = sinon.stub()

  great.on('dispatch', listener)
  await great.dispatch(action)

  t.is(listener.callCount, 1)
  const dispatched = listener.args[0][0]
  t.is(dispatched.type, 'GET')
  t.deepEqual(dispatched.payload, action.payload)
})

test('should emit dispatched event', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const great = integreat({sources, datatypes}, {adapters})
  const listener = sinon.stub()

  great.on('dispatched', listener)
  await great.dispatch(action)

  t.is(listener.callCount, 1)
  t.is(listener.args[0][0].type, 'GET')
  const result = listener.args[0][1]
  t.is(result.status, 'ok')
  t.is(result.data[0].id, 'ent1')
})

test('should set dispatchedAt on action', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const great = integreat({sources, datatypes}, {adapters})
  const listener = sinon.stub()
  great.on('dispatched', listener)
  const before = Date.now()

  await great.dispatch(action)

  const after = Date.now()
  const {dispatchedAt} = listener.args[0][0]
  t.true(dispatchedAt instanceof Date)
  t.true(dispatchedAt.getTime() >= before)
  t.true(dispatchedAt.getTime() <= after)
})

// Tests -- setSource

test('setSource should exist', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.is(typeof great.setSource, 'function')
})

test('setSource should return source', (t) => {
  const def = {id: 'latecomer', adapter: 'mockdapter'}
  const great = integreat({sources, datatypes}, {adapters})

  const ret = great.setSource(def)

  t.truthy(ret)
  t.is(ret.id, 'latecomer')
  t.is(ret.adapter, adapters.mockdapter)
})

test('setSource should add source to sources object', async (t) => {
  const def = {
    id: 'latecomer',
    adapter: 'mockdapter',
    endpoints: [createEndpoint({id: 'getOne', uri: 'http://some.api/entries'})],
    mappings: {
      entry: {
        attributes: {id: 'id'}
      }
    }
  }
  const great = integreat({sources, datatypes}, {adapters})
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry', source: 'latecomer'}}

  great.setSource(def)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const item = ret.data[0]
  t.is(item.id, 'ent1')
})

test('setSource should return null when no def', (t) => {
  const def = null
  const great = integreat({sources, datatypes}, {adapters})

  const ret = great.setSource(def)

  t.is(ret, null)
})

test('should throw on errors in def', (t) => {
  const def = {}
  const great = integreat({sources, datatypes}, {adapters})

  t.throws(() => {
    great.setSource(def)
  })
})

// Tests -- removeSource

test('removeSource should exist', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.is(typeof great.removeSource, 'function')
})

test('removeSource should remove source', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const great = integreat({sources, datatypes}, {adapters})

  great.removeSource('entries')
  const ret = await great.dispatch(action)

  t.is(ret.status, 'error')
})

test('removeSource should do nothing when no id', async (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.notThrows(() => {
    great.removeSource(null)
  })
})

// Tests -- queue

test('should have queue method', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.is(typeof great.queue, 'function')
})

test('should bind with queue', async (t) => {
  const bindToQueue = sinon.stub().returns(async () => 14)

  integreat({sources, datatypes}, {adapters, bindToQueue})

  t.is(bindToQueue.callCount, 1)
  const dispatch = bindToQueue.args[0][0]
  const ret = await dispatch({type: 'UNKNOWN'})
  t.is(ret.status, 'noaction')
})

test('should push action to queue', async (t) => {
  const queue = sinon.stub().resolves(14)
  const bindToQueue = () => queue
  const action = {type: 'RUN'}
  const timestamp = Date.now() + 10000

  const great = integreat({sources, datatypes}, {adapters, bindToQueue})
  const ret = await great.queue(action, timestamp)

  t.is(queue.callCount, 1)
  const queued = queue.args[0][0]
  t.truthy(queued)
  t.is(queued.type, 'RUN')
  t.is(queue.args[0][1], timestamp)
  t.truthy(ret)
  t.is(ret.status, 'queued')
  t.deepEqual(ret.data, {id: 14})
})

test('should use action id as job id', async (t) => {
  const queue = sinon.stub().returnsArg(2)
  const bindToQueue = () => queue
  const action = {type: 'RUN', id: 'job1'}

  const great = integreat({sources, datatypes}, {adapters, bindToQueue})
  const ret = await great.queue(action)

  t.is(queue.callCount, 1)
  t.is(queue.args[0][2], 'job1')
  t.truthy(ret)
  t.deepEqual(ret.data, {id: 'job1'})
})

test('should return error when push queue rejects', async (t) => {
  const queue = sinon.stub().rejects(new Error('Queue trouble'))
  const bindToQueue = () => queue
  const action = {type: 'RUN'}

  const great = integreat({sources, datatypes}, {adapters, bindToQueue})
  await t.notThrows(async () => {
    const ret = await great.queue(action)

    t.is(ret.status, 'error')
    t.regex(ret.error, /Queue\strouble/)
  })
})

test('should dispatch when no queue is provided', async (t) => {
  const great = integreat({sources, datatypes}, {adapters})
  sinon.stub(great, 'dispatch').resolves({status: 'ok'})
  const action = {type: 'RUN'}

  const ret = await great.queue(action)

  t.is(great.dispatch.callCount, 1)
  t.is(great.dispatch.args[0][0], action)
  t.deepEqual(ret, {status: 'ok'})
})

test('should emit queue event', async (t) => {
  const bindToQueue = () => async () => 14
  const great = integreat({sources, datatypes}, {adapters, bindToQueue})
  const action = {type: 'RUN'}
  const timestamp = Date.now()
  const listener = sinon.stub()

  great.on('queue', listener)
  await great.queue(action, timestamp)

  t.is(listener.callCount, 1)
  t.is(listener.args[0][0].type, 'RUN')
  t.is(listener.args[0][1], timestamp)
})

test('should emit queued event', async (t) => {
  const bindToQueue = () => async () => 14
  const great = integreat({sources, datatypes}, {adapters, bindToQueue})
  const action = {type: 'RUN'}
  const timestamp = Date.now()
  const listener = sinon.stub()

  great.on('queued', listener)
  await great.queue(action, timestamp)

  t.is(listener.callCount, 1)
  t.is(listener.args[0][0].type, 'RUN')
  t.is(listener.args[0][1], timestamp)
  const result = listener.args[0][2]
  t.is(result.status, 'queued')
  t.truthy(result.data)
  t.is(result.data.id, 14)
})

test('should set queuedAt on action', async (t) => {
  const action = {type: 'RUN'}
  const bindToQueue = () => async () => 14
  const great = integreat({sources, datatypes}, {adapters, bindToQueue})
  const listener = sinon.stub()
  great.on('queued', listener)
  const before = Date.now()

  await great.queue(action)

  const after = Date.now()
  const {queuedAt} = listener.args[0][0]
  t.true(queuedAt instanceof Date)
  t.true(queuedAt.getTime() >= before)
  t.true(queuedAt.getTime() <= after)
})

test('should remove dispatchedAt when queueing', async (t) => {
  const action = {type: 'RUN', dispatchedAt: new Date()}
  const bindToQueue = () => async () => 14
  const great = integreat({sources, datatypes}, {adapters, bindToQueue})
  const listener = sinon.stub()
  great.on('queued', listener)

  await great.queue(action)

  const {dispatchedAt} = listener.args[0][0]
  t.is(dispatchedAt, null)
})

// Tests -- schedule

test('schedule should exist', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.is(typeof great.schedule, 'function')
})

test('should queue scheduled actions', async (t) => {
  const great = integreat({sources, datatypes}, {adapters})
  sinon.stub(great, 'queue').resolves({status: 'queued'})
  const defs = [
    {schedule: 'at 2:00 am', job: {worker: 'sync'}},
    {schedule: {h: [3]}, job: {worker: 'cleanup'}}
  ]
  const expected1 = [{t: [7200]}]

  const ret = await great.schedule(defs)

  t.is(great.queue.callCount, 2)
  const args = great.queue.args
  const action1 = args[0][0]
  t.is(action1.type, 'RUN')
  t.truthy(action1.schedule)
  t.deepEqual(action1.schedule.schedules, expected1)
  t.deepEqual(action1.payload, {worker: 'sync'})
  t.true(args[0][1] instanceof Date)
  const action2 = args[1][0]
  t.deepEqual(action2.payload, {worker: 'cleanup'})
  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].status, 'queued')
})

test('should queue from schedule defintion object', async (t) => {
  const great = integreat({sources, datatypes}, {adapters})
  sinon.stub(great, 'queue').resolves({status: 'queued'})
  const defs = {schedule: 'at 2:00 am', job: {worker: 'sync'}}

  const ret = await great.schedule(defs)

  t.is(great.queue.callCount, 1)
  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
})
