import test from 'ava'
import nock from 'nock'
import json from '../lib/adapters/json'
import standardTransforms from '../lib/transforms'
import userType from './types/user'
import usersSource from './sources/users'

import integreat from '../lib/integreat'

test('should get error object for unknown entry', async (t) => {
  const adapters = {json}
  const transforms = standardTransforms()
  const types = [userType]
  const sources = [usersSource]
  nock('http://some.api')
    .get('/users/janedoe')
    .reply(404)
  const action = {
    type: 'GET',
    payload: {id: 'janedoe', type: 'user'}
  }

  const great = integreat({sources, types, adapters, transforms})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')

  nock.restore()
})
