import test from 'ava'
import sinon from 'sinon'
import later from 'later'

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
  const great = integreat({sources, datatypes, adapters})

  t.is(typeof great.version, 'string')
})

test('should return object with dispatch', (t) => {
  const great = integreat({sources, datatypes, adapters})

  t.truthy(great)
  t.is(typeof great.dispatch, 'function')
})

test('should throw when no sources', (t) => {
  t.throws(() => {
    integreat({datatypes, adapters})
  })
})

test('should throw when no datatypes', (t) => {
  t.throws(() => {
    integreat({sources, adapters})
  })
})

// Tests -- mapping

test('should map data from source specified by type', async (t) => {
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes, adapters})
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

  const great = integreat({sources, datatypes, adapters, transformers})
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

  const great = integreat({sources, datatypes, adapters, filters})
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
  const auths = {mauth: {isAuthenticated: () => false}}
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes, adapters, auths})
  const ret = await great.dispatch(action)

  t.truthy(ret)
  t.is(ret.status, 'autherror')
})

// Tests -- datatypes

test('should map with datatypes', async (t) => {
  const formatters = {integer: (value) => Number.parseInt(value)}
  const action = {type: 'GET_ONE', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, datatypes, adapters, formatters})
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

  const great = integreat({sources, datatypes, adapters, formatters})
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

  const great = integreat({sources, datatypes, adapters})
  const ret = await great.dispatch(action)

  const item = ret.data
  t.is(item.id, 'ent1')
  t.truthy(item.relationships)
  t.deepEqual(item.relationships.author, {id: 'john', type: 'user'})
})

// Tests -- workers and queue

test('should provide worker with dispatch method', async (t) => {
  const params = {}
  const action = {
    type: 'RUN',
    payload: {
      worker: 'sync',
      params
    }
  }
  const sync = (payload, dispatch) => {
    dispatch(payload)
    return {status: 'ok'}
  }
  const workers = {sync}

  const great = integreat({sources, datatypes, workers, adapters})
  sinon.spy(great, 'dispatch')
  const ret = await great.dispatch(action)

  t.deepEqual(ret, {status: 'ok'})
  t.true(great.dispatch.calledTwice)
  t.true(great.dispatch.calledOn(great))
  t.is(great.dispatch.args[1][0], params)
})

test('should bind with queue', async (t) => {
  const queue = {
    subscribe: sinon.stub(),
    push: async () => {}
  }

  integreat({sources, datatypes, adapters, queue})

  t.true(queue.subscribe.calledOnce)
  const dispatch = queue.subscribe.args[0][0]
  const ret = await dispatch({type: 'UNKNOWN'})
  t.is(ret.status, 'noaction')
})

test('should not throw when queue does not have push method', (t) => {
  const queue = {
    subscribe: () => {}
  }

  t.notThrows(() => {
    integreat({sources, datatypes, adapters, queue})
  })
})

test('should not throw when queue does not have subscribe method', (t) => {
  const queue = {
    push: async () => {}
  }

  t.notThrows(() => {
    integreat({sources, datatypes, adapters, queue})
  })
})

test('should push action to queue', async (t) => {
  const queue = {
    subscribe: () => {},
    push: sinon.stub().returns(Promise.resolve(true))
  }
  const action = {type: 'RUN', queue: true}

  const great = integreat({sources, datatypes, adapters, queue})
  const ret = await great.dispatch(action)

  t.true(queue.push.calledOnce)
  t.true(queue.push.calledOn(queue))
  const queued = queue.push.args[0][0]
  t.truthy(queued)
  t.is(queued.type, 'RUN')
  t.false(queued.queue)
  t.truthy(ret)
  t.is(ret.status, 'queued')
})

test('detachQueue should exist', (t) => {
  const great = integreat({sources, datatypes, adapters})

  t.is(typeof great.detachQueue, 'function')
})

test('detachQueue should unsubscribe dispatch', async (t) => {
  const handler = {}
  const queue = {
    push: async () => true,
    subscribe: () => handler,
    unsubscribe: sinon.stub()
  }
  const action = {type: 'RUN', queue: true}

  const great = integreat({sources, datatypes, adapters, queue})
  great.detachQueue()
  const ret = await great.dispatch(action)

  t.true(queue.unsubscribe.calledOnce)
  t.true(queue.unsubscribe.calledWith(handler))
  t.not(ret.status, 'queued')
})

test('detachQueue should only unsubscribe once', (t) => {
  const handler = {}
  const queue = {
    push: () => {},
    subscribe: () => handler,
    unsubscribe: sinon.stub()
  }

  const great = integreat({sources, datatypes, adapters, queue})
  great.detachQueue()
  great.detachQueue()

  t.true(queue.unsubscribe.calledOnce)
})

// Tests -- schedule

test('schedule should exist', (t) => {
  const great = integreat({sources, datatypes, adapters})

  t.is(typeof great.schedule, 'function')
})

test('should dispatch scheduled actions', async (t) => {
  const queueTime = later.schedule({schedules: [{h: [2]}]}).next().getTime()
  const great = integreat({sources, datatypes, adapters})
  sinon.stub(great, 'dispatch').returns(Promise.resolve({}))
  const scheduleDefs = [
    {schedule: 'at 2:00 am', job: {worker: 'sync'}},
    {schedule: {h: [3]}, job: {worker: 'cleanup'}}
  ]
  const expected1 = [{t: [7200]}]

  await great.schedule(scheduleDefs)

  t.true(great.dispatch.calledTwice)
  t.true(great.dispatch.calledOn(great))
  const action1 = great.dispatch.args[0][0]
  t.is(action1.type, 'RUN')
  t.is(action1.queue, queueTime)
  t.truthy(action1.schedule)
  t.deepEqual(action1.schedule.schedules, expected1)
  t.truthy(action1.payload)
  t.is(action1.payload.worker, 'sync')
  const action2 = great.dispatch.args[1][0]
  t.truthy(action2.payload)
  t.is(action2.payload.worker, 'cleanup')
})

test('should handle schedule object instead of array', async (t) => {
  const great = integreat({sources, datatypes, adapters})
  sinon.stub(great, 'dispatch').returns(Promise.resolve({}))
  const scheduleDefs = {schedule: 'at 2:00 am', job: {worker: 'sync'}}

  await t.notThrows(async () => {
    const ret = await great.schedule(scheduleDefs)

    t.true(great.dispatch.calledOnce)
    t.true(Array.isArray(ret))
    t.is(ret.length, 1)
  })
})

test('should dispatch null for invalid schedule', async (t) => {
  const great = integreat({sources, datatypes, adapters})
  sinon.stub(great, 'dispatch').returns(Promise.resolve({}))
  const scheduleDefs = [{schedule: 'invalid'}]

  await t.notThrows(async () => {
    await great.schedule(scheduleDefs)
  })
  t.true(great.dispatch.calledOnce)
  t.true(great.dispatch.calledWith(null))
})

test('should return promises of return objects', async (t) => {
  const great = integreat({
    sources,
    datatypes,
    adapters,
    workers: {sync: () => Promise.resolve({status: 'queued'})}
  })
  sinon.spy(great, 'dispatch')
  const scheduleDefs = [{schedule: 'at 2:00 am', job: {worker: 'sync'}}]

  const ret = await great.schedule(scheduleDefs)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.deepEqual(ret[0], {status: 'queued'})
})
