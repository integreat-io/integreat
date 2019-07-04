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
      actions: {
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
  const action = 'GET'
  const expected = {
    data,
    access: { status: 'granted', scheme: 'data', ident: null }
  }

  const ret = authorizeItems({ data, access, action }, schemas)

  t.deepEqual(ret, expected)
})

test('should return object as object', (t) => {
  const data = { id: 'ent1', type: 'entry', attriutes: { title: 'Entry 1' }, relationships: {} }
  const access = { ident: null }
  const action = 'GET'
  const expected = {
    data,
    access: { status: 'granted', scheme: 'data', ident: null }
  }

  const ret = authorizeItems({ data, access, action }, schemas)

  t.deepEqual(ret, expected)
})

test('should skip unauthorized data', (t) => {
  const data = [
    { id: 'johnf', type: 'account', attriutes: { name: 'John F.' }, relationships: {} },
    { id: 'betty', type: 'account', attriutes: { name: 'Betty' }, relationships: {} }
  ]
  const access = { ident: { id: 'johnf' } }
  const action = 'GET'
  const expectedData = [data[0]]
  const expectedAccess = { status: 'partially', scheme: 'data', ident: { id: 'johnf' } }

  const ret = authorizeItems({ data, access, action }, schemas)

  t.deepEqual(ret.data, expectedData)
  t.deepEqual(ret.access, expectedAccess)
})

test('should not allow no access scheme when auth is reqired', (t) => {
  const data = [
    { id: 'ent1', type: 'entry', attriutes: { title: 'Entry 1' }, relationships: {} },
    { id: 'ent2', type: 'entry', attriutes: { title: 'Entry 2' }, relationships: {} }
  ]
  const access = {}
  const action = 'GET'
  const auth = {}
  const expectedData = []
  const expectedAccess = { status: 'refused', scheme: 'data', ident: null }

  const ret = authorizeItems({ data, access, action, auth }, schemas)

  t.deepEqual(ret.data, expectedData)
  t.deepEqual(ret.access, expectedAccess)
})

test('should authorized with access scheme for action', (t) => {
  const data = [
    { id: 'johnf', type: 'account', attriutes: { name: 'John F.' }, relationships: {} },
    { id: 'betty', type: 'account', attriutes: { name: 'Betty' }, relationships: {} }
  ]
  const access = null
  const action = 'TEST'
  const auth = {}
  const expectedAccess = { status: 'granted', scheme: 'data', ident: null }

  const ret = authorizeItems({ data, access, action, auth }, schemas)

  t.deepEqual(ret.data, data)
  t.deepEqual(ret.access, expectedAccess)
})

test('should not authorize empty data array', (t) => {
  const data = []
  const access = { ident: { id: 'johnf' } }
  const action = 'GET'
  const expected = {}

  const ret = authorizeItems({ data, access, action }, schemas)

  t.deepEqual(ret, expected)
})

test('should not authorize when no data', (t) => {
  const access = { ident: { id: 'johnf' } }
  const action = 'GET'
  const expected = {}

  const ret = authorizeItems({ access, action }, schemas)

  t.deepEqual(ret, expected)
})

test('should not authorize when already refused', (t) => {
  const data = [{ id: 'ent1', type: 'entry' }]
  const access = { status: 'refused' }
  const action = 'GET'
  const expected = {}

  const ret = authorizeItems({ data, access, action }, schemas)

  t.deepEqual(ret, expected)
})
