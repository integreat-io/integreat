import test from 'ava'
import sinon = require('sinon')
import nock = require('nock')
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
    createdAt,
    updatedAt,
    authorId,
    sections,
  })

test.after.always(() => {
  nock.restore()
})

// Tests

// Waiting for solution to raw data access
test.failing('should dispatch get action and return respons', async (t) => {
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
            data: JSON.stringify({
              data: { ...ent1Data, createdAt, updatedAt },
            }),
          },
        }),
      },
    },
  }
  const sendSpy = sinon.spy(resourcesWithSend.transporters.http, 'send')
  const action = {
    type: 'REQUEST',
    payload: { type: 'entry', data: '{"key":"ent1"}', requestMethod: 'GET' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedRequestParams = {
    type: 'entry',
    id: 'ent1',
  }
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
    access: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resourcesWithSend)
  const ret = await great.dispatch(action)

  t.deepEqual(ret, expectedResponse)
  t.is(sendSpy.callCount, 1)
  const sentRequest = sendSpy.args[0][0]
  t.is(sentRequest.type, 'GET')
  t.deepEqual(sentRequest.request.params, expectedRequestParams)
})
