import test from 'ava'
import nock = require('nock')
import defsBase from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Setup

const entryMutation = [
  {
    $iterate: true,
    id: 'key',
    title: { $alt: ['headline', { $value: 'An entry' }] },
    text: 'body',
    author: ['author', { $apply: 'entries-user' }],
  },
  { $apply: 'cast_entry' },
]

const userMutation = [
  {
    $iterate: true,
    id: 'username',
    firstname: 'forename',
  },
  { $apply: 'cast_user' },
]

const defs = {
  ...defsBase,
  mutations: {
    ...defsBase.mutations,
    'entries-entry': entryMutation,
    'entries-user': userMutation,
  },
}

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  text: 'The text of entry 1',
  author: {
    $type: 'user',
    id: 'johnf',
    firstname: 'John',
  },
  sections: [],
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should map full relationship item to service', async (t) => {
  const putData = {
    key: 'ent1',
    headline: 'Entry 1',
    body: 'The text of entry 1',
    author: { username: 'johnf', forename: 'John' },
  }
  nock('http://some.api')
    .put('/entries/ent1', putData)
    .reply(201, { data: { key: 'ent1', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } },
  }
  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
})
