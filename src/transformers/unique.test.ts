import test from 'ava'

import unique from './unique'

// Setup

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

test('should return unique string', (t) => {
  const ret1 = unique({})(undefined, state)
  const ret2 = unique({})(undefined, state)

  t.is(typeof ret1, 'string')
  t.is(typeof ret2, 'string')
  t.not(ret1, ret2)
})

test('should return uuid in lowercase', (t) => {
  const ret1 = unique({ type: 'uuid' })(undefined, state)
  const ret2 = unique({ type: 'uuid' })(undefined, state)

  t.regex(
    ret1 as string,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  )
  t.regex(
    ret2 as string,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  )
  t.not(ret1, ret2)
})

test('should return uuid in lowercase when using alias', (t) => {
  const ret1 = unique({ type: 'uuidLower' })(undefined, state)
  const ret2 = unique({ type: 'uuidLower' })(undefined, state)

  t.regex(
    ret1 as string,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  )
  t.regex(
    ret2 as string,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  )
  t.not(ret1, ret2)
})

test('should return uuid in uppercase', (t) => {
  const ret1 = unique({ type: 'uuidUpper' })(undefined, state)
  const ret2 = unique({ type: 'uuidUpper' })(undefined, state)

  t.regex(
    ret1 as string,
    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/
  )
  t.regex(
    ret2 as string,
    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/
  )
  t.not(ret1, ret2)
})

test('should return unique string in rev', (t) => {
  const ret1 = unique({})(undefined, stateRev)
  const ret2 = unique({})(undefined, stateRev)

  t.is(typeof ret1, 'string')
  t.is(typeof ret2, 'string')
  t.not(ret1, ret2)
})
