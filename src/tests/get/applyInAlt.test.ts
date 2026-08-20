import test from 'node:test'
import assert from 'node:assert/strict'
import definitions from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import type { Action, Connection, Transporter, TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setup

// The endpoint mutation applies `entries-entry`, which in turn applies
// `entries-title` from within an `$alt`. This is the level at which a
// regression in how pipelines are prepared would reach users.
const defs = {
  ...definitions,
  mutations: {
    ...definitions.mutations,
    'entries-title': ['headline'],
    'entries-entry': {
      $iterate: true,
      id: 'key',
      title: { $alt: [{ $apply: 'entries-title' }, { $value: 'An entry' }] },
      text: 'body',
    },
  },
}

const entriesData = {
  data: [
    { key: 'ent1', headline: 'Entry 1', body: 'The text of entry 1' },
    { key: 'ent2', body: 'The text of entry 2' },
  ],
}

// Tests

test('should apply pipeline within $alt when dispatching', async () => {
  const send = async (action: Action, _connection: Connection | null) => ({
    ...action.response,
    status: 'ok',
    data: JSON.stringify(entriesData),
  })
  const resourcesWithSend = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: { ...resources.transporters?.http, send } as Transporter,
    },
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = [
    { id: 'ent1', title: 'Entry 1', text: 'The text of entry 1' },
    { id: 'ent2', title: 'An entry', text: 'The text of entry 2' },
  ]

  const great = Integreat.create(defs, resourcesWithSend)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok')
  const data = (ret.data as TypedData[]).map(({ id, title, text }) => ({
    id,
    title,
    text,
  }))
  assert.deepEqual(data, expected)
})
