import test from 'ava'
import nock from 'nock'

import {send} from '.'

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof send, 'function')
})

test('should send data', async (t) => {
  const data = {_id: 'item1', type: 'item'}
  const response = {ok: true, id: 'item1', rev: '0000001'}
  const scope = nock('http://couch1.test')
    .put('/database/item1', data)
    .reply(200, response)

  const ret = await send('http://couch1.test/database/item1', data)

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 200)
  t.deepEqual(ret.data, response)
})

test('should get rev for existing item', async (t) => {
  const data = {_id: 'item1', type: 'item'}
  const response = {ok: true, id: 'item1', rev: '0000002'}
  nock('http://couch2.test')
    .get('/database/item1')
      .reply(200, {_id: 'item1', _rev: '0000001', type: 'item'})
    .put('/database/item1', {_id: 'item1', _rev: '0000001', type: 'item'})
      .reply(200, response)

  const ret = await send('http://couch2.test/database/item1', data)

  t.truthy(ret)
  t.is(ret.status, 200)
  t.deepEqual(ret.data, response)
})
