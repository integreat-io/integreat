import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entriesService from '../helpers/defs/services/entries.js'
import { IdentType } from '../../types.js'

import Integreat from '../../index.js'

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

test('set requestMutation', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should set data with endpoint mutation', async () => {
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
      meta: { ident: { id: 'root', type: IdentType.Root } },
    }
    const mutation = [
      {
        $direction: 'rev',
        $flip: true,
        payload: {
          id: 'payload.id',
          data: {
            content: {
              'items[]': ['payload.data', { $apply: 'entries-entry' }],
              footnote: { $transform: 'fixed', value: '' },
              meta: [
                { $flip: true, datatype: 'payload.type' },
                { $transform: 'json', $direction: 'to' },
              ],
            },
          },
        },
      },
    ]
    const defs = {
      ...definitions,
      services: [
        {
          ...entriesService,
          endpoints: [
            {
              mutation,
              options: { uri: '/entries/{payload.id}', method: 'PUT' },
            },
          ],
        },
      ],
    }

    const great = Integreat.create(defs, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
  })

  await t.test(
    'should set data with service and endpoint mutation',
    async () => {
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
        meta: { ident: { id: 'root', type: IdentType.Root } },
      }
      const serviceMutation = {
        $direction: 'to',
        $flip: true,
        payload: {
          $modify: 'payload',
          'data.content': 'payload.data',
        },
      }
      const mutation = [
        {
          $direction: 'rev',
          payload: {
            id: 'payload.id',
            data: ['payload.data.items[]', { $apply: 'entries-entry' }],
            none0: [
              'payload.data.footnote',
              { $transform: 'fixed', value: '' },
            ],
            type: ['payload.data.meta', { $transform: 'json' }, 'datatype'],
          },
        },
      ]
      const defs = {
        ...definitions,
        services: [
          {
            ...entriesService,
            mutation: [serviceMutation],
            endpoints: [
              {
                mutation,
                options: { uri: '/entries/{payload.id}', method: 'PUT' },
              },
            ],
          },
        ],
      }

      const great = Integreat.create(defs, resources)
      const ret = await great.dispatch(action)

      assert.equal(ret.status, 'ok', ret.error)
    },
  )
})
