import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat, { Transporter } from '../../index.js'

// Tests

test('should emit event from transporter', async () => {
  const listener = sinon.stub()
  const mockedHttp = {
    ...resources.transporters?.http,
    connect: async (_options, _auth, _conn, emitFn) => {
      emitFn('error', new Error('We failed'))
      return { status: 'error' } // Make sure we don't call the service
    },
  } as Transporter
  const mockedResources = {
    ...resources,
    transporters: {
      ...resources.transporters,
      http: mockedHttp,
    },
  }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, mockedResources)
  great.on('error', listener)
  await great.dispatch(action)

  assert.equal(listener.callCount, 1)
  assert.deepEqual(listener.args[0][0], new Error('We failed'))
})
