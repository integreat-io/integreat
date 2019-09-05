import test from 'ava'

import createMapOptions from './createMapOptions'

// Setup

const mappings = [
  {
    id: 'entries_entry',
    type: 'entry',
    pipeline: [
      {
        id: 'id',
        title: 'headline'
      }
    ]
  },
  {
    id: 'entries_user',
    type: 'user',
    pipeline: [
      {
        id: 'username',
        name: 'fullName'
      }
    ]
  }
]

const schemaMappings = {
  entry: [
    { $filter: 'equalOrNoSchema', type: 'entry' },
    {
      $iterate: true,
      id: { $transform: 'string' },
      title: { $transform: 'string' }
    }
  ],
  user: [
    { $filter: 'equalOrNoSchema', type: 'user' },
    {
      $iterate: true,
      id: { $transform: 'string' },
      name: { $transform: 'string' }
    }
  ]
}

const transformFunctions = {
  string: () => (value: unknown) => String(value)
}

// Tests

test('should return map options with pipelines from mappings', t => {
  const expected = {
    ['entries_entry']: mappings[0].pipeline,
    ['entries_user']: mappings[1].pipeline
  }

  const ret = createMapOptions(mappings, {}, transformFunctions)

  t.deepEqual(ret.pipelines, expected)
})

test('should include schema cast mappings in pipelines', t => {
  const expected = {
    ['entries_entry']: mappings[0].pipeline,
    ['entries_user']: mappings[1].pipeline,
    ['cast_entry']: schemaMappings.entry,
    ['cast_user']: schemaMappings.user
  }

  const ret = createMapOptions(mappings, schemaMappings, transformFunctions)

  t.deepEqual(ret.pipelines, expected)
})

test('should include transform functions', t => {
  const ret = createMapOptions(mappings, schemaMappings, transformFunctions)

  t.is(ret.functions, transformFunctions)
})

test.todo('should have some error checking')
