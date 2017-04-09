import test from 'ava'

import parseUriTemplate from './parseUriTemplate'

test('should exist', (t) => {
  t.is(typeof parseUriTemplate, 'function')
})

test('should replace parameters in template', (t) => {
  const template = 'http://api.test/{id}{?first,max}'
  const params = {id: 'entries', first: 1, max: 20}
  const expected = 'http://api.test/entries?first=1&max=20'

  const ret = parseUriTemplate(template, params)

  t.is(ret, expected)
})

test('should require parameters', (t) => {
  const template = 'http://api.test/{id}'
  const params = {}

  t.throws(() => {
    parseUriTemplate(template, params)
  })
})

test('should not require query parameters', (t) => {
  const template = 'http://api.test/{id}{?first}'
  const params = {id: 'entries'}

  let ret
  t.notThrows(() => {
    ret = parseUriTemplate(template, params)
  })

  t.is(ret, 'http://api.test/entries')
})

test('should not require query continued parameters', (t) => {
  const template = 'http://api.test/{id}?first=1{&max}'
  const params = {id: 'entries'}

  let ret
  t.notThrows(() => {
    ret = parseUriTemplate(template, params)
  })

  t.is(ret, 'http://api.test/entries?first=1')
})

test('should not fail with no required parameters', (t) => {
  const template = 'http://api.test/'
  const params = {}

  t.notThrows(() => {
    parseUriTemplate(template, params)
  })
})
