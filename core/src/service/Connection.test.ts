import test from 'ava'
import sinon = require('sinon')
import httpTransporter from '../../../transporter-http/src/transporter'
import { Transporter } from '../types'

import Connection from './Connection'

// Setup

const options = { uri: 'http://api.test/1.0' }
const auth = { Authorization: 'Bearer t0k3n' }

// Tests

test('should call transporter connect method and return true', async (t) => {
  const connect = sinon.stub().resolves({ status: 'ok' })
  const transporter = {
    ...httpTransporter,
    connect,
  }

  const connection = new Connection(transporter, options)
  const ret = await connection.connect(auth)

  t.is(connect.callCount, 1)
  t.deepEqual(connect.args[0][0], options)
  t.deepEqual(connect.args[0][1], auth)
  t.is(connect.args[0][2], null)
  t.true(ret)
})

test('should call transporter connect method with previous connection', async (t) => {
  const serviceConnection = { status: 'ok' }
  const connect = sinon.stub().resolves(serviceConnection)
  const transporter = {
    ...httpTransporter,
    connect,
  }

  const connection = new Connection(transporter, options)
  await connection.connect(auth)
  await connection.connect(auth)

  t.is(connect.callCount, 2)
  t.is(connect.args[0][2], null)
  t.is(connect.args[1][2], serviceConnection)
})

test('should return false when connection fails', async (t) => {
  const connect = sinon.stub().resolves({ status: 'error', error: 'Failure!' })
  const transporter = {
    ...httpTransporter,
    connect,
  }

  const connection = new Connection(transporter, options)
  const ret = await connection.connect(auth)

  t.is(connect.callCount, 1)
  t.false(ret)
})

test('should return true when connection status is noaction', async (t) => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({ status: 'noaction' }),
  }

  const connection = new Connection(transporter, options)
  const ret = await connection.connect(auth)

  t.true(ret)
})

test('should return true when service returns null', async (t) => {
  const transporter = {
    ...httpTransporter,
    connect: async () => null,
  }

  const connection = new Connection(transporter, options)
  const ret = await connection.connect(auth)

  t.true(ret)
})

test('should return true when service has no connect method', async (t) => {
  const transporter = ({} as unknown) as Transporter

  const connection = new Connection(transporter, options)
  const ret = await connection.connect(auth)

  t.true(ret)
})

test('should call transporter connect method with null after connection failure', async (t) => {
  const connect = sinon.stub().resolves({ status: 'error', error: 'Failure!' })
  const transporter = {
    ...httpTransporter,
    connect,
  }

  const connection = new Connection(transporter, options)
  await connection.connect(auth)
  await connection.connect(auth)

  t.is(connect.callCount, 2)
  t.is(connect.args[0][2], null)
  t.is(connect.args[1][2], null)
})

test('should get connection status and error', async (t) => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({
      status: 'error',
      error: 'Failure!',
      internalStuff: {},
    }),
  }

  const connection = new Connection(transporter, options)
  await connection.connect(auth)

  t.is(connection.status, 'error')
  t.is(connection.error, 'Failure!')
})

test('should get null for error when no error', async (t) => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({
      status: 'ok',
      internalStuff: {},
    }),
  }

  const connection = new Connection(transporter, options)
  await connection.connect(auth)

  t.is(connection.status, 'ok')
  t.is(connection.error, null)
})

test('should get null for status when no connection', async (t) => {
  const transporter = {
    ...httpTransporter,
    connect: async () => ({
      status: 'ok',
      internalStuff: {},
    }),
  }

  const connection = new Connection(transporter, options)

  t.is(connection.status, null)
  t.is(connection.error, null)
})

test('should get service connection object', async (t) => {
  const serviceConnection = { status: 'ok', internalStuff: {} }
  const transporter = {
    ...httpTransporter,
    connect: async () => serviceConnection,
  }

  const connection = new Connection(transporter, options)
  await connection.connect(auth)

  t.deepEqual(connection.object, serviceConnection)
})

test('should call transporter disconnect with connection object and remove local object', async (t) => {
  const serviceConnection = { status: 'ok', internalStuff: {} }
  const disconnect = sinon.stub().resolves(undefined)
  const transporter = {
    ...httpTransporter,
    connect: async () => serviceConnection,
    disconnect,
  }

  const connection = new Connection(transporter, options)
  await connection.connect(auth)
  await connection.disconnect()

  t.is(disconnect.callCount, 1)
  t.deepEqual(disconnect.args[0][0], serviceConnection)
  t.is(connection.object, null)
})

test('should just remove local object when transporter has no disconnect method', async (t) => {
  const serviceConnection = { status: 'ok', internalStuff: {} }
  const transporter = ({
    connect: async () => serviceConnection,
  } as unknown) as Transporter

  const connection = new Connection(transporter, options)
  await connection.connect(auth)
  await connection.disconnect()

  t.is(connection.object, null)
})
