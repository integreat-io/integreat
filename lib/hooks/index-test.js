import test from 'ava'

import workers from '.'

test('should return object with hooks', (t) => {
  const ret = workers()

  t.truthy(ret)
  t.is(typeof ret['couchdb-afterNormalize'], 'function')
  t.is(typeof ret['couchdb-beforeSerialize'], 'function')
})
