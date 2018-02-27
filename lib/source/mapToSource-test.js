import test from 'ava'
import createDatatype from '../datatype'
import createMapping from '../mapping'

import mapToSource from './mapToSource'

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
    attributes: {id: 'id'}
  }, {datatypes})
}

// Tests

test('should map data', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}
  const expected = {items: [{key: 'ent1', header: 'The heading'}]}

  const ret = mapToSource(data, mappings)

  t.deepEqual(ret, expected)
})

test('should map array of data', (t) => {
  const data = [{id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}]
  const expected = {items: [{key: 'ent1', header: 'The heading'}]}

  const ret = mapToSource(data, mappings)

  t.deepEqual(ret, expected)
})

test('should map data of different types', (t) => {
  const data = [
    {id: 'ent1', type: 'entry'},
    {id: 'acc1', type: 'account'},
    {id: 'ent2', type: 'entry'}
  ]
  const expected = {
    items: [{key: 'ent1'}, {key: 'ent2'}],
    accounts: [{id: 'acc1'}]
  }

  const ret = mapToSource(data, mappings)

  t.deepEqual(ret, expected)
})

test('should skip items with unknown type', (t) => {
  const data = [{id: 'strange1', type: 'unknown'}]

  const ret = mapToSource(data, mappings)

  t.is(ret, undefined)
})

test('should return undefined when no data', (t) => {
  const data = null

  const ret = mapToSource(data, mappings)

  t.is(ret, undefined)
})

test('should return undefined when empty array', (t) => {
  const data = []

  const ret = mapToSource(data, mappings)

  t.is(ret, undefined)
})

test('should return array of data when no path', (t) => {
  const mappings = {
    entry: createMapping({
      type: 'entry',
      source: 'entries',
      attributes: {id: 'key'},
      relationships: {
        source: {param: 'source'}
      }
    }, {datatypes})
  }
  const data = [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]
  const expected = [{key: 'ent1'}, {key: 'ent2'}]

  const ret = mapToSource(data, mappings)

  t.deepEqual(ret, expected)
})
