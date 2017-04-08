import test from 'ava'
import nock from 'nock'

import {retrieve, normalize} from '.'

test('retrieve should exist', (t) => {
  t.is(typeof retrieve, 'function')
})

test('retrieve should return json object', async (t) => {
  const json = {
    _id: 'item1',
    type: 'item'
  }
  nock('http://test.site')
    .get('/items/item1')
    .reply(200, json)

  const ret = await retrieve('http://test.site/items/item1')

  t.deepEqual(ret, json)

  nock.restore()
})

test('normalize should exist', (t) => {
  t.is(typeof normalize, 'function')
})

test('normalize should return source object', async (t) => {
  const source = [{id: 'item1'}]

  const ret = await normalize(source)

  t.deepEqual(ret, source)
})

test('normalize should normalize _id for array', async (t) => {
  const source = [{_id: 'item1'}]
  const target = [{id: 'item1'}]

  const ret = await normalize(source)

  t.deepEqual(ret, target)
})

test('normalize should normalize _id for single item', async (t) => {
  const source = {_id: 'item1'}
  const target = {id: 'item1'}

  const ret = await normalize(source)

  t.deepEqual(ret, target)
})
