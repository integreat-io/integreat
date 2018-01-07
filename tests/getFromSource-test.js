import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import userType from './datatypes/user'
import usersSource from './sources/users'
import usersMapping from './mappings/users-user'
import johnfData from './data/userJohnf'

import integreat from '..'

test('should get one entry from source', async (t) => {
  const adapters = {json}
  const formatters = integreat.formatters()
  const datatypes = [userType]
  const sources = [usersSource]
  const mappings = [usersMapping]
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, {data: johnfData})
  const action = {
    type: 'GET',
    payload: {id: 'johnf', type: 'user'}
  }

  const great = integreat({sources, datatypes, mappings}, {adapters, formatters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  const item = ret.data[0]
  t.is(item.id, 'johnf')
  const attrs = item.attributes
  t.truthy(attrs)
  t.is(attrs.username, 'johnf')
  t.is(attrs.firstname, 'John')
  t.is(attrs.lastname, 'Fjon')
  t.is(attrs.yearOfBirth, 1987)
  const rels = item.relationships
  t.deepEqual(rels.feeds, [{id: 'news', type: 'feed'}, {id: 'social', type: 'feed'}])

  nock.restore()
})
