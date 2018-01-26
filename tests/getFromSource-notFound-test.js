import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import defs from './defs'

import integreat from '..'

test('should get error object for unknown entry', async (t) => {
  const adapters = {json}
  const formatters = integreat.formatters()
  nock('http://some.api')
    .get('/entries/ent0')
    .reply(404)
  const action = {
    type: 'GET',
    payload: {id: 'ent0', type: 'entry'}
  }

  const great = integreat(defs, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'notfound', ret.error)
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')

  nock.restore()
})
