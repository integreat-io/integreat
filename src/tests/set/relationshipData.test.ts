import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat = require('../../..')

// Helpers

const entryMapping = {
  id: 'entries-entry',
  type: 'entry',
  service: 'entries',
  pipeline: [
    {
      $iterate: true,
      id: 'key',
      title: ['headline', { $alt: 'value', value: 'An entry' }],
      text: 'body',
      author: ['author', { $apply: 'entries-user' }]
    },
    { $apply: 'cast_entry' }
  ]
}

const userMapping = {
  id: 'entries-user',
  path: 'author',
  type: 'user',
  service: 'users',
  pipeline: [
    {
      $iterate: true,
      id: 'username',
      firstname: 'forename'
    },
    { $apply: 'cast_user' }
  ]
}

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  text: 'The text of entry 1',
  author: {
    $type: 'user',
    id: 'johnf',
    firstname: 'John'
  },
  sections: []
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should map full relationship item to service', async t => {
  const putData = {
    key: 'ent1',
    headline: 'Entry 1',
    body: 'The text of entry 1',
    author: { username: 'johnf', forename: 'John' }
  }
  nock('http://some.api')
    .put('/entries/ent1', putData)
    .reply(201, { data: { key: 'ent1', ok: true } })
  const adapters = { json }
  defs.mappings[0] = entryMapping
  defs.mappings.push(userMapping)
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } }
  }
  const expected = [entry1Item]

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})
