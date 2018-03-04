import test from 'ava'
import nock from 'nock'
import json from '../../lib/adapters/json'
import completeIdent from '../../lib/middleware/completeIdent'
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
    author: {id: 'johnf', type: 'user'},
    sections: [{id: 'news', type: 'section'}, {id: 'sports', type: 'section'}]
  }
}

// Tests

test('should set new entry', async (t) => {
  const adapters = {json}
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, {data: {...johnfData}})
    .put('/entries/ent1')
    .reply(201, {id: 'ent1', ok: true, rev: '1-12345'})
  const action = {
    type: 'SET',
    payload: {type: 'entry', data: entry1Item},
    meta: {ident: {id: 'johnf'}}
  }
  const expected = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'Entry 1',
      text: 'The text of entry 1'
    },
    relationships: {
      author: {id: 'johnf', type: 'user'},
      sections: [
        {id: 'news', type: 'section'},
        {id: 'sports', type: 'section'}
      ]
    }
  }]

  const great = integreat(defs, {adapters, middlewares: [completeIdent]})
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)

  nock.restore()
})
