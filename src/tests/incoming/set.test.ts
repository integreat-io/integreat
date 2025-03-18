import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import ent1Data from '../helpers/data/entry1.js'
import { type Action, IdentType, Transporter } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

// Tests

test('should mutate incoming action data and response data', async () => {
  const send = sinon
    .stub(resources.transporters?.http as Transporter, 'send')
    .callsFake(async (_action: Action) => ({
      status: 'ok',
      data: JSON.stringify({ data: { ...ent1Data, createdAt, updatedAt } }),
    }))
  const action = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: JSON.stringify({
        article: {
          id: 'ent1',
          content: {
            title: 'Entry 1',
            main: 'The text',
          },
          meta: {
            created: createdAt,
            updated: updatedAt,
            author: { id: 'johnf', name: 'John F.' },
          },
        },
      }),
      sourceService: 'api', // Makes this a candidate for incoming mapping
    },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }
  const expectedRequestData = JSON.stringify({
    key: 'ent1',
    headline: 'Entry 1',
    originalTitle: 'Entry 1',
    body: 'The text',
    createdAt: createdAt,
    updatedAt: updatedAt,
    authorId: 'johnf',
    sections: [],
    props: [],
  })
  const expectedResponseData = {
    id: 'ent1',
    content: {
      title: 'Entry 1',
      main: 'The text of entry 1',
      sections: [],
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
    headers: { 'Content-Type': 'application/json' },
    access: { ident: { id: 'root', type: IdentType.Root } },
    params: { flag: true, author: 'johnf' },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(send.callCount, 1)
  const sentAction = send.args[0][0]
  assert.equal(sentAction.type, 'SET')
  assert.equal(sentAction.payload.id, 'ent1')
  assert.equal(sentAction.payload.type, 'entry')
  assert.equal(sentAction.payload.data, expectedRequestData)
  assert.equal(sentAction.payload.flag, true)
  assert.equal(sentAction.payload.uri, 'http://localhost:3000')
  assert.deepEqual(ret, expectedResponse)
})
