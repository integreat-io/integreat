import test from 'ava'
import Source from './source'

import Sources from './sources'

// Tests -- get and set

test('should exist', (t) => {
  t.is(typeof Sources, 'function')
})

test('set should exist', (t) => {
  const sources = new Sources()

  t.is(typeof sources.set, 'function')
})

test('get should exist', (t) => {
  const sources = new Sources()

  t.is(typeof sources.get, 'function')
})

test('should set and get source', (t) => {
  const sources = new Sources()
  const source = new Source('src1')

  sources.set('src1', source)
  const ret = sources.get('src1')

  t.is(ret, source)
})

// Tests -- remove

test('delete should exist', (t) => {
  const sources = new Sources()

  t.is(typeof sources.delete, 'function')
})

test('should delete source', (t) => {
  const sources = new Sources()
  const source = new Source('src1')
  sources.set('src1', source)

  sources.delete('src1')

  const ret = sources.get('src1')
  t.is(ret, undefined)
})

// Tests -- type mapping

test('types should exist', (t) => {
  const sources = new Sources()

  t.is(typeof sources.types, 'object')
})

test('types.set should exist', (t) => {
  const sources = new Sources()

  t.is(typeof sources.types.set, 'function')
})

test('types.get should exist', (t) => {
  const sources = new Sources()

  t.is(typeof sources.types.get, 'function')
})

test('should set and get type', (t) => {
  const sources = new Sources()

  sources.types.set('entry', 'entries')
  const ret = sources.types.get('entry')

  t.deepEqual(ret, 'entries')
})

test('getFromType should exist', (t) => {
  const sources = new Sources()

  t.is(typeof sources.getFromType, 'function')
})

test('should get source from type', (t) => {
  const sources = new Sources()
  const source = new Source('entries')
  sources.set('entries', source)
  sources.types.set('entry', 'entries')

  const ret = sources.getFromType('entry')

  t.is(ret, source)
})
