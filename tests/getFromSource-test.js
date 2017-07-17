import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import userType from './types/user'
import usersSource from './sources/users'
import johnfData from './data/userJohnf'

import integreat from '..'

test('should get one entry from source', async (t) => {
  const adapters = {json}
  const formatters = integreat.formatters()
  const types = [userType]
  const sources = [usersSource]
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, {data: johnfData})
  const action = {
    type: 'GET',
    payload: {id: 'johnf', type: 'user'}
  }

  const great = integreat({sources, types, adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'johnf')
  const attrs = ret.data[0].attributes
  t.truthy(attrs)
  t.is(attrs.username, 'johnf')
  t.is(attrs.firstname, 'John')
  t.is(attrs.lastname, 'Fjon')
  t.is(attrs.yearOfBirth, 1987)

  nock.restore()
})
