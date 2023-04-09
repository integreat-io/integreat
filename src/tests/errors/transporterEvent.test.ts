/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon from 'sinon'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat, { Transporter } from '../../index.js'

// Tests

test('should emit event from transporter', async (t) => {
  const listener = sinon.stub()
  const mockedHttp: Transporter = {
    ...resources.transporters!.http,
    connect: async (_options, _auth, _conn, emitFn) => {
      emitFn('error', new Error('We failed'))
      return { status: 'error' } // Make sure we don't call the service
    },
  }
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

  t.is(listener.callCount, 1)
  t.deepEqual(listener.args[0][0], new Error('We failed'))
})
