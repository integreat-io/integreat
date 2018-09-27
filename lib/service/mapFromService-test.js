import test from 'ava'
import createSchema from '../schema'
import createMapping from '../mapping'

import mapFromService from './mapFromService'

// Helpers

const schemas = {
  entry: createSchema({
    id: 'entry',
    attributes: {
      title: 'string',
      one: { type: 'integer', default: 1 },
      two: 'integer'
    },
    relationships: {
      service: 'service',
      author: 'account'
    }
  }),
  account: createSchema({
    id: 'account',
    attributes: { name: 'string' }
  })
}

const setupMapping = createMapping({ schemas })

const mappings = {
  entry: setupMapping({
    id: 'entry',
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
      service: '$params.service',
      author: '$access.ident.id'
    }
  }),
  account: setupMapping({
    id: 'account',
    type: 'account',
    service: 'entries',
    path: 'accounts[]',
    attributes: { id: 'id', name: 'name' }
  })
}

// Tests

test('should map and cast data', (t) => {
  const response = {
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'The heading', two: 2 }] }
  }
  const request = {
    params: { service: 'thenews', type: 'entry' },
    access: { ident: { id: 'johnf' } }
  }
  const expected = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'The heading',
      two: 2
    },
    relationships: {
      service: { id: 'thenews', type: 'service' },
      author: { id: 'johnf', type: 'account' }
    }
  }]

  const ret = mapFromService({ mappings })({ response, request })

  t.deepEqual(ret.data, expected)
})

test('should not map with status other than ok', (t) => {
  const response = {
    status: 'error',
    data: { items: [{ key: 'ent1', header: 'The heading', two: 2 }] }
  }
  const params = { service: 'thenews', type: 'entry' }

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.deepEqual(ret, response)
})

test('should cast data with defaults', (t) => {
  const response = {
    status: 'ok',
    data: { items: [{ key: 'ent1' }] }
  }
  const params = { type: 'entry', onlyMappedValues: false }

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.is(ret.data[0].attributes.one, 1)
})

test('should map and cast data that is not array', (t) => {
  const response = {
    status: 'ok',
    data: { items: { key: 'ent1' } }
  }
  const params = { type: 'entry' }

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should map and cast data of different types', (t) => {
  const response = {
    status: 'ok',
    data: {
      items: [{ key: 'ent1', header: 'The heading' }],
      accounts: [{ id: 'acc1', name: 'John' }]
    }
  }
  const params = { type: ['entry', 'account'] }
  const expected = [
    {
      id: 'ent1',
      type: 'entry',
      attributes: { title: 'The heading' },
      relationships: {}
    },
    {
      id: 'acc1',
      type: 'account',
      attributes: { name: 'John' },
      relationships: {}
    }
  ]

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.deepEqual(ret.data, expected)
})

test('should use all types when no type is provided', (t) => {
  const response = {
    status: 'ok',
    data: {
      items: [{ key: 'ent1', header: 'The heading' }],
      accounts: [{ id: 'acc1', name: 'John' }]
    }
  }
  const params = {}

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'acc1')
})

test('should skip unknown types', (t) => {
  const response = {
    status: 'ok',
    data: {}
  }
  const params = { type: 'unknown' }

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.deepEqual(ret.data, [])
})

test('should return empty array when no data', (t) => {
  const response = {
    status: 'ok',
    data: null
  }
  const params = { type: 'entry' }

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.deepEqual(ret.data, [])
})

test('should return empty array when path points to undefined', (t) => {
  const response = {
    status: 'ok',
    data: { items: null }
  }
  const params = { type: 'entry' }

  const ret = mapFromService({ mappings })({ response, request: { params } })

  t.deepEqual(ret.data, [])
})
