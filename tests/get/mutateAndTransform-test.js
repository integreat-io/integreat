import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'
import entry2 from '../helpers/data/entry2'

import integreat from '../..'

test('should transform entry', async (t) => {
  const adapters = { json: json() }
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
    transform: 'addSectionsToText'
  }
  const defs = {
    schemas: [entrySchema],
    services: [{ ...entriesService, mappings: { entry: mapping } }]
  }
  const transformers = {
    upperCase: (value) => value.toUpperCase(),
    addSectionsToText: (item) => {
      const sections = item.relationships.sections.map((section) => section.id).join('|')
      item.attributes.text = `${item.attributes.text} - ${sections}`
      return item
    }
  }

  const great = integreat(defs, { adapters, transformers })
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

test.skip('should transform array of entries', async (t) => {
  const adapters = { json: json() }
  nock('http://some.api')
    .get('/entries/')
    .reply(200, { data: [entry1, entry2] })
  const action = {
    type: 'GET',
    payload: { type: 'entry' }
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
    transform: 'addSectionsToText'
  }
  const defs = {
    schemas: [entrySchema],
    services: [{ ...entriesService, mappings: { entry: mapping } }]
  }
  const transformers = {
    upperCase: (value) => value.toUpperCase(),
    addSectionsToText: (item) => {
      const sections = item.relationships.sections.map((section) => section.id).join('|')
      item.attributes.text = `${item.attributes.text} - ${sections}`
      return item
    }
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[0].attributes.title, 'ENTRY 1')
  t.is(ret.data[0].attributes.text, 'The text of entry 1 - news|sports')
  t.is(ret.data[1].id, 'ent2')
  t.is(ret.data[1].attributes.title, 'ENTRY 2')
  t.is(ret.data[1].attributes.text, 'The text of entry 2 - ')

  nock.restore()
})
