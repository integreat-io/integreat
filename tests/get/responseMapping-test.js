import test from 'ava'
import nock from 'nock'
import json from '../../lib/adapters/json'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'
import entriesMapping from '../helpers/defs/mappings/entries-entry'

import integreat from '../..'

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
