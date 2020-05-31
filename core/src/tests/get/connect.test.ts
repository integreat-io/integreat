import test from 'ava'
import sinon = require('sinon')
import tokenAuth from '../../authenticators/token'
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import entriesData from '../helpers/data/entries'
import { Connection, Exchange } from '../../types'

import Integreat from '../..'

// Tests

// Waiting for uri template solution
test.failing('should connect to service and reuse connection', async (t) => {
  let count = 1
  const connect = async (
    _options: object,
    _args: object | null,
    conn: Connection | null
  ) => conn || { status: 'ok', value: `Call ${count++}` }
  const send = async (exchange: Exchange) => ({
    ...exchange,
    status: 'ok',
    response: {
      ...exchange.response,
      data: entriesData,
    },
  })
  const resourcesWithConnect = {
    ...resources,
    adapters: {
      ...resources.transporters,
      http: {
        ...resources.transporters.http,
        connect,
        send,
      },
    },
    authenticators: { token: tokenAuth },
  }
  const sendSpy = sinon.spy(resources.transporters.http, 'send')
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  const great = Integreat.create(defs, resourcesWithConnect)
  await great.dispatch(action)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(sendSpy.callCount, 2)
  t.deepEqual(sendSpy.args[1][1], { status: 'ok', value: 'Call 1' })
})
