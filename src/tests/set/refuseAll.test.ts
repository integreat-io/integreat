import test from 'ava'
import nock = require('nock')
import resources from '../helpers/resources/index.js'
import defs from '../helpers/defs/index.js'
import johnfData from '../helpers/data/userJohnf.js'

import Integreat from '../../index.js'

// Setup

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

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')

  nock.restore()
})
