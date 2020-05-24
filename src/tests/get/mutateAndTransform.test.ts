import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import mapAny = require('map-any')
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'
import entry2 from '../helpers/data/entry2'
import { isDataObject } from '../../utils/is'
import { TypedData } from '../../types'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

const transformers = {
  upperCase: () => (value: unknown) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  addSectionsToText: () =>
    mapAny((item: unknown) => {
      if (!isDataObject(item)) {
        return item
      }
      const sections = Array.isArray(item.sections)
        ? item.sections.join('|')
        : ''
      item.text = `${item.text} - ${sections}`
      return item
    }),
}

// Tests

test('should transform entry', async (t) => {
  const adapters = { json }
  nock('http://some.api').get('/entries/ent1').reply(200, { data: entry1 })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
  }
  const mapping = [
    {
      $iterate: true,
      id: 'key',
      title: ['headline', { $transform: 'upperCase' }],
      text: 'body',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      author: 'authorId',
      sections: 'sections[]',
    },
    { $transform: 'addSectionsToText' },
    { $apply: 'cast_entry' },
  ]
  const defs = {
    schemas: [entrySchema],
    services: [entriesService],
    mappings: [{ id: 'entries-entry', mapping }],
  }

  const great = Integreat.create(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  const item = ret.data as TypedData
  t.is(item.id, 'ent1')
  t.is(item.title, 'ENTRY 1')
  t.is(item.text, 'The text of entry 1 - news|sports')

  nock.restore()
})

test('should transform array of entries', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries')
    .reply(200, { data: [entry1, entry2] })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }
  const mapping = [
    {
      $iterate: true,
      id: 'key',
      title: ['headline', { $transform: 'upperCase' }],
      text: 'body',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      author: 'authorId',
      sections: 'sections[]',
    },
    { $transform: 'addSectionsToText' },
    { $apply: 'cast_entry' },
  ]
  const defs = {
    schemas: [entrySchema],
    services: [entriesService],
    mappings: [{ id: 'entries-entry', mapping }],
  }

  const great = Integreat.create(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  const data = ret.data as TypedData[]
  t.is(data.length, 2)
  t.is(data[0].id, 'ent1')
  t.is(data[0].title, 'ENTRY 1')
  t.is(data[0].text, 'The text of entry 1 - news|sports')
  t.is(data[1].id, 'ent2')
  t.is(data[1].title, 'ENTRY 2')
  t.is(data[1].text, 'The text of entry 2 - ')

  nock.restore()
})
