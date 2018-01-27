import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import defs from './defs'
import johnfData from './data/userJohnf'

import integreat from '..'

test('should get with ident token', async (t) => {
  const adapters = {json}
  const formatters = integreat.formatters()
  nock('http://some.api')
    .get('/users')
      .query({tokens: 'twitter|23456'})
      .reply(200, {data: {...johnfData}})
    .get('/users/johnf')
      .reply(200, {data: {...johnfData}})
  const action = {
    type: 'GET',
    payload: {id: 'johnf', type: 'user'},
    meta: {ident: {token: 'twitter|23456'}}
  }

  const great = integreat(defs, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data[0].id, 'johnf')

  nock.restore()
})
