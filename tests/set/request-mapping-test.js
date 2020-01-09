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
  headline: 'Entry 1',
  originalTitle: 'Entry 1'
}

// Tests

test('should set data with request mapping', async (t) => {
  const requestData = {
    content: {
      items: [entry1Mapped],
      footnote: '',
      meta: '{"datatype":"entry"}'
    }
  }
  nock('http://some.api')
    .put('/entries/ent1', requestData)
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } }
  }
  const resources = {
    adapters: { json: json() },
    transformers: {
      stringify: (value) => JSON.stringify(value)
    }
  }
  const requestMapping = {
    'content.items[]': 'data',
    'content.footnote': { const: '' },
    'content.meta': { path: 'params.type', transformTo: 'stringify', sub: 'datatype' }
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

  const great = integreat(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)

  nock.restore()
})

test('should set data with reverse transform', async (t) => {
  const requestData = {
    content: {
      items: [entry1Mapped],
      footnote: '',
      meta: '{"datatype":"entry"}'
    }
  }
  nock('http://some.api')
    .put('/entries/ent1', requestData)
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } }
  }
  const resources = {
    adapters: { json: json() },
    transformers: {
      stringify: Object.assign(
        (value) => JSON.parse(value),
        { rev: (value) => JSON.stringify(value) }
      )
    }
  }
  const requestMapping = {
    'content.items[]': 'data',
    'content.footnote': { const: '' },
    'content.meta': { path: 'params.type', transform: 'stringify', sub: 'datatype' }
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

  const great = integreat(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)

  nock.restore()
})
