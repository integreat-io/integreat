import test from 'ava'
import sinon = require('sinon')
import jsonAdapter from 'integreat-adapter-json'
import tokenAuth from '../../authenticators/token'
import defs from '../helpers/defs'
import entriesData from '../helpers/data/entries'
import { Connection } from '../../service/types'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

// Tests

test('should connect to service and reuse connection', async (t) => {
  let count = 1
  const send = sinon.stub().resolves({ status: 'ok', data: entriesData })
  const connect = async (
    _options: object,
    _args: object | null,
    conn: Connection | null
  ) => conn || { status: 'ok', value: `Call ${count++}` }
  const adapters = { json: { ...json, send, connect } }
  const authenticators = { token: tokenAuth }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  const great = Integreat.create(defs, { adapters, authenticators })
  await great.dispatch(action)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 2)
  t.deepEqual(send.args[1][1], { status: 'ok', value: 'Call 1' })
})
