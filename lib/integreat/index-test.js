import test from 'ava'

import integreat from './index'

// Helpers

const sources = [{
  id: 'entries',
  adapter: 'mockdapter',
  endpoints: {one: 'http://some.api/entries/{id}'},
  items: [{
    type: 'entry',
    attributes: {id: {}, title: {path: 'headline'}, text: {path: 'body'}}
  }]
}]
const types = [{
  id: 'entry',
  source: 'entries',
  attributes: {title: 'string', text: 'string'}
}]

const adapters = {
  mockdapter: {
    retrieve: () => Promise.resolve({id: 'ent1', headline: 'The title', body: 'The text'}),
    normalize: (item, path) => Promise.resolve(item)
  }
}

// Tests

test('should exist', (t) => {
  t.is(typeof integreat, 'function')
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

test('should map type to source', async (t) => {
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
    endpoints: {one: 'http://some.api/entries/{id}'},
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

test.todo('should use auth')
