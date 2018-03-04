import test from 'ava'
import createDatatype from '../datatype'
import createMapping from '../mapping'

import mapFromSource from './mapFromSource'

// Helpers

const datatypes = {
  entry: createDatatype({
    id: 'entry',
    attributes: {
      title: 'string',
      one: {type: 'integer', default: 1},
      two: 'integer'
    },
    relationships: {
      source: 'source'
    }
  }),
  account: createDatatype({
    id: 'account',
    attributes: {name: 'string'}
  })
}

const mappings = {
  entry: createMapping({
    type: 'entry',
    source: 'entries',
    path: 'items[]',
    attributes: {
      id: 'key',
      title: 'header',
      one: 'one',
      two: 'two'
    },
    relationships: {
      source: {param: 'source'}
    }
  }, {datatypes}),
  account: createMapping({
    type: 'account',
    source: 'entries',
    path: 'accounts[]',
    attributes: {id: 'id', name: 'name'}
  }, {datatypes})
}

// Tests

test('should map and cast data', (t) => {
  const data = {items: [{key: 'ent1', header: 'The heading', two: 2}]}
  const params = {source: 'thenews', type: 'entry'}
  const expected = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'The heading',
      two: 2
    },
    relationships: {
      source: {id: 'thenews', type: 'source'}
    }
  }]

  const ret = mapFromSource(data, mappings, {params})

  t.deepEqual(ret, expected)
})

test('should cast data with defaults', (t) => {
  const data = {items: [{key: 'ent1'}]}
  const params = {type: 'entry'}

  const ret = mapFromSource(data, mappings, {params, useDefaults: true})

  t.is(ret[0].attributes.one, 1)
})

test('should map and cast data that is not array', (t) => {
  const data = {items: {key: 'ent1'}}
  const params = {type: 'entry'}

  const ret = mapFromSource(data, mappings, {params})

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should map and cast data of different types', (t) => {
  const data = {
    items: [{key: 'ent1', header: 'The heading'}],
    accounts: [{id: 'acc1', name: 'John'}]
  }
  const params = {type: ['entry', 'account']}
  const expected = [
    {
      id: 'ent1',
      type: 'entry',
      attributes: {title: 'The heading'},
      relationships: {}
    },
    {
      id: 'acc1',
      type: 'account',
      attributes: {name: 'John'},
      relationships: {}
    }
  ]

  const ret = mapFromSource(data, mappings, {params})

  t.deepEqual(ret, expected)
})

test('should use all types when no type is provided', (t) => {
  const data = {
    items: [{key: 'ent1', header: 'The heading'}],
    accounts: [{id: 'acc1', name: 'John'}]
  }
  const params = {}

  const ret = mapFromSource(data, mappings, {params})

  t.is(ret.length, 2)
  t.is(ret[0].id, 'ent1')
  t.is(ret[1].id, 'acc1')
})

test('should skip unknown types', (t) => {
  const data = {}
  const params = {type: 'unknown'}

  const ret = mapFromSource(data, mappings, {params})

  t.deepEqual(ret, [])
})

test('should return empty array when no data', (t) => {
  const data = null
  const params = {type: 'entry'}

  const ret = mapFromSource(data, mappings, {params})

  t.deepEqual(ret, [])
})

test('should return empty array when path points to undefined', (t) => {
  const data = {items: null}
  const params = {type: 'entry'}

  const ret = mapFromSource(data, mappings, {params})

  t.deepEqual(ret, [])
})
