import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import userType from './datatypes/user'
import usersSource from './sources/users'
import usersData from './data/users'

import integreat from '..'

test('should get all entries from source', async (t) => {
  const adapters = {json}
  const formatters = integreat.formatters()
  const datatypes = [userType]
  const sources = [usersSource]
  nock('http://some.api')
    .get('/users/')
    .reply(200, {data: usersData})
  const action = {
    type: 'GET',
    payload: {type: 'user'}
  }

  const great = integreat({sources, datatypes}, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 3)
  t.is(ret.data[0].id, 'betty')
  t.is(ret.data[1].id, 'james')
  t.is(ret.data[2].id, 'johnf')

  nock.restore()
})
