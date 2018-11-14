import test from 'ava'
import nock from 'nock'
import json from '../../lib/adapters/json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entriesMapping from '../helpers/defs/mappings/entries-entry'

import integreat from '../..'

// Helpers

const entry1Item = {
  id: 'ent1',
  type: 'entry',
  attributes: {
    title: 'Entry 1'
  },
  relationships: {}
}

const entry1FromService = {
  key: 'ent1',
  headline: 'Entry 1',
  body: 'Text from entry 1'
}

// Tests

test('should map response and merge with request data', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .put('/entries/ent1')
    .reply(201, { ok: true, content: { items: entry1FromService } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } }
  }
  const responseMapping = {
    data: { path: 'content.items' }
  }
  const defs = {
    schemas: [entrySchema],
    services: [{
      ...entriesService,
      endpoints: [{
        responseMapping,
        options: { uri: '/{id}' }
      }]
    }],
    mappings: [entriesMapping]
  }
  const expectedData = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'Entry 1',
      text: 'Text from entry 1'
    },
    relationships: {
      sections: []
    }
  }]

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expectedData)

  nock.restore()
})
