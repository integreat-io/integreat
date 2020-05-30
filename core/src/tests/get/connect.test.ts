import test from 'ava'
import sinon = require('sinon')
import tokenAuth from '../../authenticators/token'
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import entriesData from '../helpers/data/entries'
import { Connection } from '../../service/types'

import Integreat from '../..'

// Tests

test('should connect to service and reuse connection', async (t) => {
  let count = 1
  const send = sinon
    .stub(resources.adapters.json, 'send')
    .resolves({ status: 'ok', data: entriesData })
  const connect = async (
    _options: object,
    _args: object | null,
    conn: Connection | null
  ) => conn || { status: 'ok', value: `Call ${count++}` }
  const resourcesWithConnect = {
    ...resources,
    adapters: {
      ...resources.adapters,
      json: {
        ...resources.adapters.json,
        connect,
      },
    },
    authenticators: { token: tokenAuth },
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  const great = Integreat.create(defs, resourcesWithConnect)
  await great.dispatch(action)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 2)
  t.deepEqual(send.args[1][1], { status: 'ok', value: 'Call 1' })
})
