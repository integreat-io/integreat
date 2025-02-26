import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import tokenAuth from '../../authenticators/token.js'
import entriesService from '../helpers/defs/services/entries.js'
import entriesData from '../helpers/data/entries.js'
import type { TypedData } from '../../types.js'
import type { ServiceDef } from '../../service/types.js'

import Integreat from '../../index.js'

// Setup

const resourcesWithAuth = {
  ...resources,
  authenticators: { token: tokenAuth },
}

test('authenticateService', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test(
    'should get entries from service requiring authentication',
    async () => {
      nock('http://some.api', {
        reqheaders: {
          authorization: 'Bearer t0k3n',
        },
      })
        .get('/entries')
        .reply(200, { data: entriesData })
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
        meta: { ident: { id: 'johnf' } },
      }

      const great = Integreat.create(defsWithAuth, resourcesWithAuth)
      const ret = await great.dispatch(action)

      assert.equal(ret.status, 'ok', ret.error)
      assert.equal((ret.data as TypedData[]).length, 3)
    },
  )

  await t.test(
    'should override the transporter default auth-as method and make auth available in mutations',
    async () => {
      nock('http://some.api')
        .post('/entries', {
          items: [{ id: 'ent1' }],
          auth: { type: 'Bearer', token: 't0k3n' },
        })
        .reply(200)
      const defsWithAuth = {
        ...defs,
        services: [
          {
            ...entriesService,
            auth: 'entriesToken',
            options: { ...entriesService.options, authInData: true },
          } as ServiceDef,
        ],
        auths: [
          {
            id: 'entriesToken',
            authenticator: 'token',
            options: { token: 't0k3n', type: 'Bearer' },
            overrideAuthAsMethod: 'asObject',
          },
        ],
      }
      const action = {
        type: 'SET',
        payload: {
          type: 'entry',
          data: { id: 'ent1', $type: 'entry' },
          authInBody: true, // Flag to hit the right endpoint
        },
        meta: { ident: { id: 'johnf', roles: ['editor'] } },
      }

      const great = Integreat.create(defsWithAuth, resourcesWithAuth)
      const ret = await great.dispatch(action)

      assert.equal(ret.status, 'ok', ret.error)
    },
  )
})
