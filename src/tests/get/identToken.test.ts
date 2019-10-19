import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import completeIdent from '../../middleware/completeIdent'
import defs from '../helpers/defs'
import johnfData from '../helpers/data/userJohnf'

import Integreat from '../..'

test('should get with ident token', async t => {
  const adapters = { json }
  const middlewares = [completeIdent]
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'user' },
    meta: { ident: { withToken: 'twitter|23456' } }
  }

  const great = Integreat.create(defs, { adapters }, middlewares)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.id, 'johnf')

  nock.restore()
})
