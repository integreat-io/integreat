import test from 'ava'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import johnfData from '../helpers/data/userJohnf.js'
import bettyData from '../helpers/data/userBetty.js'
import type { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setups

test.after.always(() => {
  nock.restore()
})

const createdAt = '2017-11-18T18:43:01Z'
const updatedAt = '2017-11-24T07:11:43Z'

// Tests

test('should respond with noaccess when no ident', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'user' },
    meta: {}, // No ident
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(ret.error, "Authentication was refused for type 'user'")
  t.is(ret.reason, 'NO_IDENT')
  t.is(ret.origin, 'auth:action')
  t.falsy(ret.data)
})

test('should respond with noaccess for schema with no access method', async (t) => {
  const defsWithoutAccessMethod = {
    ...defs,
    schemas: defs.schemas.map((schema) =>
      schema.id === 'user' ? { ...schema, access: undefined } : schema
    ),
  }
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'user' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defsWithoutAccessMethod, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(ret.error, "Authentication was refused for type 'user'")
  t.is(ret.reason, 'ACCESS_METHOD_REQUIRED')
  t.is(ret.origin, 'auth:action')
  t.falsy(ret.data)
})

test('should respond with only authorized data', async (t) => {
  nock('http://some.api')
    .get('/users')
    .reply(200, {
      data: [
        { ...johnfData, createdAt, updatedAt },
        { ...bettyData, createdAt, updatedAt },
      ],
    })
  const action = {
    type: 'GET',
    payload: { type: 'user' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAccess = {
    ident: { id: 'johnf' },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access, expectedAccess)
  const data = ret.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
})
