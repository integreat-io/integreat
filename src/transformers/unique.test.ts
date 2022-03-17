import test from 'ava'

import unique from './unique'

// Setup

const context = {
  rev: false,
  onlyMappedValues: false,
}
const contextRev = {
  rev: true,
  onlyMappedValues: false,
}

// Tests

test('should return unique string', (t) => {
  const ret1 = unique({})(undefined, context)
  const ret2 = unique({})(undefined, context)

  t.is(typeof ret1, 'string')
  t.is(typeof ret2, 'string')
  t.not(ret1, ret2)
})

test('should return uuid in lowercase', (t) => {
  const ret1 = unique({ type: 'uuid' })(undefined, context)
  const ret2 = unique({ type: 'uuid' })(undefined, context)

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
  const ret1 = unique({ type: 'uuidLower' })(undefined, context)
  const ret2 = unique({ type: 'uuidLower' })(undefined, context)

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
  const ret1 = unique({ type: 'uuidUpper' })(undefined, context)
  const ret2 = unique({ type: 'uuidUpper' })(undefined, context)

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
  const ret1 = unique({})(undefined, contextRev)
  const ret2 = unique({})(undefined, contextRev)

  t.is(typeof ret1, 'string')
  t.is(typeof ret2, 'string')
  t.not(ret1, ret2)
})
