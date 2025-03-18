import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import johnfData from '../helpers/data/userJohnf.js'
import bettyData from '../helpers/data/userBetty.js'
import type { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setups

test('noAccess', async (t) => {
  t.after(() => {
    nock.restore()
  })

  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'

  // Tests

  await t.test('should respond with noaccess when no ident', async () => {
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

    assert.equal(ret.status, 'noaccess', ret.error)
    assert.equal(ret.error, "Authentication was refused for type 'user'")
    assert.equal(ret.reason, 'NO_IDENT')
    assert.equal(ret.origin, 'auth:action')
    assert.equal(!!ret.data, false)
  })

  await t.test(
    'should respond with noaccess for schema with no access method',
    async () => {
      const defsWithoutAccessMethod = {
        ...defs,
        schemas: defs.schemas.map((schema) =>
          schema.id === 'user' ? { ...schema, access: undefined } : schema,
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

      assert.equal(ret.status, 'noaccess', ret.error)
      assert.equal(ret.error, "Authentication was refused for type 'user'")
      assert.equal(ret.reason, 'ACCESS_METHOD_REQUIRED')
      assert.equal(ret.origin, 'auth:action')
      assert.equal(!!ret.data, false)
    },
  )

  await t.test('should respond with only authorized data', async () => {
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

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access, expectedAccess)
    const data = ret.data as TypedData[]
    assert.equal(data.length, 1)
    assert.equal(data[0].id, 'johnf')
  })
})
