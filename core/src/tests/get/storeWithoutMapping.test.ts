import test from 'ava'
import nock = require('nock')
import resources from '../helpers/resources'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import mutations from '../../mutations'

import Integreat from '../..'

// Setup

const defs = {
  schemas: [entrySchema],
  services: [entriesService],
  mutations: {
    ...mutations,
    'entries-entry': [{ $apply: 'cast_entry' }],
  },
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get one entry from service', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
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
        author: { id: 'johnf', $ref: 'user' },
      },
    })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
  }
  const expected = {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1',
    text: 'The first entry ever created',
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    author: { id: 'johnf', $ref: 'user' },
    sections: [],
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})
