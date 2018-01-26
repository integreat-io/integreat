import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import defs from './defs'
import entriesData from './data/entries'

import integreat from '..'

test('should get all entries from source', async (t) => {
  const adapters = {json}
  const formatters = integreat.formatters()
  nock('http://some.api')
    .get('/entries/')
    .reply(200, {data: entriesData})
  const action = {
    type: 'GET',
    payload: {type: 'entry'}
  }

  const great = integreat(defs, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 3)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'ent2')
  t.is(ret.data[2].id, 'ent3')

  nock.restore()
})
