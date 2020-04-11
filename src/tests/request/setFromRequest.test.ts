import test from 'ava'
import sinon = require('sinon')
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'
import ent1Data from '../helpers/data/entry1'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

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
}) => ({
  key,
  headline,
  originalTitle: headline,
  body,
  createdAt: new Date(createdAt),
  updatedAt: new Date(updatedAt),
  authorId,
  sections,
})

// Tests

test('should dispatch set action and return respons', async (t) => {
  const send = sinon.stub().resolves({
    status: 'ok',
    data: { data: { ...ent1Data, createdAt, updatedAt } },
  })
  const resources = { adapters: { json: { ...json, send } } }
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
  const expectedRequestParams = {
    type: 'entry',
    // onlyMappedValues: true, // TODO: Figure out how this should be implemented
    requestMethod: 'POST',
    id: 'ent1',
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

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 1)
  const sentRequest = send.args[0][0]
  t.is(sentRequest.action, 'SET')
  t.deepEqual(sentRequest.params, expectedRequestParams)
  t.is(sentRequest.data, expectedRequestData)
  t.deepEqual(ret, expectedResponse)
})
