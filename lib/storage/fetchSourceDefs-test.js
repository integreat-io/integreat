import test from 'ava'
import {couchdb as Dbdb} from 'dbdbmock'

import fetchSourceDefs from './fetchSourceDefs'

test('should exist', (t) => {
  t.is(typeof fetchSourceDefs, 'function')
})

test('should fetch source defs', (t) => {
  const db = new Dbdb({})
  const sourceDefs = [
    {id: 'source:src1', type: 'source', itemtype: 'entry', _key: 'entry'},
    {id: 'source:src2', type: 'source', itemtype: 'account', _key: 'account'}
  ]
  db.data.set('view:great:sources', sourceDefs)

  return fetchSourceDefs(db)

  .then((ret) => {
    t.true(Array.isArray(ret))
    t.is(ret.length, 2)
    t.is(ret[0].id, 'src1')
    t.is(ret[0].itemtype, 'entry')
    t.is(ret[1].id, 'src2')
    t.is(ret[1].itemtype, 'account')
  })
})

test('should return empty array when none is found', (t) => {
  const db = new Dbdb({})

  return fetchSourceDefs(db)

  .then((ret) => {
    t.deepEqual(ret, [])
  })
})

test('should reject on error', (t) => {
  t.plan(2)
  const db = new Dbdb({})
  db.data.set('view:great:sources', new Error('Terrible events'))

  return fetchSourceDefs(db)

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'Terrible events')
  })
})
