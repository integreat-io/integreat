import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Setup

const defs = {
  ...definitions,
  mutations: {
    ...definitions.mutations,
    'entries-entry': [],
  },
}

// Tests

test('should get one entry from service', async () => {
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
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.deepEqual(ret.data, expected)

  nock.restore()
})
