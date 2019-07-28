import test from 'ava'
import { mapTransform, set } from 'map-transform'
import createSchema from '../schema'
import functions from '../transformers'

import mapToService from './mapToService'

// Helpers

const schemas = {
  entry: createSchema({
    id: 'entry',
    fields: {
      title: 'string',
      one: { $cast: 'integer', $default: 1 },
      two: 'integer',
      service: 'service'
    }
  }),
  account: createSchema({
    id: 'account',
    fields: { name: 'string' }
  })
}

const entryMapping = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    one: 'one',
    two: 'two',
    service: '^params.service'
  },
  { $apply: 'cast_entry' },
  set('data')
]

const accountMapping = [
  'accounts[]',
  {
    $iterate: true,
    id: 'id',
    name: 'name'
  },
  { $apply: 'cast_account' },
  set('data')
]

const mapOptions = {
  pipelines: {
    cast_entry: schemas.entry.mapping,
    cast_account: schemas.account.mapping
  },
  functions: functions()
}

const mappings = {
  entry: mapTransform(entryMapping, mapOptions),
  account: mapTransform(accountMapping, mapOptions)
}

// Tests

test('should map data', t => {
  const data = {
    $schema: 'entry',
    id: 'ent1',
    title: 'The heading',
    service: { id: 'thenews', $ref: 'service' }
  }
  const request = {
    action: 'SET',
    params: { service: 'thenews' },
    endpoint: {},
    data,
    access: { ident: { id: 'johnf' } }
  }
  const expected = { items: [{ key: 'ent1', header: 'The heading' }] }

  const ret = mapToService()({ request, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map array of data', t => {
  const data = [
    {
      $schema: 'entry',
      id: 'ent1',
      title: 'The heading'
    }
  ]
  const request = { action: 'SET', params: {}, endpoint: {}, data }
  const expected = { items: [{ key: 'ent1', header: 'The heading' }] }

  const ret = mapToService()({ request, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map array of data to top level', t => {
  const mappings = {
    entry: mapTransform(
      [
        '[]',
        {
          $iterate: true,
          id: 'key',
          title: 'header'
        },
        { $apply: 'cast_entry' },
        set('data')
      ],
      mapOptions
    )
  }
  const data = [
    { id: 'ent1', $schema: 'entry', title: 'The heading' }
  ]
  const request = { action: 'SET', params: {}, endpoint: {}, data }
  const expected = [{ key: 'ent1', header: 'The heading' }]

  const ret = mapToService()({ request, mappings })

  t.deepEqual(ret.data, expected)
})

test('should map data of different types', t => {
  const data = [
    {
      $schema: 'entry',
      id: 'ent1'
    },
    {
      $schema: 'account',
      id: 'acc1'
    },
    {
      $schema: 'entry',
      id: 'ent2'
    }
  ]
  const request = { action: 'SET', params: {}, endpoint: {}, data }
  const expected = {
    items: [{ key: 'ent1' }, { key: 'ent2' }],
    accounts: [{ id: 'acc1' }]
  }

  const ret = mapToService()({ request, mappings })

  t.deepEqual(ret.data, expected)
})

test('should skip items with unknown type', t => {
  const data = [{ id: 'strange1', type: 'unknown' }]
  const request = { action: 'SET', params: {}, endpoint: {}, data }

  const ret = mapToService()({ request, mappings })

  t.is(ret.data, undefined)
})

test('should return undefined when no data', t => {
  const data = null
  const request = { action: 'SET', params: {}, endpoint: {}, data }

  const ret = mapToService()({ request, mappings })

  t.is(ret.data, undefined)
})

test('should return undefined when empty array', t => {
  const data = []
  const request = { action: 'SET', params: {}, endpoint: {}, data }

  const ret = mapToService()({ request, mappings })

  t.is(ret.data, undefined)
})

test('should map with request mapper', t => {
  const data = {
    $schema: 'entry',
    id: 'ent1',
    title: 'The heading',
    service: { id: 'thenews', $ref: 'service' }
  }
  const requestMapper = mapTransform(['data.content', set('data')])
  const request = {
    action: 'SET',
    params: { service: 'thenews' },
    endpoint: {},
    data,
    access: { ident: { id: 'johnf' } }
  }
  const expected = {
    content: { items: [{ key: 'ent1', header: 'The heading' }] }
  }

  const ret = mapToService()({ request, requestMapper, mappings })

  t.deepEqual(ret.data, expected)
})
