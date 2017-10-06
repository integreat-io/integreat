import test from 'ava'

import adapters from '.'

test('should return object with adapters', (t) => {
  const ret = adapters()

  t.truthy(ret)
  t.truthy(ret.json)
  t.is(typeof ret.json.send, 'function')
})
