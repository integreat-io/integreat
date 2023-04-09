/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon from 'sinon'
import tokenAuth from '../../authenticators/token.js'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entriesData from '../helpers/data/entries.js'
import { Connection, Action } from '../../types.js'

import Integreat from '../../index.js'

// Tests

test('should connect to service and reuse connection', async (t) => {
  let count = 1
  const connect = async (
    _options: Record<string, unknown>,
    _args: Record<string, unknown> | null,
    conn: Connection | null
  ) => conn || { status: 'ok', value: `Call ${count++}` }
  const send = async (action: Action, _connection: Connection | null) => ({
    ...action.response,
    status: 'ok',
    data: JSON.stringify(entriesData),
  })
  const resourcesWithConnect = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: {
        ...resources.transporters!.http,
        connect,
        send,
      },
    },
    authenticators: { token: tokenAuth },
  }
  const sendSpy = sinon.spy(resourcesWithConnect.transporters.http, 'send')
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
