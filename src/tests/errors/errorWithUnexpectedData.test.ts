import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Setup

test('errorWithUnexpectedData', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test(
    'should keep transporter error even if data is unexpected',
    async () => {
      nock('http://some.api').get('/entries').reply(504, 'Gateway Timeout') // We expect json here, but get text
      const action = {
        type: 'GET',
        payload: { type: 'entry' },
        meta: { ident: { id: 'johnf' } },
      }

      const great = Integreat.create(defs, resources)
      const ret = await great.dispatch(action)

      assert.equal(ret.status, 'error', ret.error)
      assert.equal(ret.error, 'Server returned 504 for http://some.api/entries')
      assert.deepEqual(ret.data, []) // Data will be empty array, as we're mutating to array and casting
    },
  )
})
