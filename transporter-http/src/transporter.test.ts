import test from 'ava'

import transporter from './transporter'

// Tests

test('should be a transporter', (t) => {
  t.is(typeof transporter.authentication, 'string')
  t.is(typeof transporter.prepareOptions, 'function')
  t.is(typeof transporter.connect, 'function')
  t.is(typeof transporter.send, 'function')
  t.is(typeof transporter.disconnect, 'function')
})

test('should have authentication string', (t) => {
  t.is(transporter.authentication, 'asHttpHeaders')
})

test('connect should return connection object', async (t) => {
  const connection = { status: 'ok' }

  const ret = await transporter.connect({}, {}, connection)

  t.deepEqual(ret, connection)
})

test('should do nothing when callling disconnect', async (t) => {
  const ret = await transporter.disconnect(null)

  t.is(ret, undefined)
})

// Tests -- prepareOptions

test('should return endpoint object', (t) => {
  const options = {
    uri: 'http://example.com/',
    headers: {
      'If-Match': '3-871801934',
    },
    method: 'POST' as const,
  }
  const expected = options

  const ret = transporter.prepareOptions(options)

  t.deepEqual(ret, expected)
})
