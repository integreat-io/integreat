import test from 'node:test'
import assert from 'node:assert/strict'
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

test('responseMutation', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should mutate with endpoint mutation', async () => {
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

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data.length, 1)
    const item = data[0]
    assert.equal(item.id, 'ent1')
    assert.equal(item.title, 'Entry 1')
  })

  await t.test('should mutate with service mutation', async () => {
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

    assert.equal(ret.status, 'queued', ret.error)
    assert.equal(ret.data?.length, 1)
    assert.equal(ret.data[0].id, 'ent1')
  })

  await t.test('should use status code mapped from data', async () => {
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

    assert.equal(ret.status, 'error')
    assert.equal(ret.error, 'Oh no!')
  })

  await t.test('should transform at paths within the data', async () => {
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

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data.length, 2)
    assert.equal(data[0].id, 'ent1')
    assert.equal(data[0].title, 'Entry 1')
    assert.equal(data[1].id, 'ent2')
    assert.equal(data[1].title, 'Entry 2')
  })

  await t.test('should have access to meta options from service', async () => {
    nock('http://some.api').get('/entries/ent4').reply(200, entry1)
    const action = {
      type: 'GET',
      payload: { type: 'entry', id: 'ent4' },
    }
    const mutation = {
      $direction: 'fwd',
      $modify: true,
      response: {
        $modify: 'response',
        'data[]': {
          id: { $value: 'ent0' },
          title: '^^.meta.options.defaultTitle',
        },
      },
    }
    const defs = defsWithMutation(mutation)
    const defsWithOptions = {
      ...defs,
      services: [
        {
          ...defs.services[0],
          options: {
            ...defs.services[0].options,
            defaultTitle: 'No title',
          },
        },
      ],
    }

    const great = Integreat.create(defsWithOptions, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data.length, 1)
    assert.equal(data[0].id, 'ent0')
    assert.equal(data[0].title, 'No title')
  })
})
