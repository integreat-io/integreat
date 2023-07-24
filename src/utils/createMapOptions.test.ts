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

const schemas = {
  entry: new Schema({ id: 'entry' }),
  user: new Schema({ id: 'user' }),
}

const transformers = {
  string: () => () => (value: unknown) => String(value),
}

const dictionaries = {
  userRole: [['super', 'admin'] as const, ['readwrite', 'editor'] as const],
}

// Tests

test('should return map options with pipelines from mutations', (t) => {
  const expected = mutations
  const ret = createMapOptions({}, mutations, transformers)

  t.deepEqual(ret.pipelines, expected)
})

test('should include schema cast mutations in pipelines', (t) => {
  const expected = {
    ...mutations,
    ['cast_entry']: schemas.entry.mutation,
    ['cast_user']: schemas.user.mutation,
  }

  const ret = createMapOptions(schemas, mutations, transformers)

  t.deepEqual(ret.pipelines, expected)
})

test('should include transformers', (t) => {
  const ret = createMapOptions(schemas, mutations, transformers)

  t.is(ret.transformers, transformers)
})

test('should include dictionaries', (t) => {
  const ret = createMapOptions(schemas, mutations, transformers, dictionaries)

  t.is(ret.dictionaries, dictionaries)
})
