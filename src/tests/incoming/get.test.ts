/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon = require('sinon')
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import ent1Data from '../helpers/data/entry1.js'
import { Action, TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

// Tests

test('should use incoming endpoint over non-incoming', async (t) => {
  const send = sinon
    .stub(resources.transporters!.http, 'send')
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
    meta: { ident: { root: true } },
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
    access: { ident: { root: true } },
    headers: {
      'content-type': 'application/json',
    },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 1)
  const sentAction = send.args[0][0]
  t.is(sentAction.type, 'GET')
  t.is(sentAction.payload.id, 'ent1')
  t.is(sentAction.payload.type, 'entry')
  t.deepEqual(ret, expectedResponse)
})

test('should use non-incoming endpoint over incoming', async (t) => {
  const resourcesWithSend = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: {
        ...resources.transporters!.http,
        send: async (_action: Action) => ({
          status: 'ok',
          data: JSON.stringify({
            data: { ...ent1Data, createdAt, updatedAt },
          }),
        }),
      },
    },
  }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
      // No source service
    },
    meta: { ident: { root: true } },
  }

  const great = Integreat.create(defs, resourcesWithSend)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(typeof ret.data, 'object')
  t.is((ret.data as TypedData).$type, 'entry')
  t.is((ret.data as TypedData).id, 'ent1')
})
