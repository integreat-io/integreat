import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat from '../..'

// Helpers

const entryMapping = {
  id: 'entries-entry',
  type: 'entry',
  service: 'entries',
  attributes: {
    id: 'key',
    title: { path: 'headline', default: 'An entry' },
    text: 'body'
  },
  relationships: {
    author: { mapping: 'entries-user' }
  }
}

const userMapping = {
  id: 'entries-user',
  path: 'author',
  type: 'user',
  service: 'users',
  attributes: {
    id: 'username',
    firstname: 'forename'
  },
  relationships: {}
}

const entry1Item = {
  id: 'ent1',
  type: 'entry',
  attributes: {
    title: 'Entry 1',
    text: 'The text of entry 1'
  },
  relationships: {
    author: { id: 'johnf', type: 'user', attributes: { firstname: 'John' }, relationships: {} },
    sections: []
  }
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
