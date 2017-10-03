import test from 'ava'
import nock from 'nock'
import json from '../../adapters/json'
import source from '../source'
import datatype from '../datatype'

import deleteOne from './deleteOne'

// Helpers
const datatypes = {entry: datatype({id: 'entry', attributes: {type: 'string', title: {default: 'A title'}}})}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof deleteOne, 'function')
})

test('should delete item from source', async (t) => {
  const scope = nock('http://api1.test')
    .delete('/database/ent1')
      .reply(200, {ok: true, id: 'ent1', rev: '000001'})
  const endpoints = {deleteOne: {uri: 'http://api1.test/database/{id}', method: 'DELETE'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {id: 'ent1', type: 'entry', source: 'entries'}

  const ret = await deleteOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should infer source id from type', async (t) => {
  const scope = nock('http://api2.test')
    .delete('/database/ent1')
      .reply(200, {ok: true, id: 'ent1', rev: '000001'})
  const endpoints = {deleteOne: {uri: 'http://api2.test/database/{id}', method: 'DELETE'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const getSource = (type, source) => (type === 'entry') ? src : null
  const payload = {id: 'ent1', type: 'entry'}

  const ret = await deleteOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should provide DELETE method', async (t) => {
  const scope = nock('http://api2.test')
    .delete('/database/ent1')
      .reply(200, {ok: true, id: 'ent1', rev: '000001'})
  const endpoints = {deleteOne: {uri: 'http://api2.test/database/{id}'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const getSource = (type, source) => src
  const payload = {id: 'ent1', type: 'entry'}

  const ret = await deleteOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should delete with other endpoint', async (t) => {
  const scope = nock('http://api3.test')
    .delete('/database/ent1')
      .reply(200, {ok: true, id: 'ent1', rev: '000001'})
  const endpoints = {other: {uri: 'http://api3.test/database/{id}', method: 'DELETE'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const getSource = (type, source) => src
  const payload = {id: 'ent1', type: 'entry', endpoint: 'other'}

  const ret = await deleteOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should delete with uri params', async (t) => {
  const scope = nock('http://api4.test')
    .delete('/entries/ent1')
      .reply(200, {ok: true, id: 'ent1', rev: '000001'})
  const endpoints = {deleteOne: {uri: 'http://api4.test/{typefolder}/{id}', method: 'DELETE'}}
  const src = source({id: 'entries', adapter: json, endpoints}, {datatypes})
  const getSource = (type, source) => src
  const payload = {
    id: 'ent1',
    type: 'entry',
    params: {typefolder: 'entries'}
  }

  const ret = await deleteOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error if no getSource', async (t) => {
  const payload = {id: 'ent1', type: 'entry'}

  const ret = await deleteOne(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = source({id: 'entries', adapter: json}, {datatypes})
  const getSource = () => src

  const ret = await deleteOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
