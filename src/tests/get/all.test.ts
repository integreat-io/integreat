import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entriesData from '../helpers/data/entries.js'
import type { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setup

test('all', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should get all entries from service', async () => {
    nock('http://some.api').get('/entries').reply(200, { data: entriesData })
    const action = {
      type: 'GET',
      payload: { type: 'entry' },
      meta: { ident: { id: 'johnf' } },
    }

    const great = Integreat.create(defs, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data?.length, 3)
    assert.equal(data[0].id, 'ent1')
    assert.equal(data[1].id, 'ent2')
    assert.equal(data[2].id, 'ent3')
  })

  await t.test('should get all entries with transformed param', async () => {
    nock('http://some.api')
      .get('/entries')
      .query({
        'created[gte]': '2021-07-05T14:07:19.000Z',
        until: '2021-07-05T23:59:59.999Z',
      })
      .reply(200, { data: entriesData })
    const action = {
      type: 'GET',
      payload: {
        type: 'entry',
        updatedSince: new Date('2021-07-05T14:07:19Z'),
        updatedUntil: new Date('2021-07-05T23:59:59.999Z'),
      },
      meta: { ident: { id: 'johnf' } },
    }

    const great = Integreat.create(defs, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data?.length, 3)
    assert.equal(data[0].id, 'ent1')
    assert.equal(data[1].id, 'ent2')
    assert.equal(data[2].id, 'ent3')
  })
})
