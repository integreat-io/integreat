import test from 'ava'

import { serialize } from '.'

test('should return request', async (t) => {
  const request = { data: { id: 'ent1' } }

  const ret = await serialize(request)

  t.deepEqual(ret, request)
})
