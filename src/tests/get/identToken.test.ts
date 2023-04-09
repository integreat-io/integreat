import test from 'ava'
import nock from 'nock'
import completeIdent from '../../middleware/completeIdent.js'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import johnfData from '../helpers/data/userJohnf.js'
import type { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Tests

test('should get with ident token', async (t) => {
  const middleware = [completeIdent]
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

  const great = Integreat.create(defs, resources, middleware)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is((ret.data as TypedData).id, 'johnf')

  nock.restore()
})
