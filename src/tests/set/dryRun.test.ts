import test from 'ava'
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

const createdAt = new Date()
const updatedAt = new Date()

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  text: 'The text of entry 1',
  createdAt,
  updatedAt,
  author: { id: 'johnf', type: 'user' },
  sections: [
    { id: 'news', type: 'section' },
    { id: 'sports', type: 'section' }
  ]
}

// Tests

test('should set new entry', async t => {
  const adapters = { json }
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item, dryrun: true },
    meta: { ident: { root: true } }
  }
  const expectedData = {
    uri: 'http://some.api/entries/ent1',
    method: 'PUT',
    body: JSON.stringify({
      key: 'ent1',
      headline: 'Entry 1',
      originalTitle: 'Entry 1',
      body: 'The text of entry 1',
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      authorId: { id: 'johnf', $ref: 'user' },
      sections: [
        { id: 'news', $ref: 'section' },
        { id: 'sports', $ref: 'section' }
      ]
    }),
    headers: {
      'Content-Type': 'application/json'
    },
    retries: 0
  }

  const great = Integreat.create(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'dryrun', ret.error)
  t.deepEqual(ret.data, expectedData)
})
