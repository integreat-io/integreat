import test from 'ava'
import sinon from 'sinon'

import integreat from './index'

// Helpers

const sources = [{
  id: 'entries',
  adapter: 'mockdapter',
  endpoints: {getone: {uri: 'http://some.api/entries/{id}'}},
  mappings: {
    entry: {
      attributes: {
        id: {},
        title: {path: 'headline'},
        text: {path: 'body'},
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
    title: {type: 'string'},
    text: {type: 'string'},
    age: {type: 'integer'}
  },
  relationships: {
    author: {type: 'user'}
  }
}]

const adapters = {
  mockdapter: {
    retrieve: (url, auth) => {
      if (auth && !auth.isAuthenticated()) {
        return {status: 'autherror', error: 'Could not authenticate'}
      }
      return Promise.resolve({
        status: 'ok',
        data: {
          id: 'ent1',
          headline: 'The title',
          body: 'The text',
          age: '36',
          unknown: 'Mr. X',
          creator: 'john'
        }
      })
    },
    normalize: (item, path) => Promise.resolve(item)
  }
}

// Tests

test('should exist', (t) => {
  t.is(typeof integreat, 'function')
})

test('should return object with version', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.is(typeof great.version, 'string')
})

test('should return object with dispatch', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.truthy(great)
  t.is(typeof great.dispatch, 'function')
})

test('should throw when no sources', (t) => {
  t.throws(() => {
    integreat({datatypes}, {adapters})
  })
})

test('should throw when no datatypes', (t) => {
  t.throws(() => {
    integreat({sources}, {adapters})
  })
})

// Tests -- mapping

test('should map data from source specified by type', async (t) => {
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.truthy(ret.data)
  const item = ret.data
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
  t.is(item.attributes.text, 'The text')
})

test('should map with item transformers', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: {getone: {uri: 'http://some.api/entries/{id}'}},
    mappings: {entry: {
      transform: ['addExtra']
    }}
  }]
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}
  const addExtra = (item) => Object.assign({}, item, {attributes: Object.assign({}, item.attributes, {
    extra: 'Extra!'
  })})
  const transformers = {addExtra}

  const great = integreat({sources, datatypes}, {adapters, transformers})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.truthy(ret.data)
  const item = ret.data
  t.truthy(item.attributes)
  t.is(item.attributes.extra, 'Extra!')
})

test('should filter items', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: {getone: 'http://some.api/entries/{id}'},
    mappings: {entry: {
      filterFrom: ['never']
    }}
  }]
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}
  const never = (item) => false
  const filters = {never}

  const great = integreat({sources, datatypes}, {adapters, filters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.is(ret.data, null)
})

test('should use auth', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth',
    endpoints: {getone: {uri: 'http://some.api/entries/{id}'}},
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
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

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

// Tests -- datatypes

test('should map with datatypes', async (t) => {
  const formatters = {integer: (value) => Number.parseInt(value)}
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.truthy(ret.data)
  const item = ret.data
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
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters, formatters})
  const ret = await great.dispatch(action)

  const item = ret.data
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
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes}, {adapters})
  const ret = await great.dispatch(action)

  const item = ret.data
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
  sinon.spy(great, 'dispatch')
  const ret = await great.dispatch(action)

  t.deepEqual(ret, {status: 'ok'})
  t.is(sync.callCount, 1)
  const resources = sync.args[0][1]
  t.is(resources.dispatch, great.dispatch)
  t.is(resources.queue, great.queue)
})

// Tests -- queue

test('should have queue method', (t) => {
  const great = integreat({sources, datatypes}, {adapters})

  t.is(typeof great.queue, 'function')
})

test('should bind with queue', async (t) => {
  const bindToQueue = sinon.stub().returns(async () => {})

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
