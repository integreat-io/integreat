import test from 'ava'

import trim from './trim'

// Setup

const operands = {}
const options = {}
const context = {
  rev: false,
  onlyMappedValues: false,
}

// Tests

test('should trim from service', (t) => {
  t.is(
    trim(operands, options)(' Space on each side ', context),
    'Space on each side'
  )
  t.is(trim(operands, options)(' Space in front', context), 'Space in front')
  t.is(
    trim(operands, options)('Space on the end ', context),
    'Space on the end'
  )
  t.is(trim(operands, options)('No space', context), 'No space')
  t.is(trim(operands, options)(' ', context), '')
})

test('should not touch things that are not string from service', (t) => {
  t.is(trim(operands, options)(3, context), 3)
  t.is(trim(operands, options)(true, context), true)
  t.is(trim(operands, options)(null, context), null)
  t.is(trim(operands, options)(undefined, context), undefined)
  t.deepEqual(trim(operands, options)({}, context), {})
})
