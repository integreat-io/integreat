import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
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

const entry1Mapped = {
  key: 'ent1',
  headline: 'Entry 1'
}

// Tests

test('should set data with request mapping', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .put('/entries/ent1', { content: { items: [ entry1Mapped ], footnote: '' } })
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } }
  }
  const requestMapping = {
    'content.items[]': 'data',
    'content.footnote': { path: 'unknown', default: '' }
  }
  const defs = {
    schemas: [entrySchema],
    services: [{
      ...entriesService,
      endpoints: [{
        requestMapping,
        options: { uri: '/{id}' }
      }]
    }],
    mappings: [entriesMapping]
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)

  nock.restore()
})
