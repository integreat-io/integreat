import test from 'ava'
import Schema from '../schema/Schema.js'

import createMapOptions from './createMapOptions.js'

// Setup

const mutations = {
  entries_entry: [
    {
      id: 'id',
      title: 'headline',
    },
  ],
  entries_user: [
    {
      id: 'username',
      name: 'fullName',
    },
  ],
}

const schemas = new Map()
schemas.set('entry', new Schema({ id: 'entry' }))
schemas.set('user', new Schema({ id: 'user' }))

const transformers = {
  string: () => () => (value: unknown) => String(value),
}

const dictionaries = {
  userRole: [['super', 'admin'] as const, ['readwrite', 'editor'] as const],
}

// Tests

test('should return default nonvalues', (t) => {
  const expected = [undefined, null, '']
  const ret = createMapOptions(new Map(), mutations, transformers)

  t.deepEqual(ret.nonvalues, expected)
})

test('should return provided nonvalues', (t) => {
  const nonvalues = [undefined, null]
  const expected = [undefined, null]
  const ret = createMapOptions(
    new Map(),
    mutations,
    transformers,
    undefined,
    nonvalues,
  )

  t.deepEqual(ret.nonvalues, expected)
})

test('should return map options with pipelines from mutations', (t) => {
  const expected = mutations
  const ret = createMapOptions(new Map(), mutations, transformers)

  t.deepEqual(ret.pipelines, expected)
})

test('should include transformers', (t) => {
  const ret = createMapOptions(schemas, mutations, transformers)

  const trans = ret.transformers || {}
  t.is(typeof trans.string, 'function')
  t.is(typeof trans[Symbol.for('cast_entry')], 'function')
  t.is(typeof trans[Symbol.for('cast_user')], 'function')
})

test('should include dictionaries', (t) => {
  const ret = createMapOptions(schemas, mutations, transformers, dictionaries)

  t.is(ret.dictionaries, dictionaries)
})
