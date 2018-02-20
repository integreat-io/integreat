import test from 'ava'
import nock from 'nock'
import json from '../../lib/adapters/json'
import defs from '../helpers/defs'
import johnfData from '../helpers/data/userJohnf'

import integreat from '../..'

test('should get one entry from source', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  const adapters = {json}
  nock('http://some.api')
    .get('/users/johnf').times(2)
    .reply(200, {data: {...johnfData, createdAt, updatedAt}})
  const action = {
    type: 'GET',
    payload: {id: 'johnf', type: 'user'},
    meta: {ident: {id: 'johnf'}}
  }
  const expected = [{
    id: 'johnf',
    type: 'user',
    attributes: {
      username: 'johnf',
      firstname: 'John',
      lastname: 'Fjon',
      yearOfBirth: 1987,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      roles: ['editor'],
      tokens: ['twitter|23456', 'facebook|12345']
    },
    relationships: {
      feeds: [
        {id: 'news', type: 'feed'},
        {id: 'social', type: 'feed'}
      ]
    }
  }]

  const great = integreat(defs, {adapters})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)

  nock.restore()
})
