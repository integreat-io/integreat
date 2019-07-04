import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat = require('../..')

test('should get error object for unknown entry', async t => {
  const adapters = { json }
  const transformers = integreat.transformers()
  nock('http://some.api')
    .get('/entries/ent0')
    .reply(404)
  const action = {
    type: 'GET',
    payload: { id: 'ent0', type: 'entry' }
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'notfound', ret.error)
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')

  nock.restore()
})
