import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import httpTransporter from 'integreat-transporter-http'
import type { Transporter } from '../types.js'

import Connection from './Connection.js'

// Setup

const options = {
  uri: 'http://api.test/1.0',
  secret: 's3cr3t',
}
const auth = { Authorization: 'Bearer t0k3n' }
const emit = () => undefined

// Tests

test('should call transporter connect method and return true', async () => {
  const connect = sinon.stub().resolves({ status: 'ok' })
  const transporter = {
    ...httpTransporter,
    connect,
  }
  const expectedOptions = { uri: 'http://api.test/1.0', secret: 's3cr3t' }

  const connection = new Connection(transporter, options, emit)
  const ret = await connection.connect(auth)

  assert.equal(connect.callCount, 1)
  assert.deepEqual(connect.args[0][0], expectedOptions)
  assert.deepEqual(connect.args[0][1], auth)
  assert.equal(connect.args[0][2], null)
  assert.equal(ret, true)
})

test('should call transporter connect method with previous connection', async () => {
  const serviceConnection = { status: 'ok' }
  const connect = sinon.stub().resolves(serviceConnection)
  const transporter = {
    ...httpTransporter,
    connect,
  }

  const connection = new Connection(transporter, options, emit)
  await connection.connect(auth)
  await connection.connect(auth)

  assert.equal(connect.callCount, 2)
  assert.equal(connect.args[0][2], null)
  assert.equal(connect.args[1][2], serviceConnection)
})

test('should return false when connection fails', async () => {
  const connect = sinon.stub().resolves({ status: 'error', error: 'Failure!' })
  const transporter = {
    ...httpTransporter,
    connect,
  }

  const connection = new Connection(transporter, options, emit)
  const ret = await connection.connect(auth)

  assert.equal(connect.callCount, 1)
  assert.equal(ret, false)
})

test('should return true when connection status is noaction', async () => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({ status: 'noaction' }),
  }

  const connection = new Connection(transporter, options, emit)
  const ret = await connection.connect(auth)

  assert.equal(ret, true)
})

test('should return true when service returns null', async () => {
  const transporter = {
    ...httpTransporter,
    connect: async () => null,
  }

  const connection = new Connection(transporter, options, emit)
  const ret = await connection.connect(auth)

  assert.equal(ret, true)
})

test('should return true when service has no connect method', async () => {
  const transporter = {} as unknown as Transporter

  const connection = new Connection(transporter, options, emit)
  const ret = await connection.connect(auth)

  assert.equal(ret, true)
})

test('should call transporter connect method with null after connection failure', async () => {
  const connect = sinon.stub().resolves({ status: 'error', error: 'Failure!' })
  const transporter = {
    ...httpTransporter,
    connect,
  }

  const connection = new Connection(transporter, options, emit)
  await connection.connect(auth)
  await connection.connect(auth)

  assert.equal(connect.callCount, 2)
  assert.equal(connect.args[0][2], null)
  assert.equal(connect.args[1][2], null)
})

test('should get connection status and error', async () => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({
      status: 'error',
      error: 'Failure!',
      internalStuff: {},
    }),
  }

  const connection = new Connection(transporter, options, emit)
  await connection.connect(auth)

  assert.equal(connection.status, 'error')
  assert.equal(connection.error, 'Failure!')
})

test('should get null for error when no error', async () => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({
      status: 'ok',
      internalStuff: {},
    }),
  }

  const connection = new Connection(transporter, options, emit)
  await connection.connect(auth)

  assert.equal(connection.status, 'ok')
  assert.equal(connection.error, null)
})

test('should get null for status when no connection', async () => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({
      status: 'ok',
      internalStuff: {},
    }),
  }

  const connection = new Connection(transporter, options, emit)

  assert.equal(connection.status, null)
  assert.equal(connection.error, null)
})

test('should get service connection object', async () => {
  const serviceConnection = { status: 'ok', internalStuff: {} }
  const transporter = {
    ...httpTransporter,
    connect: async () => serviceConnection,
  }

  const connection = new Connection(transporter, options, emit)
  await connection.connect(auth)

  assert.deepEqual(connection.object, serviceConnection)
})

test('should call transporter disconnect with connection object and remove local object', async () => {
  const serviceConnection = { status: 'ok', internalStuff: {} }
  const disconnect = sinon.stub().resolves(undefined)
  const transporter = {
    ...httpTransporter,
    connect: async () => serviceConnection,
    disconnect,
  }

  const connection = new Connection(transporter, options, emit)
  await connection.connect(auth)
  await connection.disconnect()

  assert.equal(disconnect.callCount, 1)
  assert.deepEqual(disconnect.args[0][0], serviceConnection)
  assert.equal(connection.object, null)
})

test('should just remove local object when transporter has no disconnect method', async () => {
  const serviceConnection = { status: 'ok', internalStuff: {} }
  const transporter = {
    connect: async () => serviceConnection,
  } as unknown as Transporter

  const connection = new Connection(transporter, options, emit)
  await connection.connect(auth)
  await connection.disconnect()

  assert.equal(connection.object, null)
})

test('should provide connect method with an emitter method', async () => {
  const emit = sinon.stub()
  const transporter: Transporter = {
    ...httpTransporter,
    connect: async (_options, _auth, _conn, emitFn) => {
      emitFn('error', new Error('We failed'))
      return { status: 'ok' }
    },
  }

  const connection = new Connection(transporter, options, emit)
  const ret = await connection.connect(auth)

  assert.equal(emit.callCount, 1)
  assert.equal(emit.args[0][0], 'error')
  assert.deepEqual(emit.args[0][1], new Error('We failed'))
  assert.equal(ret, true)
})
