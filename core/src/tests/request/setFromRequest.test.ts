import test from 'ava'
import sinon = require('sinon')
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import ent1Data from '../helpers/data/entry1'
import { DataObject, Exchange } from '../../types'

import Integreat from '../..'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

const serializeData = ({
  key,
  headline,
  body,
  createdAt,
  updatedAt,
  authorId,
  sections,
}: DataObject) =>
  JSON.stringify({
    key,
    headline,
    originalTitle: headline,
    body,
    createdAt: new Date(createdAt as string | number | Date),
    updatedAt: new Date(updatedAt as string | number | Date),
    authorId,
    sections,
  })

// Tests

test('should dispatch set action and return respons', async (t) => {
  // Using nock instead of this spagetti stubbing?
  const resourcesWithSend = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: {
        ...resources.transporters.http,
        send: async (exchange: Exchange) => ({
          ...exchange,
          status: 'ok',
          response: {
            ...exchange.response,
            data: { data: { ...ent1Data, createdAt, updatedAt } },
          },
        }),
      },
    },
  }
  const send = sinon.spy(resourcesWithSend.transporters.http, 'send')
  const action = {
    type: 'REQUEST',
    payload: {
      type: 'entry',
      data: {
        key: 'ent1',
        headline: 'Entry 1',
        createdAt: createdAt,
        updatedAt: updatedAt,
      },
      requestMethod: 'POST',
    },
    meta: { ident: { root: true } },
  }
  const expectedRequestData = JSON.stringify({
    key: 'ent1',
    headline: 'Entry 1',
    originalTitle: 'Entry 1',
    createdAt: createdAt,
    updatedAt: updatedAt,
    sections: [],
  })
  const expectedResponseData = serializeData({
    key: 'ent1',
    headline: 'Entry 1',
    body: 'The text of entry 1',
    authorId: { id: 'johnf', $ref: 'user' },
    sections: [
      { id: 'news', $ref: 'section' },
      { id: 'sports', $ref: 'section' },
    ],
    createdAt,
    updatedAt,
  })
  const expectedResponse = {
    status: 'ok',
    data: expectedResponseData,
    access: { ident: { root: true } },
  }

  const great = Integreat.create(defs, resourcesWithSend)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 1)
  const sentExchange = send.args[0][0]
  t.is(sentExchange.type, 'SET')
  t.deepEqual(sentExchange.request.id, 'ent1')
  t.deepEqual(sentExchange.request.type, 'entry')
  t.deepEqual(sentExchange.request.params, { requestMethod: 'POST' })
  t.is(sentExchange.request.data, expectedRequestData)
  t.deepEqual(ret, expectedResponse)
})
