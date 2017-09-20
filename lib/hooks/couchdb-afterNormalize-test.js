import test from 'ava'
import createSource from '../integreat/source'
import json from '../adapters/json'

import afterNormalize from './couchdb-afterNormalize'

test('should exist', (t) => {
  t.is(typeof afterNormalize, 'function')
})

test('should change _id to id for one item', async (t) => {
  const response = {
    status: 'ok',
    data: {_id: 'entry:ent1', type: 'entry'}
  }
  const source = createSource({id: 'entries', adapter: json})

  await afterNormalize(response, {source})

  t.truthy(response.data)
  t.is(response.data.id, 'entry:ent1')
  t.is(response.data._id, undefined)
})

test('should change _id to id for more items', async (t) => {
  const response = {
    status: 'ok',
    data: [{_id: 'entry:ent1', type: 'entry'}, {_id: 'entry:ent2', type: 'entry'}]
  }
  const source = createSource({id: 'entries', adapter: json})

  await afterNormalize(response, {source})

  t.true(Array.isArray(response.data))
  t.is(response.data.length, 2)
  t.is(response.data[0].id, 'entry:ent1')
  t.is(response.data[0]._id, undefined)
  t.is(response.data[1].id, 'entry:ent2')
  t.is(response.data[1]._id, undefined)
})
