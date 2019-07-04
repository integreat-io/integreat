import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat = require('../..')

// Helpers

const johnfItem = {
  id: 'johnf',
  type: 'user',
  attributes: {
    username: 'johnf'
  },
  relationships: {}
}
const bettyItem = {
  id: 'betty',
  type: 'user',
  attributes: {
    username: 'betty'
  },
  relationships: {}
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
