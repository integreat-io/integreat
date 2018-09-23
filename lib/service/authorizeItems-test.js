import test from 'ava'
import createSchema from '../schema'

import authorizeItems from './authorizeItems'

// Helpers

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
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
    attributes: {
      name: 'string'
    },
    access: {
      identFromField: 'id',
      methods: {
        TEST: 'all'
      }
    }
  })
}

// Tests

test('should return all authorized data', (t) => {
  const data = [
    { id: 'ent1', type: 'entry', attributes: { title: 'Entry 1' }, relationships: {} },
    { id: 'ent2', type: 'entry', attributes: { title: 'Entry 2' }, relationships: {} }
  ]
  const access = null
  const method = 'QUERY'
  const expected = {
    data,
    access: { status: 'granted', scheme: 'data', ident: null }
  }

  const ret = authorizeItems({ data, access, method }, schemas)

  t.deepEqual(ret, expected)
})

test('should return object as object', (t) => {
  const data = { id: 'ent1', type: 'entry', attriutes: { title: 'Entry 1' }, relationships: {} }
  const access = { ident: null }
  const method = 'QUERY'
  const expected = {
    data,
    access: { status: 'granted', scheme: 'data', ident: null }
  }

  const ret = authorizeItems({ data, access, method }, schemas)

  t.deepEqual(ret, expected)
})

test('should skip unauthorized data', (t) => {
  const data = [
    { id: 'johnf', type: 'account', attriutes: { name: 'John F.' }, relationships: {} },
    { id: 'betty', type: 'account', attriutes: { name: 'Betty' }, relationships: {} }
  ]
  const access = { ident: { id: 'johnf' } }
  const method = 'QUERY'
  const expected = {
    data: [data[0]],
    access: { status: 'partially', scheme: 'data', ident: { id: 'johnf' } }
  }

  const ret = authorizeItems({ data, access, method }, schemas)

  t.deepEqual(ret, expected)
})

test('should not allow no access scheme when auth is reqired', (t) => {
  const data = [
    { id: 'ent1', type: 'entry', attriutes: { title: 'Entry 1' }, relationships: {} },
    { id: 'ent2', type: 'entry', attriutes: { title: 'Entry 2' }, relationships: {} }
  ]
  const access = {}
  const method = 'QUERY'
  const auth = {}
  const expected = {
    data: [],
    access: { status: 'refused', scheme: 'data', ident: null }
  }

  const ret = authorizeItems({ data, access, method, auth }, schemas)

  t.deepEqual(ret, expected)
})

test('should authorized with access scheme for method', (t) => {
  const data = [
    { id: 'johnf', type: 'account', attriutes: { name: 'John F.' }, relationships: {} },
    { id: 'betty', type: 'account', attriutes: { name: 'Betty' }, relationships: {} }
  ]
  const access = null
  const method = 'TEST'
  const auth = {}
  const expected = {
    data,
    access: { status: 'granted', scheme: 'data', ident: null }
  }

  const ret = authorizeItems({ data, access, method, auth }, schemas)

  t.deepEqual(ret, expected)
})

test('should not authorize empty data array', (t) => {
  const data = []
  const access = { ident: { id: 'johnf' } }
  const method = 'QUERY'
  const expected = {}

  const ret = authorizeItems({ data, access, method }, schemas)

  t.deepEqual(ret, expected)
})

test('should not authorize when no data', (t) => {
  const access = { ident: { id: 'johnf' } }
  const method = 'QUERY'
  const expected = {}

  const ret = authorizeItems({ access, method }, schemas)

  t.deepEqual(ret, expected)
})

test('should not authorize when already refused', (t) => {
  const data = [{ id: 'ent1', type: 'entry' }]
  const access = { status: 'refused' }
  const method = 'QUERY'
  const expected = {}

  const ret = authorizeItems({ data, access, method }, schemas)

  t.deepEqual(ret, expected)
})
