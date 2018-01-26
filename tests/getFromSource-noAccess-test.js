import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import defs from './defs'
import johnfData from './data/userJohnf'

import integreat from '..'

test('should get one entry from source', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  const adapters = {json}
  const formatters = integreat.formatters()
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, {data: {...johnfData, createdAt, updatedAt}})
  const action = {
    type: 'GET',
    payload: {id: 'johnf', type: 'user'}
  }

  const great = integreat(defs, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)

  nock.restore()
})
