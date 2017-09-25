import test from 'ava'
import sinon from 'sinon'
import createSource from '../integreat/source'
import json from '../adapters/json'

import beforeSerialize from './couchdb-beforeSerialize'

test('should exist', (t) => {
  t.is(typeof beforeSerialize, 'function')
})

test('should change id to _id for one item', async (t) => {
  const request = {
    uri: 'http://some.couchdb.com/entry:ent1',
    data: {id: 'entry:ent1', type: 'entry'}
  }
  const source = createSource({id: 'entries', adapter: json})

  await beforeSerialize(request, {source})

  t.is(request.data._id, 'entry:ent1')
  t.is(request.data.id, undefined)
})

test('should change id to _id for more items', async (t) => {
  const request = {
    uri: 'http://some.couchdb.com/entry:ent1',
    data: [{id: 'entry:ent1', type: 'entry'}, {id: 'entry:ent2', type: 'entry'}]
  }
  const source = createSource({id: 'entries', adapter: json})

  await beforeSerialize(request, {source})

  t.is(request.data[0]._id, 'entry:ent1')
  t.is(request.data[0].id, undefined)
  t.is(request.data[1]._id, 'entry:ent2')
  t.is(request.data[1].id, undefined)
})

test('should set rev for one item', async (t) => {
  const request = {
    uri: 'http://some.couchdb.com/entry:ent1',
    data: {id: 'entry:ent1', type: 'entry'}
  }
  const endpoints = {
    getRevs: {uri: 'http://some.couchdb.com/_all_docs{?keys=ids|wrap([, ", ", ])}', path: 'rows[]'}
  }
  const source = createSource({id: 'entries', endpoints, adapter: json})
  sinon.stub(source, 'retrieveRaw').resolves({
    status: 'ok',
    data: {rows: [{id: 'entry:ent1', value: {rev: '2-rev'}}]}
  })
  const expectedReq = {uri: 'http://some.couchdb.com/_all_docs?keys=%5B%22entry%3Aent1%22%5D'}

  await beforeSerialize(request, {source})

  t.is(request.data._rev, '2-rev')
  t.is(source.retrieveRaw.callCount, 1)
  t.deepEqual(source.retrieveRaw.args[0][0], expectedReq)
})

test('should handle no rev', async (t) => {
  const request = {
    uri: 'http://some.couchdb.com/entry:ent1',
    data: {id: 'entry:ent1', type: 'entry'}
  }
  const endpoints = {
    getRevs: {uri: 'http://some.couchdb.com/_all_docs{?keys=ids|wrap([, ", ", ])}', path: 'rows[]'}
  }
  const source = createSource({id: 'entries', endpoints, adapter: json})
  sinon.stub(source, 'retrieveRaw').resolves({
    status: 'ok',
    data: {rows: [{key: 'entry:ent1', error: 'not_found'}]}
  })

  await beforeSerialize(request, {source})

  t.is(request.data._rev, undefined)
})

test('should handle error on rev endpoint', async (t) => {
  const request = {
    uri: 'http://some.couchdb.com/entry:ent1',
    data: {id: 'entry:ent1', type: 'entry'}
  }
  const endpoints = {
    getRevs: {uri: 'http://some.couchdb.com/_all_docs{?keys=ids|wrap([, ", ", ])}', path: 'rows[]'}
  }
  const source = createSource({id: 'entries', endpoints, adapter: json})
  sinon.stub(source, 'retrieveRaw').resolves({status: 'error', error: 'Server failed'})

  await beforeSerialize(request, {source})

  t.is(request.data._rev, undefined)
})

test('should set rev for more items', async (t) => {
  const request = {
    uri: 'http://some.couchdb.com/entry:ent1',
    data: [
      {id: 'entry:ent1', type: 'entry'},
      {id: 'entry:ent3', type: 'entry'},
      {id: 'entry:ent2', type: 'entry'}
    ]
  }
  const endpoints = {
    getRevs: {
      uri: 'http://some.couchdb.com/_all_docs{?keys=ids|wrap([, ", ", ])}',
      path: 'rows[]'
    }
  }
  const source = createSource({id: 'entries', endpoints, adapter: json})
  sinon.stub(source, 'retrieveRaw').resolves({
    status: 'ok',
    data: {rows: [
      {id: 'entry:ent1', value: {rev: '2-rev'}},
      {id: 'entry:ent3', value: {rev: '5-rev'}},
      {id: 'entry:ent2', value: {rev: '1-rev'}}
    ]}
  })
  const expectedReq = {
    uri: 'http://some.couchdb.com/_all_docs?keys=%5B%22entry%3Aent1%22%2C%22entry%3Aent3%22%2C%22entry%3Aent2%22%5D'
  }

  await beforeSerialize(request, {source})

  t.true(Array.isArray(request.data))
  t.is(request.data.length, 3)
  t.is(request.data[0]._rev, '2-rev')
  t.is(request.data[1]._rev, '5-rev')
  t.is(request.data[2]._rev, '1-rev')
  t.is(source.retrieveRaw.callCount, 1)
  t.deepEqual(source.retrieveRaw.args[0][0], expectedReq)
})

test('should set existing attributes for meta', async (t) => {
  const lastSyncedAtOld = new Date('2017-05-22T19:12:00.000Z')
  const lastSyncedAt = new Date('2017-05-23T18:43:00.000Z')
  const request = {
    uri: 'http://some.couchdb.com/entry:ent1',
    data: {id: 'meta:entries', type: 'meta', attributes: {lastSyncedAt}}
  }
  const endpoints = {
    getRevs: {uri: 'http://some.couchdb.com/_all_docs{?keys=ids|wrap([, ", ", ]),include_docs=includeDocs?}', path: 'rows[]'}
  }
  const source = createSource({id: 'entries', endpoints, adapter: json})
  sinon.stub(source, 'retrieveRaw').resolves({
    status: 'ok',
    data: {
      rows: [{
        id: 'meta:entries',
        value: {rev: '2-rev'},
        doc: {_id: 'meta:entries', type: 'meta', attributes: {readOnly: true, lastSyncedAt: lastSyncedAtOld}}
      }]
    }
  })
  const expectedReq = {uri: 'http://some.couchdb.com/_all_docs?keys=%5B%22meta%3Aentries%22%5D&include_docs=true'}

  await beforeSerialize(request, {source})

  t.is(request.data._rev, '2-rev')
  t.true(request.data.attributes.readOnly)
  t.deepEqual(request.data.attributes.lastSyncedAt, lastSyncedAt)
  t.is(source.retrieveRaw.callCount, 1)
  t.deepEqual(source.retrieveRaw.args[0][0], expectedReq)
})
