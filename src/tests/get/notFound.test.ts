import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Tests

test('should get error object for unknown entry', async () => {
  nock('http://some.api').get('/entries/ent0').reply(404)
  const action = {
    type: 'GET',
    payload: { id: 'ent0', type: 'entry' },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'notfound', ret.error)
  assert.equal(ret.data, undefined)
  assert.equal(typeof ret.error, 'string')

  nock.restore()
})
