import test from 'ava'
import sinon from 'sinon'

import connect from './connect'

// Setup

const request = {
  method: 'QUERY',
  params: {},
  access: { ident: { id: 'johnf' } }
}

// Tests

test('should call connect and return connection', async (t) => {
  const serviceOptions = { value: 'Value from options' }
  const authentication = { token: 't0k3n' }
  const adapter = {
    connect: async ({ value }, { token }, connection) => ({ status: 'ok', value, token })
  }
  const expected = { status: 'ok', value: 'Value from options', token: 't0k3n' }

  const ret = await connect({ adapter, serviceOptions })({ request, authentication })

  t.deepEqual(ret.connection, expected)
})

test('should store connection', async (t) => {
  const setConnection = sinon.stub()
  const connection = { status: 'ok', value: 'Store this' }
  const adapter = {
    connect: async () => connection
  }

  await connect({ adapter, setConnection })({ request })

  t.is(setConnection.callCount, 1)
  t.deepEqual(setConnection.args[0][0], connection)
})

test('should provide connect with existing connection', async (t) => {
  const setConnection = sinon.stub()
  const connection = { status: 'ok', value: 'Existing' }
  const adapter = {
    connect: async (options, auth, connection) => connection || { status: 'ok', value: 'New' }
  }
  const expected = { status: 'ok', value: 'Existing' }

  const ret = await connect({ adapter, setConnection })({ request, connection })

  t.deepEqual(ret.connection, expected)
  t.is(setConnection.callCount, 0)
})

test('should not connect when error response is set', async (t) => {
  const adapter = {
    connect: async (options, auth, connection) => ({ status: 'ok' })
  }
  const response = { status: 'error', error: 'Oh no' }

  const ret = await connect({ adapter })({ request, response })

  t.deepEqual(ret, {})
})

test('should not return connection when no connect method on adapter', async (t) => {
  const setConnection = sinon.stub()
  const adapter = {}

  const ret = await connect({ adapter, setConnection })({ request })

  t.deepEqual(ret, {})
  t.is(setConnection.callCount, 0)
})

test('should return error response when connection fails', async (t) => {
  const setConnection = sinon.stub()
  const serviceId = 'entries'
  const adapter = {
    connect: async (options, auth, connection) => ({ status: 'notfound', error: 'Not found' })
  }
  const expectedResponse = {
    status: 'error',
    error: 'Could not connect to service \'entries\': Not found'
  }

  const ret = await connect({ adapter, setConnection, serviceId })({ request })

  t.is(typeof ret.connection, 'undefined')
  t.deepEqual(ret.response, expectedResponse)
  t.is(setConnection.callCount, 1)
  t.is(setConnection.args[0][0], null)
})

test('should set connection to null on noaction', async (t) => {
  const setConnection = sinon.stub()
  const serviceId = 'entries'
  const adapter = {
    connect: async (options, auth, connection) => ({ status: 'noaction' })
  }
  const expected = {
    connection: null
  }

  const ret = await connect({ adapter, setConnection, serviceId })({ request })

  t.deepEqual(ret, expected)
  t.is(setConnection.callCount, 1)
  t.is(setConnection.args[0][0], null)
})
