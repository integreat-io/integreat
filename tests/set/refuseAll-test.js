import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'
import johnfData from '../helpers/data/userJohnf'

import integreat from '../..'

// Helpers

const entry1Item = {
  id: 'ent1',
  type: 'entry',
  attributes: {
    title: 'Entry 1',
    text: 'The text of entry 1'
  },
  relationships: {
    author: { id: 'johnf', type: 'user' },
    sections: [{ id: 'news', type: 'section' }, { id: 'sports', type: 'section' }]
  }
}

// Tests

test('should refuse request to set entry with no ident', async (t) => {
  const adapters = { json: json() }
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
    .put('/entries/ent1')
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: null }
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')

  nock.restore()
})
