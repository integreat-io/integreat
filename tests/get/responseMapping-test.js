import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'
import entry2 from '../helpers/data/entry2'
import entriesMapping from '../helpers/defs/mappings/entries-entry'
import jsonTransform from '../helpers/resources/transformers/jsonTransform'

import integreat from '../..'

// Setup

const transformers = { jsonTransform }

// Tests

test('should map with response mapping', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      responseContent: { articles: [entry1] },
      reponseValue: 'ok'
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' }
  }
  const responseMapping = {
    status: 'reponseValue',
    data: {
      path: 'responseContent.articles[]'
    },
    error: 'responseMessage'
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

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  const item = ret.data[0]
  t.is(item.id, 'ent1')
  t.is(item.attributes.title, 'Entry 1')

  nock.restore()
})

test('should use status code mapped from data', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent2')
    .reply(200, {
      responseContent: { articles: [entry1] },
      reponseValue: 'error',
      responseMessage: 'Oh no!'
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent2' }
  }
  const responseMapping = {
    status: 'reponseValue',
    data: {
      path: 'responseContent.articles[]'
    },
    error: 'responseMessage'
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

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'error')
  t.is(ret.error, 'Oh no!')
  t.falsy(ret.data)

  nock.restore()
})

test('should map with sub mapping', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent3')
    .reply(200, {
      responseContent: JSON.stringify({ articles: [entry1, entry2] })
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent3' }
  }
  const responseMapping = {
    'data[]': {
      path: 'responseContent',
      transform: 'jsonTransform',
      sub: {
        path: 'articles[]'
      }
    }
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

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[0].attributes.title, 'Entry 1')
  t.is(ret.data[1].id, 'ent2')
  t.is(ret.data[1].attributes.title, 'Entry 2')

  nock.restore()
})
