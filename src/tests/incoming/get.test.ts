import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import ent1Data from '../helpers/data/entry1.js'
import {
  IdentType,
  type Action,
  type TypedData,
  type Transporter,
} from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

// Tests

test('should use incoming endpoint over non-incoming', async () => {
  const send = sinon
    .stub(resources.transporters?.http as Transporter, 'send')
    .callsFake(async (_action: Action) => ({
      status: 'ok',
      data: JSON.stringify({ data: { ...ent1Data, createdAt, updatedAt } }),
    }))
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
      sourceService: 'api', // Makes this a candidate for incoming mapping
      section: 'news',
    },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }
  const expectedResponseData = {
    id: 'ent1',
    content: {
      title: 'Entry 1',
      main: 'The text of entry 1',
      sections: ['news'],
    },
    meta: {
      created: createdAt,
      updated: updatedAt,
      author: { id: 'johnf' },
    },
  }
  const expectedResponse = {
    status: 'ok',
    data: JSON.stringify(expectedResponseData),
    access: { ident: { id: 'root', type: IdentType.Root } },
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(send.callCount, 1)
  const sentAction = send.args[0][0]
  assert.equal(sentAction.type, 'GET')
  assert.equal(sentAction.payload.id, 'ent1')
  assert.equal(sentAction.payload.type, 'entry')
  assert.deepEqual(ret, expectedResponse)
})

test('should use non-incoming endpoint over incoming', async () => {
  const resourcesWithSend = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: {
        ...resources.transporters?.http,
        send: async (_action: Action) => ({
          status: 'ok',
          data: JSON.stringify({
            data: { ...ent1Data, createdAt, updatedAt },
          }),
        }),
      } as Transporter,
    },
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
      // No source service specified
    },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }

  const great = Integreat.create(defs, resourcesWithSend)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(typeof ret.data, 'object')
  assert.equal((ret.data as TypedData).$type, 'entry')
  assert.equal((ret.data as TypedData).id, 'ent1')
})
