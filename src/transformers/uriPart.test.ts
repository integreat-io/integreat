import test from 'ava'

import uriPart from './uriPart'

// Setup

const operands = {}
const options = {}
const context = {
  rev: false,
  onlyMappedValues: false,
}
const contextRev = {
  rev: true,
  onlyMappedValues: false,
}

// Tests

test('should encode uri part going to service', (t) => {
  const value = "*[_type=='table'&&key==$table][0].fields{key,name,type}"
  const expected =
    "*%5B_type%3D%3D'table'%26%26key%3D%3D%24table%5D%5B0%5D.fields%7Bkey%2Cname%2Ctype%7D"

  const ret = uriPart(operands, options)(value, contextRev)

  t.is(ret, expected)
})

test('should decode uri part coming from service', (t) => {
  const value =
    "*%5B_type%3D%3D'table'%26%26key%3D%3D%24table%5D%5B0%5D.fields%7Bkey%2Cname%2Ctype%7D"
  const expected = "*[_type=='table'&&key==$table][0].fields{key,name,type}"

  const ret = uriPart(operands, options)(value, context)

  t.is(ret, expected)
})

test('should force some value to string going to service', (t) => {
  t.is(uriPart(operands, options)(3, contextRev), '3')
  t.is(uriPart(operands, options)(true, contextRev), 'true')
  t.is(
    uriPart(operands, options)(new Date('2020-08-12T13:15:43Z'), contextRev),
    '2020-08-12T13%3A15%3A43.000Z'
  )
})

test('should return undefined for other values', (t) => {
  t.is(uriPart(operands, options)({}, contextRev), undefined)
  t.is(uriPart(operands, options)(null, contextRev), undefined)
  t.is(uriPart(operands, options)(undefined, contextRev), undefined)
})
