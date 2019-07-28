import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'

import integreat = require('../..')

// Setup

const entryNoHeadline = {
  key: 'ent2'
}

// Tests

test('should transform entry', async t => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/')
    .reply(200, { data: [entry1, entryNoHeadline] })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } }
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
      sections: 'sections[]'
    },
    { $apply: 'cast_entry' }
  ]
  const defs = {
    schemas: [entrySchema],
    services: [{ ...entriesService, mappings: { entry: mapping } }]
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.length, 2)
  const item0 = ret.data[0]
  t.is(item0.id, 'ent1')
  t.is(item0.title, 'Entry 1')
  t.is(item0.author.id, 'admin')
  t.is(item0.author.$ref, 'user')
  const item1 = ret.data[1]
  t.is(item1.id, 'ent2')
  t.is(item1.title, 'No title')
  t.is(item1.author.id, 'admin')

  nock.restore()
})
