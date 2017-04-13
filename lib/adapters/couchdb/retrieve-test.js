import test from 'ava'
import nock from 'nock'

import {retrieve} from '.'

test('should exist', (t) => {
  t.is(typeof retrieve, 'function')
})

test('should return data', async (t) => {
  const data = {
    _id: 'item1',
    type: 'item'
  }
  nock('http://test.site')
    .get('/items/item1')
    .reply(200, data)

  const ret = await retrieve('http://test.site/items/item1')

  t.deepEqual(ret, data)

  nock.restore()
})
