import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import nock from 'nock'
import tokenAuth from '../../authenticators/token.js'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entriesService from '../helpers/defs/services/entries.js'
import entriesData from '../helpers/data/entries.js'
import type { TypedData } from '../../types.js'
import type { ServiceDef } from '../../service/types.js'

import Integreat from '../../index.js'

// Tests

test('should not authenticate twice', async () => {
  nock('http://some.api', {
    reqheaders: {
      authorization: 'Bearer t0k3n',
    },
  })
    .get('/entries')
    .times(2)
    .reply(200, { data: entriesData })
  const resourcesWithAuth = {
    ...resources,
    authenticators: { token: tokenAuth },
  }
  const defsWithAuth = {
    ...defs,
    services: [
      {
        ...entriesService,
        auth: 'entriesToken',
      } as ServiceDef,
    ],
    auths: [
      {
        id: 'entriesToken',
        authenticator: 'token',
        options: { token: 't0k3n', type: 'Bearer' },
      },
    ],
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }
  const authSpy = sinon.spy(tokenAuth, 'authenticate')

  const great = Integreat.create(defsWithAuth, resourcesWithAuth)
  await great.dispatch(action)
  const ret = await great.dispatch(action)

  assert.equal(authSpy.callCount, 1)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 3)

  nock.restore()
})
