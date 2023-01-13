/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon = require('sinon')
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import ent1Data from '../helpers/data/entry1.js'
import { Action } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

// Tests

test('should map incoming action data and response data', async (t) => {
  const send = sinon
    .stub(resources.transporters!.http, 'send')
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
    meta: { ident: { root: true } },
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
    access: { ident: { root: true } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 1)
  const sentAction = send.args[0][0]
  t.is(sentAction.type, 'SET')
  t.is(sentAction.payload.id, 'ent1')
  t.is(sentAction.payload.type, 'entry')
  t.is(sentAction.payload.data, expectedRequestData)
  t.deepEqual(ret, expectedResponse)
})
