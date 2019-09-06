import test from 'ava'
import sinon from 'sinon'
import nock from 'nock'
import json from 'integreat-adapter-json'
import tokenAuth from '../../lib/authenticators/token'
import defs from '../helpers/defs'
import entriesService from '../helpers/defs/services/entries'
import entriesData from '../helpers/data/entries'

import integreat from '../..'

test('should not authenticate twice', async (t) => {
  nock('http://some.api', {
    reqheaders: {
      authorization: 'Bearer t0k3n'
    }
  })
    .get('/entries/')
    .times(2)
    .reply(200, { data: entriesData })
  const adapters = { json }
  const authenticators = { token: tokenAuth }
  const defsWithAuth = {
    ...defs,
    services: [{
      ...entriesService,
      auth: 'entriesToken'
    }],
    auths: [{
      id: 'entriesToken',
      authenticator: 'token',
      options: { token: 't0k3n' }
    }]
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' }
  }
  const authSpy = sinon.spy(tokenAuth, 'authenticate')

  const great = integreat(defsWithAuth, { adapters, authenticators })
  await great.dispatch(action)
  const ret = await great.dispatch(action)

  t.is(authSpy.callCount, 1)
  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.length, 3)

  nock.restore()
})
