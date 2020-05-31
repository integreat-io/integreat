import test from 'ava'
import nock = require('nock')
import resources from '../helpers/resources'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import exchangeJsonMutation from '../helpers/defs/mutations/exchangeJson'
import entry1 from '../helpers/data/entry1'
import { TypedData, DataObject } from '../../types'

import Integreat from '../..'

// Setup

const entryNoHeadline = {
  key: 'ent2',
}

const mapping = [
  {
    $iterate: true,
    id: 'key',
    title: ['headline', { $alt: 'value', value: 'No title' }],
    text: 'body',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    author: [{ $transform: 'fixed', value: 'admin' }],
    sections: 'sections[]',
  },
  { $apply: 'cast_entry' },
]

const defs = {
  schemas: [entrySchema],
  services: [entriesService],
  mutations: {
    'entries-entry': mapping,
    'exchange:json': exchangeJsonMutation,
  },
}

test.after.always(() => {
  nock.restore()
})

// Tests

// Waiting for uri template solution
test.failing('should transform entry', async (t) => {
  nock('http://some.api')
    .get('/entries')
    .reply(200, { data: [entry1, entryNoHeadline] })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.is(data.length, 2)
  const item0 = data[0]
  t.is(item0.id, 'ent1')
  t.is(item0.title, 'Entry 1')
  t.is((item0.author as DataObject).id, 'admin')
  t.is((item0.author as DataObject).$ref, 'user')
  const item1 = data[1]
  t.is(item1.id, 'ent2')
  t.is(item1.title, 'No title')
  t.is((item1.author as DataObject).id, 'admin')
})

// Waiting for uri template solution
test.failing('should transform entry without defaults', async (t) => {
  nock('http://some.api')
    .get('/entries/ent2')
    .reply(200, { data: [entryNoHeadline] })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent2', returnNoDefaults: true },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent2')
  t.is(data[0].title, undefined) // Default -- should not be mapped
  t.is((data[0].author as DataObject).id, 'admin') // Fixed -- should be mapped
})
