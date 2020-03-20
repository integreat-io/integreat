import test from 'ava'
import sinon from 'sinon'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat from '../..'

// Tests

test('should set headers on request', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok', data: [] })
  const adapters = {
    json: { ...json(), send }
  }
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: [{ id: 'ent1', type: 'entry' }, { id: 'ent2', type: 'entry' }] },
    meta: { ident: { id: 'root', root: true }, id: '1234567890' }
  }
  const expected = {
    'x-correlation-id': '1234567890'
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 1)
  const request = send.args[0][0]
  t.deepEqual(request.headers, expected)
})
