import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat = require('../../..')

// Helpers

const johnfItem = {
  $type: 'user',
  id: 'johnf',
  username: 'johnf'
}
const bettyItem = {
  $type: 'user',
  id: 'betty',
  username: 'betty'
}

// Tests

test('should refuse to set entries where ident has no access', async t => {
  const adapters = { json }
  nock('http://some.api')
    .post('/users/')
    .reply(201, { ok: true })
  const action = {
    type: 'SET',
    payload: { type: 'user', data: [johnfItem, bettyItem] },
    meta: { ident: { id: 'johnf' } }
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'johnf')

  nock.restore()
})
