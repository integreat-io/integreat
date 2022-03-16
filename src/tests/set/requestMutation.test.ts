import test from 'ava'
import nock = require('nock')
import resources from '../helpers/resources'
import entrySchema from '../helpers/defs/schemas/entry'
import entriesService from '../helpers/defs/services/entries'
import entriesMutation from '../helpers/defs/mutations/entries-entry'
import mutations from '../../mutations'

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
  props: [],
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
    {
      $direction: 'rev',
      $flip: true,
      payload: {
        id: 'payload.id', // TODO: Works, but not as expected
        data: {
          content: {
            'items[]': ['payload.data', { $apply: 'entries-entry' }],
            footnote: { $transform: 'fixed', value: '' },
            meta: [
              { $flip: true, datatype: 'payload.type' },
              { $transform: 'json', $direction: 'rev' },
            ],
          },
        },
      },
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
            options: { uri: '/entries/{{payload.id}}' },
          },
        ],
      },
    ],
    mutations: {
      ...mutations,
      'entries-entry': entriesMutation,
    },
  }

  const great = Integreat.create(defs, resources)
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
  const serviceMutation = {
    'payload.id': 'payload.id', // TODO: Find a better way
    'payload.data': 'payload.data.content',
  }
  const mutation = [
    {
      $direction: 'rev',
      payload: {
        id: 'payload.id',
        data: ['payload.data.items[]', { $apply: 'entries-entry' }],
        none0: ['payload.data.footnote', { $transform: 'fixed', value: '' }],
        type: ['payload.data.meta', { $transform: 'json' }, 'datatype'],
      },
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
            options: { uri: '/entries/{{payload.id}}' },
          },
        ],
      },
    ],
    mutations: {
      ...mutations,
      'entries-entry': entriesMutation,
    },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
})
