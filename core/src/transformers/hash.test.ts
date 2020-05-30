import test from 'ava'

import hash from './hash'

test('should return hashed string', t => {
  const unhashed = 'https://test.com/a/long/path?with=queries'
  const expected = '9prI09j7pPp9qkyZAO1EwN7kWT2r-g_dCI7HeD_Tdgw~'

  const ret = hash(unhashed)

  t.is(ret, expected)
})

test('should return null when given null', t => {
  const ret = hash(null)

  t.is(ret, null)
})

test('should return undefined when given null', t => {
  const ret = hash(undefined)

  t.is(ret, undefined)
})

test('should return empty string when given empty string', t => {
  const ret = hash('')

  t.is(ret, '')
})

test('should treat number as a string', t => {
  const unhashed = 42
  const expected = 'c0dctApWjo2ooEXO0RATfhWfiQrE2og7axfcZRs6gEk~'

  const ret = hash(unhashed)

  t.is(ret, expected)
})
