import test from 'ava'
import { MapDefinition } from 'map-transform'
import nock = require('nock')
import resources from '../helpers/resources'
import exchangeJsonMapping from '../helpers/defs/mappings/exchangeJson'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entry1 from '../helpers/data/entry1'
import entry2 from '../helpers/data/entry2'
import entriesMapping from '../helpers/defs/mappings/entries-entry'
import jsonTransform from '../helpers/resources/transformers/jsonTransform'
import { TypedData } from '../../types'

import Integreat from '../..'

// Setup

const resourcesWithTrans = {
  ...resources,
  transformers: {
    ...resources.transformers,
    jsonTransform,
  },
}

const mutation = {
  $direction: 'fwd',
  status: 'data.responseValue',
  data: ['data.responseContent.articles', { $apply: 'entries-entry' }],
  error: 'data.responseMessage',
}

const defsWithMutation = (
  mutation: MapDefinition,
  serviceMutation?: MapDefinition
) => ({
  schemas: [entrySchema],
  services: [
    {
      ...entriesService,
      mutation: [...entriesService.mutation, serviceMutation],
      endpoints: [
        {
          mutation,
          options: { uri: '/entries/{id}' },
        },
      ],
    },
  ],
  mappings: [entriesMapping, exchangeJsonMapping],
})

test.after.always(() => {
  nock.restore()
})

// Tests

test('should map with endpoint mutation', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      responseContent: { articles: [entry1] },
      responseValue: 'ok',
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
  }
  const defs = defsWithMutation(mutation)

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data.length, 1)
  const item = data[0]
  t.is(item.id, 'ent1')
  t.is(item.title, 'Entry 1')
})

test('should map with service mutation', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      articles: [entry1],
      result: 'queued',
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
  }
  const mutation = {
    $direction: 'fwd',
    data: ['data', { $apply: 'entries-entry' }],
  }
  const serviceMutation = {
    $direction: 'fwd',
    status: 'data.result',
    data: 'data.articles',
  }
  const defs = defsWithMutation(mutation, serviceMutation)

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'queued', ret.error)
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should use status code mapped from data', async (t) => {
  nock('http://some.api')
    .get('/entries/ent2')
    .reply(200, {
      responseContent: { articles: [entry1] },
      responseValue: 'error',
      responseMessage: 'Oh no!',
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent2' },
  }
  const defs = defsWithMutation(mutation)

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'error')
  t.is(ret.error, 'Oh no!')
})

test('should not override adapter error with data status', async (t) => {
  nock('http://some.api').get('/entries/ent2').reply(404, {
    responseContent: null,
    responseValue: 'ok',
  })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent2' },
  }
  const defs = defsWithMutation(mutation)

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'notfound')
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
})

test('should transform at paths within the data', async (t) => {
  nock('http://some.api')
    .get('/entries/ent3')
    .reply(200, {
      responseContent: JSON.stringify({ articles: [entry1, entry2] }),
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent3' },
  }
  const mutation = {
    $direction: 'fwd',
    'data[]': [
      'data.responseContent',
      { $transform: 'jsonTransform' },
      'articles[]',
      { $apply: 'entries-entry' },
    ],
  }
  const defs = defsWithMutation(mutation)

  const great = Integreat.create(defs, resourcesWithTrans)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok')
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data.length, 2)
  t.is(data[0].id, 'ent1')
  t.is(data[0].title, 'Entry 1')
  t.is(data[1].id, 'ent2')
  t.is(data[1].title, 'Entry 2')
})
