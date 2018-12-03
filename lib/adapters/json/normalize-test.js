import test from 'ava'

import { normalize } from '.'

test('should return response', async (t) => {
  const response = { data: [{ id: 'item1' }] }

  const ret = await normalize(response, {})

  t.deepEqual(ret, response)
})
