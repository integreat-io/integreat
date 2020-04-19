import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entriesMapping from '../helpers/defs/mappings/entries-entry'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
}

const entry1FromService = {
  key: 'ent1',
  headline: 'Entry 1',
  body: 'Text from entry 1',
}

// Tests

// Waiting for solution on results from SET
test.failing('should map response and merge with request data', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .put('/entries/ent1')
    .reply(201, { ok: true, content: { items: entry1FromService } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } },
  }
  const defs = {
    schemas: [entrySchema],
    services: [
      {
        ...entriesService,
        endpoints: [
          {
            responseMapping: 'content.items',
            options: { uri: '/entries/{id}' },
          },
        ],
      },
    ],
    mappings: [entriesMapping],
  }
  const expectedData = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry 1',
      text: 'Text from entry 1',
      sections: [],
    },
  ]

  const great = Integreat.create(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expectedData)

  nock.restore()
})
