import test from 'ava'

import { authentication, connect, disconnect } from '.'

test('should have authentication string', (t) => {
  t.is(authentication, 'asHttpHeaders')
})

test('connect should return connection object', async (t) => {
  const serviceOptions = {}
  const auth = {}
  const connection = { status: 'ok' }

  const ret = await connect(serviceOptions, auth, connection)

  t.deepEqual(ret, connection)
})

test('disconnect should do nothing', async (t) => {
  const connection = { status: 'ok' }

  await t.notThrows(() => disconnect(connection))
})
