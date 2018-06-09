import test from 'ava'
import createDatatype from '../datatype'
import createMapping from '../mapping'

import mapToService from './mapToService'

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
      service: 'service'
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
    service: 'entries',
    path: 'items[]',
    attributes: {
      id: 'key',
      title: 'header',
      one: 'one',
      two: 'two'
    },
    relationships: {
      service: {param: 'service'}
    }
  }, {datatypes}),
  account: createMapping({
    type: 'account',
    service: 'entries',
    path: 'accounts[]',
    attributes: {id: 'id'}
  }, {datatypes})
}

// Tests

test('should map data', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'The heading'}, relationships: {}}
  const expected = {items: [{key: 'ent1', header: 'The heading'}]}

  const ret = mapToService(data, mappings)

  t.deepEqual(ret, expected)
})

test('should map array of data', (t) => {
  const data = [{id: 'ent1', type: 'entry', attributes: {title: 'The heading'}, relationships: {}}]
  const expected = {items: [{key: 'ent1', header: 'The heading'}]}

  const ret = mapToService(data, mappings)

  t.deepEqual(ret, expected)
})

test('should map array of data to top level', (t) => {
  const mappings = {
    entry: createMapping({
      type: 'entry',
      service: 'entries',
      attributes: {
        id: 'key',
        title: 'header'
      }
    }, {datatypes})
  }
  const data = [{id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}]
  const expected = [{key: 'ent1', header: 'The heading'}]

  const ret = mapToService(data, mappings)

  t.deepEqual(ret, expected)
})

test('should map array of data to top level with path', (t) => {
  const mappings = {
    entry: createMapping({
      type: 'entry',
      service: 'entries',
      path: '[]',
      attributes: {
        id: 'key',
        title: 'header'
      }
    }, {datatypes})
  }
  const data = [{id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}]
  const expected = [{key: 'ent1', header: 'The heading'}]

  const ret = mapToService(data, mappings)

  t.deepEqual(ret, expected)
})

test('should map data of different types', (t) => {
  const data = [
    {id: 'ent1', type: 'entry', attributes: {}, relationships: {}},
    {id: 'acc1', type: 'account', attributes: {}, relationships: {}},
    {id: 'ent2', type: 'entry', attributes: {}, relationships: {}}
  ]
  const expected = {
    items: [{key: 'ent1'}, {key: 'ent2'}],
    accounts: [{id: 'acc1'}]
  }

  const ret = mapToService(data, mappings)

  t.deepEqual(ret, expected)
})

test('should skip items with unknown type', (t) => {
  const data = [{id: 'strange1', type: 'unknown'}]

  const ret = mapToService(data, mappings)

  t.is(ret, undefined)
})

test('should return undefined when no data', (t) => {
  const data = null

  const ret = mapToService(data, mappings)

  t.is(ret, undefined)
})

test('should return undefined when empty array', (t) => {
  const data = []

  const ret = mapToService(data, mappings)

  t.is(ret, undefined)
})

test('should return array of data when no path', (t) => {
  const mappings = {
    entry: createMapping({
      type: 'entry',
      service: 'entries',
      attributes: {id: 'key'},
      relationships: {
        service: {param: 'service'}
      }
    }, {datatypes})
  }
  const data = [
    {id: 'ent1', type: 'entry', attributes: {}, relationships: {}},
    {id: 'ent2', type: 'entry', attributes: {}, relationships: {}}
  ]
  const expected = [{key: 'ent1'}, {key: 'ent2'}]

  const ret = mapToService(data, mappings)

  t.deepEqual(ret, expected)
})
