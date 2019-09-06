import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'

import integreat from '../..'

const defs = {
  schemas: [
    require('../helpers/defs/schemas/entry')
  ],
  services: [
    require('../helpers/defs/services/entries')
  ],
  mappings: [
    {
      id: 'entries-entry',
      type: 'entry',
      service: 'entries'
    }
  ]
}

test('should get one entry from service', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      data: {
        id: 'ent1',
        type: 'entry',
        attributes: {
          title: 'Entry 1',
          text: 'The first entry ever created',
          createdAt,
          updatedAt
        },
        relationships: {
          author: { id: 'johnf', type: 'user' }
        }
      }
    })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' }
  }
  const expected = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'Entry 1',
      text: 'The first entry ever created',
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt)
    },
    relationships: {
      author: { id: 'johnf', type: 'user' }
    }
  }]

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)

  nock.restore()
})
