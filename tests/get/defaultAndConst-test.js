import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'

import integreat from '../..'

// Setup

const entryNoHeadline = {
  key: 'ent2'
}

// Tests

test('should transform entry', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: [entry1, entryNoHeadline] })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' }
  }
  const mapping = {
    attributes: {
      id: 'key',
      title: { path: 'headline', default: 'No title' },
      text: 'body',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    relationships: {
      'author.id': { const: 'admin' },
      sections: 'sections[]'
    }
  }
  const defs = {
    schemas: [entrySchema],
    services: [{ ...entriesService, mappings: { entry: mapping } }]
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 2)
  const item0 = ret.data[0]
  t.is(item0.id, 'ent1')
  t.is(item0.attributes.title, 'Entry 1')
  t.is(item0.relationships.author.id, 'admin')
  t.is(item0.relationships.author.type, 'user')
  const item1 = ret.data[1]
  t.is(item1.id, 'ent2')
  t.is(item1.attributes.title, 'No title')
  t.is(item1.relationships.author.id, 'admin')

  nock.restore()
})
