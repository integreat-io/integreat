import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

const defs = {
  schemas: [require('../helpers/defs/schemas/entry').default],
  services: [require('../helpers/defs/services/entries').default],
  mappings: [
    {
      id: 'entries-entry',
      type: 'entry',
      service: 'entries',
      mapping: [{ $apply: 'cast_entry' }]
    }
  ]
}

// Tests

test('should get one entry from service', async t => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      data: {
        $type: 'entry',
        id: 'ent1',
        title: 'Entry 1',
        text: 'The first entry ever created',
        createdAt,
        updatedAt,
        author: { id: 'johnf', $ref: 'user' }
      }
    })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' }
  }
  const expected = {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1',
    text: 'The first entry ever created',
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    author: { id: 'johnf', $ref: 'user' },
    sections: []
  }

  const great = Integreat.create(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)

  nock.restore()
})