import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import userType from './datatypes/user'
import usersSource from './sources/users'
import johnfData from './data/userJohnf'

import integreat from '..'

test('should get one entry from source', async (t) => {
  const adapters = {json}
  const formatters = integreat.formatters()
  const datatypes = [userType]
  const sources = [usersSource]
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, {data: johnfData})
  const action = {
    type: 'GET_ONE',
    payload: {id: 'johnf', type: 'user'}
  }

  const great = integreat({sources, datatypes}, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.truthy(ret.data)
  t.is(ret.data.id, 'johnf')
  const attrs = ret.data.attributes
  t.truthy(attrs)
  t.is(attrs.username, 'johnf')
  t.is(attrs.firstname, 'John')
  t.is(attrs.lastname, 'Fjon')
  t.is(attrs.yearOfBirth, 1987)
  const rels = ret.data.relationships
  t.deepEqual(rels.feeds, [{id: 'news', type: 'feed'}, {id: 'social', type: 'feed'}])

  nock.restore()
})
