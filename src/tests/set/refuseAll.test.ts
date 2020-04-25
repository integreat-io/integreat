import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'
import johnfData from '../helpers/data/userJohnf'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  text: 'The text of entry 1',
  author: { id: 'johnf', type: 'user' },
  sections: [
    { id: 'news', type: 'section' },
    { id: 'sports', type: 'section' },
  ],
}

// Tests

test('should refuse request to set entry with no ident', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
    .put('/entries/ent1')
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: undefined },
  }

  const great = Integreat.create(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')

  nock.restore()
})
