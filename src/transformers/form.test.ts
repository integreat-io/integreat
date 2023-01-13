import test from 'ava'

import form from './form.js'

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

// Tests -- from service

test('should normalize simple form data', (t) => {
  const data = 'value=1&text=Several+words+here'
  const expected = {
    value: 1,
    text: 'Several words here',
  }

  const ret = form(operands, options)(data, state)

  t.deepEqual(ret, expected)
})

test('should normalize one pair', (t) => {
  const data = 'value=1'
  const expected = {
    value: 1,
  }

  const ret = form(operands, options)(data, state)

  t.deepEqual(ret, expected)
})

test('should normalize form data with objects', (t) => {
  const data =
    'value=1&text=Several+words+here&object=%7B%22id%22%3A%22ent1%22%2C%22type%22%3A%22entry%22%7D'
  const expected = {
    value: 1,
    text: 'Several words here',
    object: { id: 'ent1', type: 'entry' },
  }

  const ret = form(operands, options)(data, state)

  t.deepEqual(ret, expected)
})

test('should treat key without value as having undefined value', (t) => {
  const data = 'key'
  const expected = {
    key: undefined,
  }

  const ret = form(operands, options)(data, state)

  t.deepEqual(ret, expected)
})

test('should return null when not a string', (t) => {
  const data = null
  const expected = null

  const ret = form(operands, options)(data, state)

  t.deepEqual(ret, expected)
})

// Tests -- to service

test('should serialize simple data object', (t) => {
  const data = {
    value: 1,
    text: 'Several words here',
  }
  const expectedData = 'value=1&text=Several+words+here'

  const ret = form(operands, options)(data, stateRev)

  t.is(ret, expectedData)
})

test('should serialize uri', (t) => {
  const data = {
    value: 1,
    redirect_uri: 'http://redirect.com/to/this.html',
  }
  const expectedData =
    'value=1&redirect_uri=http%3A%2F%2Fredirect.com%2Fto%2Fthis.html'

  const ret = form(operands, options)(data, stateRev)

  t.is(ret, expectedData)
})

test('should serialize object', (t) => {
  const data = {
    value: 1,
    object: { id: 'ent1', type: 'entry' },
  }
  const expectedData =
    'value=1&object=%7B%22id%22%3A%22ent1%22%2C%22type%22%3A%22entry%22%7D'

  const ret = form(operands, options)(data, stateRev)

  t.is(ret, expectedData)
})

test('should serialize object with one key', (t) => {
  const data = {
    text: 'Several words here',
  }
  const expectedData = 'text=Several+words+here'

  const ret = form(operands, options)(data, stateRev)

  t.is(ret, expectedData)
})

test('should serialize first object in array', (t) => {
  const data = [{ value: 1 }, { value: 2 }]
  const expectedData = 'value=1'

  const ret = form(operands, options)(data, stateRev)

  t.is(ret, expectedData)
})

test('should serialize keys with empty values', (t) => {
  const data = {
    none: undefined,
    nil: null,
    empty: '',
    zero: 0,
  }
  const expectedData = 'none&nil=null&empty=&zero=0'

  const ret = form(operands, options)(data, stateRev)

  t.is(ret, expectedData)
})

test('should return null when not an object', (t) => {
  const data = null
  const expectedData = null

  const ret = form(operands, options)(data, stateRev)

  t.deepEqual(ret, expectedData)
})
