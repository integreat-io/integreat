import test from 'ava'
import sinon from 'sinon'
import later from 'later'

import integreat from './index'

// Helpers

const sources = [{
  id: 'entries',
  adapter: 'mockdapter',
  endpoints: {one: {uri: 'http://some.api/entries/{id}'}},
  items: [{
    type: 'entry',
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
  }]
}]
const types = [{
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
        throw new Error('Not authenticated')
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
  const great = integreat([], types)

  t.is(typeof great.version, 'string')
})

test('should return object with dispatch', (t) => {
  const great = integreat(sources, types, {adapters})

  t.truthy(great)
  t.is(typeof great.dispatch, 'function')
})

test('should throw when no sources', (t) => {
  t.throws(() => {
    integreat(undefined, types, {adapters})
  })
})

test('should throw when no types', (t) => {
  t.throws(() => {
    integreat(sources, undefined, {adapters})
  })
})

// Tests -- mapping

test('should map data from source specified by type', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat(sources, types, {adapters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
  t.is(item.attributes.text, 'The text')
})

test('should map with item mappers', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: {one: {uri: 'http://some.api/entries/{id}'}},
    items: [{
      type: 'entry',
      map: ['addExtra']
    }]
  }]
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const addExtra = (item) => Object.assign({}, item, {attributes: Object.assign({}, item.attributes, {
    extra: 'Extra!'
  })})
  const mappers = {addExtra}

  const great = integreat(sources, types, {adapters, mappers})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  const item = ret.data[0]
  t.truthy(item.attributes)
  t.is(item.attributes.extra, 'Extra!')
})

test('should filter items', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: {one: 'http://some.api/entries/{id}'},
    items: [{
      type: 'entry',
      filter: {from: ['never']}
    }]
  }]
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}
  const never = (item) => false
  const filters = {never}

  const great = integreat(sources, types, {adapters, filters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 0)
})

test('should use auth', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth',
    endpoints: {one: {uri: 'http://some.api/entries/{id}'}},
    items: [{
      type: 'entry',
      attributes: {title: {path: 'headline'}, text: {path: 'body'}}
    }]
  }]
  const auths = {mauth: {isAuthenticated: () => false}}
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat(sources, types, {adapters, auths})
  try {
    await great.dispatch(action)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

// Tests -- types

test('should map with types', async (t) => {
  const transforms = {integer: (value) => Number.parseInt(value)}
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat(sources, types, {adapters, transforms})
  const ret = await great.dispatch(action)

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
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

test('should accept short form of types on attrs', async (t) => {
  const types = [{
    id: 'entry',
    source: 'entries',
    attributes: {id: 'string', age: 'integer'}
  }]
  const transforms = {integer: (value) => Number.parseInt(value)}
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat(sources, types, {adapters, transforms})
  const ret = await great.dispatch(action)

  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.age, 36)
})

test('should accept short form of types on attrs', async (t) => {
  const types = [{
    id: 'entry',
    source: 'entries',
    relationships: {author: 'user'}
  }]
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat(sources, types, {adapters})
  const ret = await great.dispatch(action)

  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.relationships)
  t.deepEqual(item.relationships.author, {id: 'john', type: 'user'})
})

// Tests -- workers and queue

test('should run worker', async (t) => {
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

  const great = integreat(sources, types, {workers, adapters})
  sinon.spy(great, 'dispatch')
  const ret = await great.dispatch(action)

  t.deepEqual(ret, {status: 'ok'})
  t.true(great.dispatch.calledTwice)
  t.true(great.dispatch.calledOn(great))
  t.is(great.dispatch.args[1][0], params)
})

test('should schedule action', async (t) => {
  const action = {
    type: 'RUN',
    payload: {
      worker: 'sync'
    },
    queue: true
  }
  const workers = {sync: async () => true}
  const push = sinon.stub().returns({status: 'queued'})

  const great = integreat(sources, types, {workers, adapters})
  great.queue = push
  const ret = await great.dispatch(action)

  t.truthy(ret)
  t.is(ret.status, 'queued')
  t.true(push.calledOnce)
  t.is(push.args[0][0].type, 'RUN')
})

// Tests -- schedule

test('schedule should exist', (t) => {
  const great = integreat([], [])

  t.is(typeof great.schedule, 'function')
})

test('should dispatch scheduled action', (t) => {
  const queueTime = later.schedule({schedules: [{h: [2]}]}).next().getTime()
  const great = integreat([], [])
  sinon.stub(great, 'dispatch')
  const scheduleDefs = [
    {schedule: 'at 2:00 am', job: {worker: 'sync'}},
    {schedule: {h: [3]}, job: {worker: 'cleanup'}}
  ]
  const expected1 = [{t: [7200]}]

  great.schedule(scheduleDefs)

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

test('should dispatch null for invalid schedule', (t) => {
  const great = integreat([], [])
  sinon.stub(great, 'dispatch')
  const scheduleDefs = [{schedule: 'invalid'}]

  t.notThrows(() => {
    great.schedule(scheduleDefs)
  })
  t.true(great.dispatch.calledOnce)
  t.true(great.dispatch.calledWith(null))
})

test('should return promises of return objects', async (t) => {
  const great = integreat([], [], {
    workers: {sync: () => Promise.resolve({status: 'queued'})}
  })
  sinon.spy(great, 'dispatch')
  const scheduleDefs = [{schedule: 'at 2:00 am', job: {worker: 'sync'}}]

  const ret = await great.schedule(scheduleDefs)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.deepEqual(ret[0], {status: 'queued'})
})
