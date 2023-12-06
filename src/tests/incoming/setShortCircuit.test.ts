import test from 'ava'
import sinon from 'sinon'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import ent1Data from '../helpers/data/entry1.js'
import { type Action, IdentType } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

// Tests

test('should mutate incoming action data to error status and mutate response', async (t) => {
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
      data: null,
      sourceService: 'api', // Makes this a candidate for incoming mapping
    },
    meta: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }
  const expectedResponseData = JSON.stringify({
    code: 'badrequest',
    error: 'We failed!',
  })

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'badrequest', ret.error)
  t.deepEqual(ret.data, expectedResponseData)
  t.is(send.callCount, 0)
})

test('should mutate incoming action data to ok status', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      path: '/',
      data: '',
      sourceService: 'api', // Makes this a candidate for incoming mapping
    },
    meta: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }
  const expected = '{"status":"ok"}'

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})
