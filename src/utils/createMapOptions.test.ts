import test from 'ava'
import createSchema from '../schema/index.js'

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
  entry: createSchema({
    id: 'entry',
  }),
  user: createSchema({
    id: 'user',
  }),
}

const transformFunctions = {
  string: () => (value: unknown) => String(value),
}

const dictionaries = {
  userRole: [['super', 'admin'] as const, ['readwrite', 'editor'] as const],
}

// Tests

test('should return map options with pipelines from mutations', (t) => {
  const expected = mutations
  const ret = createMapOptions({}, mutations, transformFunctions)

  t.deepEqual(ret.pipelines, expected)
})

test('should include schema cast mutations in pipelines', (t) => {
  const expected = {
    ...mutations,
    ['cast_entry']: schemas.entry.mapping,
    ['cast_user']: schemas.user.mapping,
  }

  const ret = createMapOptions(schemas, mutations, transformFunctions)

  t.deepEqual(ret.pipelines, expected)
})

test('should include transform functions', (t) => {
  const ret = createMapOptions(schemas, mutations, transformFunctions)

  t.is(ret.functions, transformFunctions)
})

test('should include dictionaries functions', (t) => {
  const ret = createMapOptions(
    schemas,
    mutations,
    transformFunctions,
    dictionaries
  )

  t.is(ret.dictionaries, dictionaries)
})
