import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entriesService from '../helpers/defs/services/entries.js'
import { type TypedData, IdentType } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
}

const entry1FromService = {
  key: 'ent1',
  headline: 'Entry 1',
  body: 'Text from entry 1',
}

// Tests

test('should mutate response and merge with request data', async () => {
  nock('http://some.api')
    .put('/entries/ent1')
    .reply(201, { ok: true, content: { items: entry1FromService } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }
  const defs = {
    ...definitions,
    services: [
      {
        ...entriesService,
        endpoints: [
          {
            mutation: {
              $direction: 'fwd',
              response: 'response',
              'response.data': [
                'response.data.content.items',
                { $apply: 'entries-entry' },
              ],
            },
            options: { uri: '/entries/{payload.id}', method: 'PUT' },
          },
        ],
      },
    ],
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData
  assert.equal(data.$type, 'entry')
  assert.equal(data.id, 'ent1')
  assert.equal(data.title, 'Entry 1')
  assert.equal(data.text, 'Text from entry 1')

  nock.restore()
})
