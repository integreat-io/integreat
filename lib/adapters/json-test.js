import test from 'ava'
import nock from 'nock'

import {retrieve} from './json'

test('retrieve should exist', (t) => {
  t.is(typeof retrieve, 'function')
})

test('retrieve should return json object', (t) => {
  const json = {data: [
    {id: 'item1'},
    {id: 'item2'}
  ]}
  nock('http://test.site')
    .get('/items')
    .reply(200, json)

  return retrieve('http://test.site/items')

  .then((ret) => {
    t.deepEqual(ret, json)

    nock.restore()
  })
})

test('retrieve should reject with error message on 404', (t) => {
  t.plan(2)
  nock('http://test.site')
    .get('/unknown')
    .reply(404)

  return retrieve('http://test.site/unknown')

  .catch((err) => {
    t.true(err instanceof Error)
    t.true(/\s404.+http:\/\/test\.site\/unknown/.test(err.message))
  })
})

test('retrieve should reject with error message on other error', (t) => {
  t.plan(2)
  nock('http://test.site')
    .get('/error')
    .replyWithError('An awful error')

  return retrieve('http://test.site/error')

  .catch((err) => {
    t.true(err instanceof Error)
    t.true(/An\sawful\serror/.test(err.message))
  })
})
