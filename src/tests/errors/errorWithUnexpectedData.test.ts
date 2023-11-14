import test from 'ava'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Setup

test.after.always(() => {
  nock.restore()
})

// Tests

test('should keep transporter error even if data is unexpected', async (t) => {
  nock('http://some.api').get('/entries').reply(504, 'Gateway Timeout') // We expect json here, but get text
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'error', ret.error)
  t.is(ret.error, 'Server returned 504 for entries')
  t.deepEqual(ret.data, []) // Data will be empty array, as we're mutating to array and casting
})
