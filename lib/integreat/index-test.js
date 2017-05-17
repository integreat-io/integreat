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
  const great = integreat({sources, types, adapters})

  t.truthy(great)
  t.is(typeof great.dispatch, 'function')
})

test('should throw when no sources', (t) => {
  t.throws(() => {
    integreat({types, adapters})
  })
})

test('should throw when no types', (t) => {
  t.throws(() => {
    integreat({sources, adapters})
  })
})

test('should map type to source', async (t) => {
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry'}}

  const great = integreat({sources, types, adapters})
  const ret = await great.dispatch(action)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  const item = ret[0]
  t.is(item.id, 'ent1')
  t.truthy(item.attributes)
  t.is(item.attributes.title, 'The title')
  t.is(item.attributes.text, 'The text')
})
