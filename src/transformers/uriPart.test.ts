import test from 'ava'

import uriPart from './uriPart'

// Setup

const operands = {}
const options = {}
const state = {
  rev: false,
  onlyMappedValues: false,
  context: [],
  value: {},
}
const stateRev = {
  rev: true,
  onlyMappedValues: false,
  context: [],
  value: {},
}

// Tests

test('should encode uri part going to service', (t) => {
  const value = "*[_type=='table'&&key==$table][0].fields{key,name,type}"
  const expected =
    "*%5B_type%3D%3D'table'%26%26key%3D%3D%24table%5D%5B0%5D.fields%7Bkey%2Cname%2Ctype%7D"

  const ret = uriPart(operands, options)(value, stateRev)

  t.is(ret, expected)
})

test('should decode uri part coming from service', (t) => {
  const value =
    "*%5B_type%3D%3D'table'%26%26key%3D%3D%24table%5D%5B0%5D.fields%7Bkey%2Cname%2Ctype%7D"
  const expected = "*[_type=='table'&&key==$table][0].fields{key,name,type}"

  const ret = uriPart(operands, options)(value, state)

  t.is(ret, expected)
})

test('should force some value to string going to service', (t) => {
  t.is(uriPart(operands, options)(3, stateRev), '3')
  t.is(uriPart(operands, options)(true, stateRev), 'true')
  t.is(
    uriPart(operands, options)(new Date('2020-08-12T13:15:43Z'), stateRev),
    '2020-08-12T13%3A15%3A43.000Z'
  )
})

test('should return undefined for other values', (t) => {
  t.is(uriPart(operands, options)({}, stateRev), undefined)
  t.is(uriPart(operands, options)(null, stateRev), undefined)
  t.is(uriPart(operands, options)(undefined, stateRev), undefined)
})
