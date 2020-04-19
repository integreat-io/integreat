import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'
import entriesData from '../helpers/data/entries'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

// Tests

test('should get all entries from service', async t => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries')
    .reply(200, { data: entriesData })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const great = Integreat.create(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 3)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'ent2')
  t.is(ret.data[2].id, 'ent3')

  nock.restore()
})