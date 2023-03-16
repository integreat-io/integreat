import test from 'ava'

import trim from './trim.js'

// Setup

const operands = {}
const options = {}
const state = {
  rev: false,
  onlyMappedValues: false,
  context: [],
  value: {},
}

// Tests

test('should trim from service', (t) => {
  t.is(
    trim(operands)(options)(' Space on each side ', state),
    'Space on each side'
  )
  t.is(trim(operands)(options)(' Space in front', state), 'Space in front')
  t.is(trim(operands)(options)('Space on the end ', state), 'Space on the end')
  t.is(trim(operands)(options)('No space', state), 'No space')
  t.is(trim(operands)(options)(' ', state), '')
})

test('should not touch things that are not string from service', (t) => {
  t.is(trim(operands)(options)(3, state), 3)
  t.is(trim(operands)(options)(true, state), true)
  t.is(trim(operands)(options)(null, state), null)
  t.is(trim(operands)(options)(undefined, state), undefined)
  t.deepEqual(trim(operands)(options)({}, state), {})
})
