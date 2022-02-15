import test from 'ava'
import sinon = require('sinon')
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import ent1Data from '../helpers/data/entry1'
import { Action } from '../../types'

import Integreat from '../..'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

// Tests

test('should map incoming action data to error status and map response', async (t) => {
  const send = sinon
    .stub(resources.transporters.http, 'send')
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
    meta: { ident: { root: true } },
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
