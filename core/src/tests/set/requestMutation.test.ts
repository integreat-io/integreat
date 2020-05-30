import test from 'ava'
import nock = require('nock')
import resources from '../helpers/resources'
import jsonTransform from '../helpers/resources/transformers/jsonTransform'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entriesMutation from '../helpers/defs/mutations/entries-entry'
import exchangeJsonMutation from '../helpers/defs/mutations/exchangeJson'

import Integreat from '../..'

// Setup

const date = '2019-08-13T13:43:00.000Z'

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  createdAt: new Date(date),
  updatedAt: new Date(date),
}

const entry1Mapped = {
  key: 'ent1',
  headline: 'Entry 1',
  originalTitle: 'Entry 1',
  createdAt: date,
  updatedAt: date,
  sections: [],
}

const resourcesWithStringify = {
  ...resources,
  transformers: {
    ...resources.transformers,
    stringify: jsonTransform,
  },
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should set data with endpoint mutation', async (t) => {
  const requestData = JSON.stringify({
    content: {
      items: [entry1Mapped],
      footnote: '',
      meta: '{"datatype":"entry"}',
    },
  })
  nock('http://some.api')
    .put('/entries/ent1', requestData)
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } },
  }
  const mutation = [
    'data',
    {
      $direction: 'rev',
      data: ['content.items[]', { $apply: 'entries-entry' }],
      none0: ['content.footnote', { $transform: 'fixed', value: '' }],
      'params.type': [
        'content.meta',
        { $transform: 'stringify', $direction: 'rev' },
        'datatype',
      ],
    },
  ]
  const defs = {
    schemas: [entrySchema],
    services: [
      {
        ...entriesService,
        endpoints: [
          {
            mutation,
            options: { uri: '/entries/{id}' },
          },
        ],
      },
    ],
    mutations: {
      'entries-entry': entriesMutation,
      'exchange:json': exchangeJsonMutation,
    },
  }

  const great = Integreat.create(defs, resourcesWithStringify)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
})

test('should set data with service and endpoint mutation', async (t) => {
  const requestData = JSON.stringify({
    content: {
      items: [entry1Mapped],
      footnote: '',
      meta: '{"datatype":"entry"}',
    },
  })
  nock('http://some.api')
    .put('/entries/ent1', requestData)
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } },
  }
  const serviceMutation = { data: 'data.content' }
  const mutation = [
    'data',
    {
      $direction: 'rev',
      data: ['items[]', { $apply: 'entries-entry' }],
      none0: ['footnote', { $transform: 'fixed', value: '' }],
      'params.type': [
        'meta',
        { $transform: 'stringify', $direction: 'rev' },
        'datatype',
      ],
    },
  ]
  const defs = {
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
    mutations: {
      'entries-entry': entriesMutation,
      'exchange:json': exchangeJsonMutation,
    },
  }

  const great = Integreat.create(defs, resourcesWithStringify)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
})
