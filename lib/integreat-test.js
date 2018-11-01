import test from 'ava'
import sinon from 'sinon'
import json from './adapters/json'

import integreat from './integreat'

// Helpers

const services = [{
  id: 'entries',
  adapter: 'mockdapter',
  endpoints: [
    { id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }
  ],
  mappings: { entry: 'entry' }
}]

const schemas = [
  {
    id: 'entry',
    service: 'entries',
    attributes: {
      title: 'string',
      text: 'string',
      age: 'integer'
    },
    relationships: {
      author: 'user'
    },
    access: 'all'
  },
  {
    id: 'article',
    attributes: {
      title: 'string'
    },
    access: 'all'
  }
]

const mappings = [{
  id: 'entry',
  type: 'entry',
  service: 'entries',
  attributes: {
    id: 'id',
    title: 'headline',
    text: 'body',
    age: 'age',
    unknown: {}
  },
  relationships: {
    author: { path: 'creator' }
  }
}]

const adapters = {
  mockdapter: {
    prepareEndpoint: json.prepareEndpoint,
    send: async ({ uri, auth }) => {
      if (auth && !auth.isAuthenticated()) {
        return { status: 'autherror', error: 'Could not authenticate' }
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
    normalize: async (item, request) => item,
    serialize: async (item, request) => item
  }
}

// Tests

test('should exist', (t) => {
  t.is(typeof integreat, 'function')
})

test('should return object with version, dispatch, on, schemas, and identType', (t) => {
  const ident = { type: 'account' }
  const great = integreat({ services, schemas, ident }, { adapters })

  t.is(typeof great.version, 'string')
  t.is(typeof great.dispatch, 'function')
  t.is(typeof great.on, 'function')
  t.truthy(great.schemas)
  t.truthy(great.schemas.entry)
  t.truthy(great.services)
  t.truthy(great.services.entries)
  t.is(great.identType, 'account')
})

test('should throw when no services', (t) => {
  t.throws(() => {
    integreat({ schemas })
  })
})

test('should throw when no schemas', (t) => {
  t.throws(() => {
    integreat({ services })
  })
})

// Tests -- dispatch

test('should dispatch', async (t) => {
  const action = { type: 'TEST' }
  const testAction = sinon.stub().resolves({ status: 'ok' })
  const actions = { TEST: testAction }

  const great = integreat({ services, schemas, mappings }, { actions, adapters })
  await great.dispatch(action)

  t.is(testAction.callCount, 1) // If the action handler was called, the action was dispatched
})

test('should call middleware dispatch', async (t) => {
  const action = { type: 'TEST' }
  const otherAction = sinon.stub().resolves({ status: 'ok' })
  const actions = { OTHER: otherAction }
  const middlewares = [
    (next) => async (action) => next({ type: 'OTHER' })
  ]

  const great = integreat({ services, schemas, mappings }, { actions, adapters, middlewares })
  await great.dispatch(action)

  t.is(otherAction.callCount, 1) // If other action handler was called, middleware changed action
})

// Tests -- mapping
// TODO: Move these tests to integration tests?

test('should map data from service specified by type', async (t) => {
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }

  const great = integreat({ services, schemas, mappings }, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
  t.is(item.attributes.text, 'The text')
})

test('should allow mappings specified for several types', async (t) => {
  const mappings = [{
    id: 'entryArticle',
    attributes: {
      id: 'id',
      title: 'headline'
    }
  }]
  const services = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: [
      { id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }
    ],
    mappings: {
      entry: 'entryArticle',
      article: 'entryArticle'
    }
  }]
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }

  const great = integreat({ services, schemas, mappings }, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
})

test('should map with item transformers', async (t) => {
  const services = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: [{ id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }],
    mappings: { entry: 'entry' }
  }]
  const mappings = [{
    id: 'entry',
    type: 'entry',
    service: 'entries',
    attributes: { title: 'headline' },
    transform: ['addText']
  }]
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }
  const addText = (item) => ({
    ...item,
    attributes: ({
      ...item.attributes,
      text: 'Extra!'
    })
  })
  const transformers = { addText }

  const great = integreat({ services, schemas, mappings }, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  const item = ret.data[0]
  t.truthy(item.attributes)
  t.is(item.attributes.text, 'Extra!')
})

test('should filter items', async (t) => {
  const services = [{
    id: 'entries',
    adapter: 'mockdapter',
    endpoints: [{ id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }]
  }]
  const mappings = [{
    type: 'entry',
    service: 'entries',
    filterFrom: ['never']
  }]
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }
  const never = (item) => false
  const filters = { never }

  const great = integreat({ services, schemas, mappings }, { adapters, filters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [])
})

test('should use auth', async (t) => {
  const services = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth',
    endpoints: [{ id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }],
    mappings: { entry: 'entry' }
  }]
  const mappings = [{
    id: 'entry',
    type: 'entry',
    service: 'entries',
    attributes: { title: { path: 'headline' }, text: { path: 'body' } }
  }]
  const auths = [{
    id: 'mauth',
    authenticator: 'mock',
    options: { status: 'refused' }
  }]
  const authenticators = {
    mock: {
      authenticate: async ({ status }) => ({ status }),
      isAuthenticated: () => false
    }
  }
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }

  const great = integreat({ services, schemas, mappings, auths }, { adapters, authenticators })
  const ret = await great.dispatch(action)

  t.truthy(ret)
  t.is(ret.status, 'noaccess', ret.error)
})

test('should ignore unknown auth', async (t) => {
  const services = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth'
  }]
  const options = {}
  const auths = [{
    id: 'mauth',
    authenticator: 'unknown',
    options
  }]
  const authenticators = {}

  t.notThrows(() => {
    integreat({ services, schemas, auths }, { adapters, authenticators })
  })
})

test('should ignore null auth', async (t) => {
  const services = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth'
  }]
  const auths = [null]
  const authenticators = {}

  t.notThrows(() => {
    integreat({ services, schemas, auths }, { adapters, authenticators })
  })
})

// Tests -- schemas
// TODO: Move these tests to integration tests?

test('should map with schemas', async (t) => {
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }

  const great = integreat({ services, schemas, mappings }, { adapters })
  const ret = await great.dispatch(action)

  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
  t.is(item.attributes.text, 'The text')
  t.is(item.attributes.age, 36)
  t.is(item.attributes.unknown, undefined)
  t.truthy(item.relationships)
  t.deepEqual(item.relationships.author, { id: 'john', type: 'user' })
})

test.todo('should map with transformers')

// Tests -- on

test('should subscribe to event on service', (t) => {
  const great = integreat({ services, schemas, mappings }, { adapters })
  const cb = () => {}
  const onStub = sinon.stub(great.services.entries, 'on')

  great.on('mapToService', 'entries', cb)

  t.is(onStub.callCount, 1)
  t.is(onStub.args[0][0], 'mapToService')
  t.is(onStub.args[0][1], cb)
})

test('should not subscribe to anything for unknown service', (t) => {
  const great = integreat({ services, schemas, mappings }, { adapters })

  t.notThrows(() => {
    great.on('mapToService', 'unknown', () => {})
  })
})
