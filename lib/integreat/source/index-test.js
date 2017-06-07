import test from 'ava'
import sinon from 'sinon'

import source from '.'

// Helpers

const adapter = {}

// Tests

test('should exist', (t) => {
  t.is(typeof source, 'function')
})

test('should return source object with id and adapter', (t) => {
  const id = 'entries'

  const src = source(id, {adapter})

  t.is(src.id, 'entries')
  t.is(src.adapter, adapter)
})

test('should throw when no adapter', (t) => {
  t.throws(() => {
    source('entries')
  })
})

// Tests -- endpoints

test('should have getEndpoint', (t) => {
  const src = source('entries', {adapter})

  t.is(typeof src.getEndpoint, 'function')
})

test('getEndpoint should expand and return endpoint', (t) => {
  const endpoints = {all: {uri: 'http://api.test/entries{?first,max}'}}
  const src = source('entries', {adapter, endpoints})

  const {uri} = src.getEndpoint('all', {first: 11, max: 20})

  t.is(uri, 'http://api.test/entries?first=11&max=20')
})

test('getEndpoint should return null for unknown endpoint', (t) => {
  const src = source('entries', {adapter})

  const {uri} = src.getEndpoint('unknown', {first: 11, max: 20})

  t.is(uri, null)
})

test('getEndpoint should return endpoint with baseUri', (t) => {
  const baseUri = 'http://some.api/'
  const endpoints = {one: {uri: '{type}:{id}'}}
  const src = source('entries', {adapter, endpoints, baseUri})

  const {uri} = src.getEndpoint('one', {id: 'ent1', type: 'entry'})

  t.is(uri, 'http://some.api/entry:ent1')
})

// Tests -- retrieve

test('retrieve should exist', (t) => {
  const src = source('entries', {adapter})

  t.is(typeof src.retrieve, 'function')
})

test('retrieve should retrieve from endpoint through the adapter', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const expected = {}
  const retrieve = sinon.stub().returns(Promise.resolve(expected))
  const adapter = {retrieve}
  const src = source('entries', {adapter})

  const ret = await src.retrieve(endpoint)

  t.true(retrieve.calledOnce)
  t.true(retrieve.calledWith(endpoint))
  t.is(ret, expected)
})

test('retrieve should use auth', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const auth = {}
  const retrieve = sinon.stub().returns(Promise.resolve({}))
  const adapter = {retrieve}
  const src = source('entries', {adapter, auth})

  await src.retrieve(endpoint)

  t.true(retrieve.calledWith(endpoint, auth))
})

// Tests -- send

test('send should exist', (t) => {
  const src = source('entries', {adapter})

  t.is(typeof src.send, 'function')
})

test('send should send data to endpoint through the adapter', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const data = {}
  const expected = {}
  const send = sinon.stub().returns(Promise.resolve(expected))
  const adapter = {send}
  const src = source('entries', {adapter})

  const ret = await src.send(endpoint, data)

  t.true(send.calledOnce)
  t.true(send.calledWith(endpoint, data))
  t.is(ret, expected)
})

test('send should use auth', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const data = {}
  const auth = {}
  const send = sinon.stub().returns(Promise.resolve({}))
  const adapter = {send}
  const src = source('entries', {adapter, auth})

  await src.send(endpoint, data)

  t.true(send.calledOnce)
  t.true(send.calledWith(endpoint, data, auth))
})
