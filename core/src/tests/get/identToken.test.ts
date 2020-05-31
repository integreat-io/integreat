import test from 'ava'
import nock = require('nock')
import completeIdent from '../../middleware/completeIdent'
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import johnfData from '../helpers/data/userJohnf'
import { TypedData } from '../../types'

import Integreat from '../..'

// Tests

// Waiting for uri template solution
test.failing('should get with ident token', async (t) => {
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
    meta: { ident: { withToken: 'twitter|23456' } },
  }

  const great = Integreat.create(defs, resources, middlewares)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is((ret.data as TypedData).id, 'johnf')

  nock.restore()
})
