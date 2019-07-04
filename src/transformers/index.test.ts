import test from 'ava'

import transformers from '.'

test('should return object with transformers', (t) => {
  const ret = transformers()

  t.true(Object.keys(ret).length > 0)
  Object.keys(ret).forEach((key) => {
    t.is(typeof ret[key], 'function')
    t.true(['function', 'undefined'].includes(typeof ret[key].rev))
  })
})
