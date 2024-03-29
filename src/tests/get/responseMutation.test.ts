import test from 'ava'
import nock from 'nock'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entriesService from '../helpers/defs/services/entries.js'
import entry1 from '../helpers/data/entry1.js'
import entry2 from '../helpers/data/entry2.js'
import type { TransformDefinition } from 'map-transform/types.js'
import type { TypedData, Response } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const mutation = {
  $direction: 'fwd',
  response: [
    'response',
    {
      '.': 'response',
      status: 'data.responseValue',
      data: ['data.responseContent.articles', { $apply: 'entries-entry' }],
      error: 'data.responseMessage',
    },
  ],
}

const defsWithMutation = (
  mutation: TransformDefinition,
  serviceMutation?: TransformDefinition,
) => ({
  ...definitions,
  services: [
    {
      ...entriesService,
      mutation: serviceMutation ? [serviceMutation] : [],
      endpoints: [
        {
          mutation,
          options: { uri: '/entries/{payload.id}' },
        },
      ],
    },
  ],
})

test.after.always(() => {
  nock.restore()
})

// Tests

test('should mutate with endpoint mutation', async (t) => {
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

test('should mutate with service mutation', async (t) => {
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
    response: 'response',
    'response.data': ['response.data', { $apply: 'entries-entry' }],
  }
  const serviceMutation = {
    $direction: 'fwd',
    response: {
      '.': 'response',
      status: 'response.data.result',
      data: 'response.data.articles',
    },
  }
  const defs = defsWithMutation(mutation, serviceMutation)

  const great = Integreat.create(defs, resources)
  const ret = (await great.dispatch(action)) as Response<TypedData[]>

  t.is(ret.status, 'queued', ret.error)
  t.is(ret.data?.length, 1)
  t.is(ret.data![0].id, 'ent1')
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
    $modify: '.',
    response: {
      $modify: 'response',
      'data[]': [
        'response.data.responseContent',
        { $transform: 'json' },
        'articles[]',
        { $apply: 'entries-entry' },
      ],
    },
  }
  const defs = defsWithMutation(mutation)

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data.length, 2)
  t.is(data[0].id, 'ent1')
  t.is(data[0].title, 'Entry 1')
  t.is(data[1].id, 'ent2')
  t.is(data[1].title, 'Entry 2')
})
