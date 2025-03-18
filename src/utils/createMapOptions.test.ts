import test from 'node:test'
import assert from 'node:assert/strict'
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

test('should return default nonvalues', () => {
  const expected = [undefined, null, '']
  const ret = createMapOptions(new Map(), mutations, transformers)

  assert.deepEqual(ret.nonvalues, expected)
})

test('should return provided nonvalues', () => {
  const nonvalues = [undefined, null]
  const expected = [undefined, null]
  const ret = createMapOptions(
    new Map(),
    mutations,
    transformers,
    undefined,
    nonvalues,
  )

  assert.deepEqual(ret.nonvalues, expected)
})

test('should return map options with pipelines from mutations', () => {
  const expected = mutations
  const ret = createMapOptions(new Map(), mutations, transformers)

  assert.deepEqual(ret.pipelines, expected)
})

test('should include transformers', () => {
  const ret = createMapOptions(schemas, mutations, transformers)

  const trans = ret.transformers || {}
  assert.equal(typeof trans.string, 'function')
  assert.equal(typeof trans[Symbol.for('cast_entry')], 'function')
  assert.equal(typeof trans[Symbol.for('cast_user')], 'function')
})

test('should include dictionaries', () => {
  const ret = createMapOptions(schemas, mutations, transformers, dictionaries)

  assert.equal(ret.dictionaries, dictionaries)
})
