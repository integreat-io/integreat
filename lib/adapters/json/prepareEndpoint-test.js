import test from 'ava'
import {compile as compileUri} from 'great-uri-template'
import {compile as compilePath} from '../../utils/path'

import {prepareEndpoint} from '.'

test('should exist', (t) => {
  t.is(typeof prepareEndpoint, 'function')
})

test('should return endpoint object', (t) => {
  const options = {
    uri: 'http://example.com/'
  }

  const ret = prepareEndpoint(options)

  t.truthy(ret)
  t.truthy(ret.uri)
  t.is(ret.path, null)
  t.is(ret.method, null)
})

test('should compile uri', (t) => {
  const uri = 'http://example.com/{type}/{id}{?first,max}'
  const options = {uri}
  const expected = compileUri(uri)

  const ret = prepareEndpoint(options)

  t.truthy(ret)
  t.deepEqual(ret.uri, expected)
})

test('should throw when no uri', (t) => {
  const options = {}

  t.throws(() => prepareEndpoint(options))
})

test('should return method', (t) => {
  const options = {
    uri: 'http://example.com/',
    method: 'GET'
  }

  const ret = prepareEndpoint(options)

  t.is(ret.method, 'GET')
})

test('should compile path', (t) => {
  const path = 'items[]'
  const options = {
    uri: 'http://example.com/',
    path
  }
  const expected = compilePath(path)

  const ret = prepareEndpoint(options)

  t.deepEqual(ret.path, expected)
})

test('should use baseUri from service options', (t) => {
  const baseUri = 'http://example.com/'
  const uri = '{type}/{id}{?first,max}'
  const options = {uri}
  const expected = compileUri(baseUri + uri)

  const ret = prepareEndpoint(options, {baseUri})

  t.truthy(ret)
  t.deepEqual(ret.uri, expected)
})

test('should use not prepend baseUri when null', (t) => {
  const baseUri = null
  const uri = 'http://example.com/{type}/{id}{?first,max}'
  const options = {uri}
  const expected = compileUri(uri)

  const ret = prepareEndpoint(options, {baseUri})

  t.truthy(ret)
  t.deepEqual(ret.uri, expected)
})
