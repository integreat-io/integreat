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
  const params = {source: 'thenews'}
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

  const ret = mapFromSource(data, mappings, {type: 'entry', params})

  t.deepEqual(ret, expected)
})

test('should cast data with defaults', (t) => {
  const data = {items: [{key: 'ent1'}]}

  const ret = mapFromSource(data, mappings, {type: 'entry', useDefaults: true})

  t.is(ret[0].attributes.one, 1)
})

test('should map and cast data that is not array', (t) => {
  const data = {items: {key: 'ent1'}}

  const ret = mapFromSource(data, mappings, {type: 'entry'})

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should map and cast data of different types', (t) => {
  const data = {
    items: [{key: 'ent1', header: 'The heading'}],
    accounts: [{id: 'acc1', name: 'John'}]
  }
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

  const ret = mapFromSource(data, mappings, {type: ['entry', 'account']})

  t.deepEqual(ret, expected)
})

test('should return empty array when no type', (t) => {
  const data = {}

  const ret = mapFromSource(data, mappings, {type: null})

  t.deepEqual(ret, [])
})

test('should skip unknown types', (t) => {
  const data = {}

  const ret = mapFromSource(data, mappings, {type: 'unknown'})

  t.deepEqual(ret, [])
})

test('should return empty array when no data', (t) => {
  const data = null

  const ret = mapFromSource(data, mappings, {type: 'entry'})

  t.deepEqual(ret, [])
})

test('should return empty array when path points to undefined', (t) => {
  const data = {items: null}

  const ret = mapFromSource(data, mappings, {type: 'entry'})

  t.deepEqual(ret, [])
})
