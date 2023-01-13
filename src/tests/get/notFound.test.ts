import test from 'ava'
import nock = require('nock')
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Tests

test('should get error object for unknown entry', async (t) => {
  nock('http://some.api').get('/entries/ent0').reply(404)
  const action = {
    type: 'GET',
    payload: { id: 'ent0', type: 'entry' },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'notfound', ret.error)
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')

  nock.restore()
})
