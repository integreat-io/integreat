import test from 'ava'

import integreat from './index'

// Helpers

const sources = [{
  id: 'entries',
  adapter: 'mockdapter',
  endpoints: {one: {uri: 'http://some.api/entries/{id}'}},
  items: [{
    type: 'entry',
    attributes: [
      {key: 'id'},
      {key: 'title', path: 'headline'},
      {key: 'text', path: 'body'},
      {key: 'age'},
      {key: 'unknown'}
    ],
    relationships: [
      {key: 'author', path: 'creator'}
    ]
  }]
}]
const types = [{
  id: 'entry',
  source: 'entries',
  attributes: {
    id: {type: 'string'},
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
        id: 'ent1',
        headline: 'The title',
        body: 'The text',
        age: '36',
        unknown: 'Mr. X',
        creator: 'john'
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

test('should use type to find the right source', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat(sources, types, {adapters})
  const ret = await great.dispatch(action)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  const item = ret[0]
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

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  const item = ret[0]
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

  t.true(Array.isArray(ret))
  t.is(ret.length, 0)
})

test('should use auth', async (t) => {
  const sources = [{
    id: 'entries',
    adapter: 'mockdapter',
    auth: 'mauth',
    endpoints: {one: {uri: 'http://some.api/entries/{id}'}},
    items: [{
      type: 'entry',
      attributes: [{key: 'id'}, {key: 'title', path: 'headline'}, {key: 'text', path: 'body'}]
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

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  const item = ret[0]
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

  const item = ret[0]
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

  const item = ret[0]
  t.is(item.id, 'ent1')
  t.truthy(item.relationships)
  t.deepEqual(item.relationships.author, {id: 'john', type: 'user'})
})
