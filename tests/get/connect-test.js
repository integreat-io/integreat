import test from 'ava'
import sinon from 'sinon'
import json from 'integreat-adapter-json'
import tokenAuth from '../../lib/authenticators/token'
import defs from '../helpers/defs'
import entriesData from '../helpers/data/entries'

import integreat from '../..'

test('should connect to service and reuse connection', async (t) => {
  let count = 1
  const send = sinon.stub().resolves({ status: 'ok', data: entriesData })
  const connect = async (options, args, conn) => conn || { status: 'ok', value: `Call ${count++}` }
  const adapters = { json: { ...json(), send, connect } }
  const authenticators = { token: tokenAuth }
  const action = {
    type: 'GET',
    payload: { type: 'entry' }
  }

  const great = integreat(defs, { adapters, authenticators })
  await great.dispatch(action)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 2)
  t.deepEqual(send.args[1][1], { status: 'ok', value: 'Call 1' })
})
