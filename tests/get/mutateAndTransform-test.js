import test from 'ava'
import nock from 'nock'
import json from '../../lib/adapters/json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'

import integreat from '../..'

test('should mutate and transform entry', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: entry1 })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' }
  }
  const mapping = {
    attributes: {
      id: 'key',
      title: { path: 'headline', transform: 'upperCase' },
      text: 'body',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    relationships: {
      author: 'authorId',
      sections: 'sections[]'
    },
    mutate: 'addSectionsToText'
  }
  const defs = {
    schemas: [entrySchema],
    services: [{ ...entriesService, mappings: { entry: mapping } }]
  }
  const transformers = {
    upperCase: (value) => value.toUpperCase()
  }
  const mutators = {
    addSectionsToText: (item) => {
      const sections = item.relationships.sections.map((section) => section.id).join('|')
      item.attributes.text = `${item.attributes.text} - ${sections}`
      return item
    }
  }

  const great = integreat(defs, { adapters, transformers, mutators })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.is(item.attributes.title, 'ENTRY 1')
  t.is(item.attributes.text, 'The text of entry 1 - news|sports')

  nock.restore()
})
