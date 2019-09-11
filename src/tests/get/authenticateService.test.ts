import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import tokenAuth from '../../authenticators/token'
import defs from '../helpers/defs'
import entriesService from '../helpers/defs/services/entries'
import entriesData from '../helpers/data/entries'

import integreat = require('../../..')

test('should get entries from service requiring authentication', async t => {
  nock('http://some.api', {
    reqheaders: {
      authorization: 'Bearer t0k3n'
    }
  })
    .get('/entries/')
    .reply(200, { data: entriesData })
  const adapters = { json }
  const authenticators = { token: tokenAuth }
  const defsWithAuth = {
    ...defs,
    services: [
      {
        ...entriesService,
        auth: 'entriesToken'
      }
    ],
    auths: [
      {
        id: 'entriesToken',
        authenticator: 'token',
        options: { token: 't0k3n' }
      }
    ]
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' }
  }

  const great = integreat(defsWithAuth, { adapters, authenticators })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.length, 3)

  nock.restore()
})
