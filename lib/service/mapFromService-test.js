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
  const request = {
    method: 'QUERY',
    params: { service: 'thenews', type: 'entry' },
    access: { ident: { id: 'johnf' } }
  }
  const response = {
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'The heading', two: 2 }] }
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
  const request = {
    method: 'QUERY',
    params: { service: 'thenews', type: 'entry' }
  }
  const response = {
    status: 'error',
    data: { items: [{ key: 'ent1', header: 'The heading', two: 2 }] }
  }

  const ret = mapFromService({ mappings })({ response, request })

  t.deepEqual(ret, response)
})

test('should cast data with defaults', (t) => {
  const request = {
    method: 'QUERY',
    params: { type: 'entry', onlyMappedValues: false }
  }
  const response = {
    status: 'ok',
    data: { items: [{ key: 'ent1' }] }
  }

  const ret = mapFromService({ mappings })({ response, request })

  t.is(ret.data[0].attributes.one, 1)
})

test('should map and cast data that is not array', (t) => {
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const response = {
    status: 'ok',
    data: { items: { key: 'ent1' } }
  }

  const ret = mapFromService({ mappings })({ response, request })

  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should map and cast data of different types', (t) => {
  const request = {
    method: 'QUERY',
    params: { type: ['entry', 'account'] }
  }
  const response = {
    status: 'ok',
    data: {
      items: [{ key: 'ent1', header: 'The heading' }],
      accounts: [{ id: 'acc1', name: 'John' }]
    }
  }
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

  const ret = mapFromService({ mappings })({ response, request })

  t.deepEqual(ret.data, expected)
})

test('should use all types when no type is provided', (t) => {
  const request = {
    method: 'QUERY',
    params: {}
  }
  const response = {
    status: 'ok',
    data: {
      items: [{ key: 'ent1', header: 'The heading' }],
      accounts: [{ id: 'acc1', name: 'John' }]
    }
  }

  const ret = mapFromService({ mappings })({ response, request })

  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'acc1')
})

test('should use status code and error from mapping', (t) => {
  const request = {
    method: 'QUERY',
    params: { service: 'thenews', type: 'entry' },
    access: { ident: { id: 'johnf' } }
  }
  const response = {
    status: 'ok',
    data: {
      data: [{ key: 'ent1', header: 'The heading', two: 2 }],
      status: 'error',
      error: 'Well. It failed'
    },
    access: { ident: { id: 'johnf' } }
  }
  const responseMapper = ({ data }) => data

  const ret = mapFromService({ mappings })({ response, request, responseMapper })

  t.is(ret.status, 'error')
  t.is(ret.error, 'Well. It failed')
  t.is(typeof ret.data, 'undefined')
  t.deepEqual(ret.access, { ident: { id: 'johnf' } })
})

test('should map data without returning status code', (t) => {
  const request = {
    method: 'QUERY',
    params: { service: 'thenews', type: 'entry' },
    access: { ident: { id: 'johnf' } }
  }
  const response = {
    status: 'ok',
    data: {
      data: [{ key: 'ent1', header: 'The heading', two: 2 }],
      status: 'error',
      error: 'Well. It failed'
    },
    access: { ident: { id: 'johnf' } }
  }
  const responseMapper = ({ data }) => ({ data: data.data })

  const ret = mapFromService({ mappings })({ response, request, responseMapper })

  t.is(ret.status, 'ok')
  t.truthy(ret.data)
  t.falsy(ret.error)
  t.deepEqual(ret.access, { ident: { id: 'johnf' } })
})

test('should map and cast data from mutation', (t) => {
  const responseMapper = ({ data }) => ({ data })
  const request = {
    method: 'MUTATION',
    params: { service: 'thenews', type: 'entry' },
    data: [{
      id: 'random',
      type: 'entry',
      attributes: {
        title: 'The heading'
      },
      relationships: {
        service: { id: 'thenews', type: 'service' },
        author: { id: 'johnf', type: 'account' }
      }
    }],
    access: { ident: { id: 'johnf' } }
  }
  const response = {
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'The heading', two: 2 }] }
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

  const ret = mapFromService({ mappings })({ response, request, responseMapper })

  t.deepEqual(ret.data, expected)
})

test('should not map and cast data from mutation when no responseMapper', (t) => {
  const request = {
    method: 'MUTATION',
    params: { service: 'thenews', type: 'entry' },
    data: [{
      id: 'random',
      type: 'entry',
      attributes: {
        title: 'The heading'
      },
      relationships: {
        service: { id: 'thenews', type: 'service' },
        author: { id: 'johnf', type: 'account' }
      }
    }],
    access: { ident: { id: 'johnf' } }
  }
  const response = {
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'The heading', two: 2 }] }
  }
  const expected = []

  const ret = mapFromService({ mappings })({ response, request })

  t.deepEqual(ret.data, expected)
})

test('should skip unknown types', (t) => {
  const request = {
    method: 'QUERY',
    params: { type: 'unknown' }
  }
  const response = {
    status: 'ok',
    data: {}
  }

  const ret = mapFromService({ mappings })({ response, request })

  t.deepEqual(ret.data, [])
})

test('should return empty array when no data', (t) => {
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const response = {
    status: 'ok',
    data: null
  }

  const ret = mapFromService({ mappings })({ response, request })

  t.deepEqual(ret.data, [])
})

test('should return empty array when path points to undefined', (t) => {
  const request = {
    method: 'QUERY',
    params: { type: 'entry' }
  }
  const response = {
    status: 'ok',
    data: { items: null }
  }

  const ret = mapFromService({ mappings })({ response, request })

  t.deepEqual(ret.data, [])
})
