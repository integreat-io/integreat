import test from 'ava'

import transformers from '.'

test('should return object with transformers', (t) => {
  const ret = transformers()

  t.true(Object.keys(ret).length > 0)
  Object.keys(ret).forEach((key) => {
    // eslint-disable-next-line security/detect-object-injection
    const fn = ret[key]
    t.is(typeof fn, 'function')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t.true(['function', 'undefined'].includes(typeof (fn as any).rev))
  })
})
