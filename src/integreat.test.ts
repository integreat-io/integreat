import test from 'ava'
import sinon = require('sinon')
import json from 'integreat-adapter-json'

import integreat from './integreat'

// Helpers

const services = [
  {
    id: 'entries',
    adapter: 'mockdapter',
    mappings: { entry: 'entries_entry' },
    endpoints: [
      { id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }
    ]
  }
]

const schemas = [
  {
    id: 'entry',
    plural: 'entries',
    service: 'entries',
    fields: {
      title: 'string',
      text: 'string',
      age: 'integer',
      author: 'user'
    },
    access: 'all'
  },
  {
    id: 'article',
    fields: {
      title: 'string'
    },
    access: 'all'
  }
]

const mappings = [
  {
    id: 'entries_entry',
    type: 'entry',
    service: 'entries',
    pipeline: [
      {
        $iterate: true,
        id: 'id',
        title: 'headline',
        text: 'body',
        age: 'age',
        unknown: [],
        author: 'creator'
      },
      { $apply: 'cast_entry' }
    ]
  }
]

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

test('should return object with version, dispatch, on, schemas, and identType', t => {
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

test('should throw when no services', t => {
  t.throws(() => {
    integreat({ schemas })
  })
})

test('should throw when no schemas', t => {
  t.throws(() => {
    integreat({ services })
  })
})

// Tests -- dispatch

test('should dispatch', async t => {
  const action = { type: 'TEST' }
  const testAction = sinon.stub().resolves({ status: 'ok' })
  const actions = { TEST: testAction }

  const great = integreat(
    { services, schemas, mappings },
    { actions, adapters }
  )
  await great.dispatch(action)

  t.is(testAction.callCount, 1) // If the action handler was called, the action was dispatched
})

test('should call middleware dispatch', async t => {
  const action = { type: 'TEST' }
  const otherAction = sinon.stub().resolves({ status: 'ok' })
  const actions = { OTHER: otherAction }
  const middlewares = [next => async action => next({ type: 'OTHER' })]

  const great = integreat(
    { services, schemas, mappings },
    { actions, adapters },
    middlewares
  )
  await great.dispatch(action)

  t.is(otherAction.callCount, 1) // If other action handler was called, middleware changed action
})

// Tests -- typeFromPlural

test('should return type string from plural', async t => {
  const actions = {}
  const great = integreat(
    { services, schemas, mappings },
    { actions, adapters }
  )

  const ret = great.typeFromPlural('entries')

  t.is(ret, 'entry')
})

test('should return type string from inferred plural', async t => {
  const actions = {}
  const great = integreat(
    { services, schemas, mappings },
    { actions, adapters }
  )

  const ret = great.typeFromPlural('articles')

  t.is(ret, 'article')
})

test('should return undefined for unknown plural', async t => {
  const actions = {}
  const great = integreat(
    { services, schemas, mappings },
    { actions, adapters }
  )

  const ret = great.typeFromPlural('unknowns')

  t.is(typeof ret, 'undefined')
})

// Tests -- mapping
// TODO: Move these tests to integration tests?

test('should map data from service specified by type', async t => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const great = integreat({ services, schemas, mappings }, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const item = ret.data
  t.truthy(item)
  t.is(item.id, 'ent1')
  t.is(item.title, 'The title')
  t.is(item.text, 'The text')
})

test('should allow mappings specified for several types', async t => {
  const mappings = [
    {
      id: 'entryArticle',
      pipeline: [
        {
          $iterate: true,
          id: 'id',
          title: 'headline'
        }
      ]
    }
  ]
  const services = [
    {
      id: 'entries',
      adapter: 'mockdapter',
      endpoints: [
        { id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }
      ],
      mappings: {
        entry: 'entryArticle',
        article: 'entryArticle'
      }
    }
  ]
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const great = integreat({ services, schemas, mappings }, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  const item = ret.data
  t.is(item.id, 'ent1')
  t.is(item.title, 'The title')
})

test('should map with item transformers', async t => {
  const services = [
    {
      id: 'entries',
      adapter: 'mockdapter',
      mappings: { entry: 'entry' },
      endpoints: [
        { id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }
      ]
    }
  ]
  const mappings = [
    {
      id: 'entry',
      type: 'entry',
      service: 'entries',
      pipeline: [
        {
          $iterate: true,
          id: 'id',
          title: 'headline'
        },
        { $transform: 'addText' },
        { $apply: 'cast_entry' }
      ]
    }
  ]
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }
  const addText = () => item => ({
    ...item,
    text: 'Extra!'
  })
  const transformers = { addText }

  const great = integreat(
    { services, schemas, mappings },
    { adapters, transformers }
  )
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  const item = ret.data
  t.is(item.text, 'Extra!')
})

test('should filter items', async t => {
  const services = [
    {
      id: 'entries',
      adapter: 'mockdapter',
      mappings: { entry: 'entries_entry' },
      endpoints: [
        { id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }
      ]
    }
  ]
  const mappings = [
    {
      id: 'entries_entry',
      type: 'entry',
      service: 'entries',
      pipeline: [{ $filter: 'never' }]
    }
  ]
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }
  const never = () => () => false
  const transformers = { never }

  const great = integreat(
    { services, schemas, mappings },
    { adapters, transformers }
  )
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.is(ret.data, undefined)
})

test('should use auth', async t => {
  const services = [
    {
      id: 'entries',
      adapter: 'mockdapter',
      auth: 'mauth',
      mappings: { entry: 'entry' },
      endpoints: [
        { id: 'getOne', options: { uri: 'http://some.api/entries/{id}' } }
      ]
    }
  ]
  const mappings = [
    {
      id: 'entry',
      type: 'entry',
      service: 'entries',
      pipeline: [
        {
          id: 'id',
          title: 'headline',
          text: 'body'
        }
      ]
    }
  ]
  const auths = [
    {
      id: 'mauth',
      authenticator: 'mock',
      options: { status: 'refused' }
    }
  ]
  const authenticators = {
    mock: {
      authenticate: async ({ status }) => ({ status }),
      isAuthenticated: () => false
    }
  }
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const great = integreat(
    { services, schemas, mappings, auths },
    { adapters, authenticators }
  )
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
})

test('should ignore unknown auth', async t => {
  const services = [
    {
      id: 'entries',
      adapter: 'mockdapter',
      auth: 'mauth'
    }
  ]
  const options = {}
  const auths = [
    {
      id: 'mauth',
      authenticator: 'unknown',
      options
    }
  ]
  const authenticators = {}

  t.notThrows(() => {
    integreat({ services, schemas, auths }, { adapters, authenticators })
  })
})

test('should ignore null auth', async t => {
  const services = [
    {
      id: 'entries',
      adapter: 'mockdapter',
      auth: 'mauth'
    }
  ]
  const auths = [null]
  const authenticators = {}

  t.notThrows(() => {
    integreat({ services, schemas, auths }, { adapters, authenticators })
  })
})

// Tests -- on

test('should subscribe to event on service', t => {
  const great = integreat({ services, schemas, mappings }, { adapters })
  const cb = () => {}
  const onStub = sinon.stub(great.services.entries, 'on')

  great.on('mapToService', 'entries', cb)

  t.is(onStub.callCount, 1)
  t.is(onStub.args[0][0], 'mapToService')
  t.is(onStub.args[0][1], cb)
})

test('should not subscribe to anything for unknown service', t => {
  const great = integreat({ services, schemas, mappings }, { adapters })

  t.notThrows(() => {
    great.on('mapToService', 'unknown', () => {})
  })
})
