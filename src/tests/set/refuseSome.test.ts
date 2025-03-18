import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Setup

const johnfItem = {
  $type: 'user',
  id: 'johnf',
  username: 'johnf',
}
const bettyItem = {
  $type: 'user',
  id: 'betty',
  username: 'betty',
}

// Tests

// Waiting for authentication to service and a solution on how to treat return from SET
test('should refuse to set entries where ident has no access', async () => {
  nock('http://some.api').post('/users').reply(201, { ok: true })
  const action = {
    type: 'SET',
    payload: { type: 'user', data: [johnfItem, bettyItem] },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  const data = ret.data
  assert.equal(Array.isArray(data), false)
  assert.equal(data, undefined)

  nock.restore()
})
