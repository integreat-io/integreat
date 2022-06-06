import test from 'ava'

import round from './round'

// Setup

const state = {
  rev: false,
  onlyMappedValues: false, // Will apply in both directions
  root: {},
  context: {},
  value: {},
}

// Tests

test('should round floats to two decimals', (t) => {
  const round2 = round({ precision: 2 })

  t.is(round2(18.4211, state), 18.42)
  t.is(round2(18.42, state), 18.42)
  t.is(round2(18.3, state), 18.3)
  t.is(round2(18, state), 18)
  t.is(round2(18.3352, state), 18.34)
  t.is(round2(-18.3352, state), -18.34)
})

test('should round floats to three decimals', (t) => {
  const round3 = round({ precision: 3 })

  t.is(round3(18.4211, state), 18.421)
  t.is(round3(18.42, state), 18.42)
  t.is(round3(18.3, state), 18.3)
  t.is(round3(18, state), 18)
  t.is(round3(18.3352, state), 18.335)
  t.is(round3(-18.3352, state), -18.335)
})

test('should round to integer as default', (t) => {
  t.is(round({})(18.4211, state), 18)
})

test('should parse number from string', (t) => {
  const round2 = round({ precision: 2 })

  t.is(round2('18.4211', state), 18.42)
  t.is(round2('18', state), 18)
  t.is(round2('18.3352', state), 18.34)
  t.is(round2('-18.3352', state), -18.34)
})

test('should return undefined for other types', (t) => {
  const round2 = round({ precision: 2 })

  t.is(round2('not number', state), undefined)
  t.is(round2(true, state), undefined)
  t.is(round2(new Date(), state), undefined)
  t.is(round2(null, state), undefined)
  t.is(round2(undefined, state), undefined)
})
