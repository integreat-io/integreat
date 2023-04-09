import test from 'ava'
import nock from 'nock'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import mutations from '../../mutations/index.js'
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
  { $apply: 'cast_entry' },
]

const defs = {
  ...definitions,
  mutations: {
    'entries-entry': mapping,
    ...mutations,
  },
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should transform entry', async (t) => {
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

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.is(data.length, 2)
  const item0 = data[0]
  t.is(item0.id, 'ent1')
  t.is(item0.title, 'Entry 1')
  t.is((item0.author as TypedData).id, 'admin')
  t.is((item0.author as TypedData).$ref, 'user')
  const item1 = data[1]
  t.is(item1.id, 'ent2')
  t.is(item1.title, 'No title')
  t.is((item1.author as TypedData).id, 'admin')
})
