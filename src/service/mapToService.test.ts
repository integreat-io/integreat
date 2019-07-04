import test from 'ava'
import createSchema from '../schema'
import createMapping from '../mapping'
import createRequestMapper from '../endpoints/createRequestMapper'

import mapToService from './mapToService'

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
      service: 'service'
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
      service: '$params.service'
    }
  }),
  account: setupMapping({
    id: 'account',
    type: 'account',
    service: 'entries',
    path: 'accounts[]',
    attributes: { id: 'id' }
  })
}

// Tests

test('should map data', (t) => {
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: { title: 'The heading' },
    relationships: {
      service: { id: 'thenews', type: 'service' }
    }
  }
  const request = {
    action: 'SET',
    params: { service: 'thenews' },
    data,
    access: { ident: { id: 'johnf' } }
  }
  const expected = { items: [{ key: 'ent1', header: 'The heading' }] }

  const ret = mapToService()({ request, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map array of data', (t) => {
  const data = [{ id: 'ent1', type: 'entry', attributes: { title: 'The heading' }, relationships: {} }]
  const expected = { items: [{ key: 'ent1', header: 'The heading' }] }

  const ret = mapToService()({ request: { data }, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map array of data to top level', (t) => {
  const mappings = {
    entry: setupMapping({
      type: 'entry',
      service: 'entries',
      attributes: {
        id: 'key',
        title: 'header'
      }
    })
  }
  const data = [{ id: 'ent1', type: 'entry', attributes: { title: 'The heading' } }]
  const expected = [{ key: 'ent1', header: 'The heading' }]

  const ret = mapToService()({ request: { data }, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map array of data to top level with path', (t) => {
  const mappings = {
    entry: setupMapping({
      type: 'entry',
      service: 'entries',
      path: '[]',
      attributes: {
        id: 'key',
        title: 'header'
      }
    })
  }
  const data = [{ id: 'ent1', type: 'entry', attributes: { title: 'The heading' } }]
  const expected = [{ key: 'ent1', header: 'The heading' }]

  const ret = mapToService()({ request: { data }, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map data of different types', (t) => {
  const data = [
    { id: 'ent1', type: 'entry', attributes: {}, relationships: {} },
    { id: 'acc1', type: 'account', attributes: {}, relationships: {} },
    { id: 'ent2', type: 'entry', attributes: {}, relationships: {} }
  ]
  const expected = {
    items: [{ key: 'ent1' }, { key: 'ent2' }],
    accounts: [{ id: 'acc1' }]
  }

  const ret = mapToService()({ request: { data }, mappings })

  t.deepEqual(ret.data, expected)
})

test('should skip items with unknown type', (t) => {
  const data = [{ id: 'strange1', type: 'unknown' }]

  const ret = mapToService()({ request: { data }, mappings })

  t.is(ret.data, undefined)
})

test('should return undefined when no data', (t) => {
  const data = null

  const ret = mapToService()({ request: { data }, mappings })

  t.is(ret.data, undefined)
})

test('should return undefined when empty array', (t) => {
  const data = []

  const ret = mapToService()({ request: { data }, mappings })

  t.is(ret.data, undefined)
})

test('should return array of data when no path', (t) => {
  const mappings = {
    entry: setupMapping({
      type: 'entry',
      service: 'entries',
      attributes: { id: 'key' },
      relationships: {
        service: { param: 'service' }
      }
    })
  }
  const data = [
    { id: 'ent1', type: 'entry', attributes: {}, relationships: {} },
    { id: 'ent2', type: 'entry', attributes: {}, relationships: {} }
  ]
  const expected = [{ key: 'ent1' }, { key: 'ent2' }]

  const ret = mapToService()({ request: { data }, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map with request mapper', (t) => {
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: { title: 'The heading' },
    relationships: {
      service: { id: 'thenews', type: 'service' }
    }
  }
  const requestMapper = createRequestMapper({ requestMapping: 'content' })
  const request = {
    action: 'SET',
    params: { service: 'thenews' },
    data,
    endpoint: {},
    access: { ident: { id: 'johnf' } }
  }
  const expected = { content: { items: [{ key: 'ent1', header: 'The heading' }] } }

  const ret = mapToService()({ request, requestMapper, mappings })

  t.deepEqual(ret.data, expected)
})
