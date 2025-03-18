import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entry1 from '../helpers/data/entry1.js'
import type { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const entryNoHeadline = {
  key: 'ent2',
  headline: null,
}

const mapping = [
  {
    $iterate: true,
    id: 'key',
    title: { $alt: ['headline', { $value: 'No title' }] },
    text: 'body',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    author: [{ $transform: 'fixed', value: 'admin' }],
    sections: 'sections[]',
  },
  { $cast: 'entry' },
]

const defs = {
  ...definitions,
  mutations: {
    ...definitions.mutations,
    'entries-entry': mapping,
  },
}

test('defaultAndConst', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should transform entry', async () => {
    nock('http://some.api')
      .get('/entries')
      .reply(200, { data: [entry1, entryNoHeadline] })
    const action = {
      type: 'GET',
      payload: { type: 'entry' },
      meta: { ident: { id: 'johnf' } },
    }

    const great = Integreat.create(defs, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(data.length, 2)
    const item0 = data[0]
    assert.equal(item0.id, 'ent1')
    assert.equal(item0.title, 'Entry 1')
    assert.equal((item0.author as TypedData).id, 'admin')
    assert.equal((item0.author as TypedData).$ref, 'user')
    const item1 = data[1]
    assert.equal(item1.id, 'ent2')
    assert.equal(item1.title, 'No title')
    assert.equal((item1.author as TypedData).id, 'admin')
  })
})
