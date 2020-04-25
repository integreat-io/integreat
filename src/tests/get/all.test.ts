import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'
import entriesData from '../helpers/data/entries'
import { TypedData } from '../../types'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

// Tests

test('should get all entries from service', async (t) => {
  const adapters = { json }
  nock('http://some.api').get('/entries').reply(200, { data: entriesData })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data.length, 3)
  t.is(data[0].id, 'ent1')
  t.is(data[1].id, 'ent2')
  t.is(data[2].id, 'ent3')

  nock.restore()
})
