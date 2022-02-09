import test from 'ava'

import mergeDefinitions from './mergeDefinitions'

// Setup

const currencies = [['LOCAL', 'NOK'] as const, ['*', '*'] as const]
const roles = [['root', 'admin'] as const, ['writer', 'user'] as const]

const entrySchema = {
  id: 'entry',
  service: 'entries',
  shape: {
    title: 'string',
  },
  access: 'all',
}

const userSchema = {
  id: 'user',
  shape: {
    name: 'string',
  },
  access: 'all',
}

const entryMutation = [
  {
    $iterate: true,
    id: ['key', { $transform: 'prefixId' }],
    title: [
      'headline',
      { $alt: 'value', value: 'An entry' },
      { $transform: 'trim' },
    ],
  },
  { $apply: 'cast_entry' },
]

const entriesService = {
  id: 'entries',
  transporter: 'mock',
  auth: 'entries',
  mutation: [{ $apply: 'exchange:json' }],
  endpoints: [
    {
      mutation: {
        data: ['data', { $apply: 'entries-entry' }],
      },
    },
  ],
}
const usersService = {
  id: 'users',
  transporter: 'mock',
  auth: 'users',
  mutation: [{ $apply: 'exchange:json' }],
  endpoints: [
    {
      mutation: {
        data: 'data.users',
      },
    },
  ],
}

const queueService = {
  id: 'queue',
  transporter: 'mock',
  auth: true,
  endpoints: [],
}

const entriesAuth = {
  id: 'entries',
  authenticator: 'options',
  options: { token: 's3cr3t' },
}

const usersAuth = {
  id: 'users',
  authenticator: 'options',
  options: { token: 's3cr3t' },
}

const schedule1 = {
  cron: '5 2 * * *',
  action: {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'old',
      to: 'new',
    },
  },
}

const schedule2 = {
  cron: '0 4 * * *',
  action: {
    type: 'SYNC',
    payload: {
      type: 'user',
      from: 'old',
      to: 'new',
    },
  },
}

// Tests

test('should merge three definitions', (t) => {
  const def1 = {
    auths: [entriesAuth],
    schemas: [entrySchema],
    services: [entriesService],
    mutations: { 'entries-entry': entryMutation },
    dictionaries: { currencies },
    schedules: [schedule1],
    identConfig: {
      type: 'unknown',
    },
  }
  const def2 = {
    services: [queueService],
    queueService: 'queue',
    schedules: [],
  }
  const def3 = {
    auths: [usersAuth],
    schemas: [userSchema],
    services: [usersService],
    mutations: {},
    dictionaries: { roles },
    schedules: [schedule2],
    identConfig: {
      type: 'user',
      props: { tokens: 'secrets' },
    },
  }
  const expected = {
    auths: [entriesAuth, usersAuth],
    schemas: [entrySchema, userSchema],
    services: [entriesService, queueService, usersService],
    mutations: { 'entries-entry': entryMutation },
    queueService: 'queue',
    dictionaries: {
      currencies,
      roles,
    },
    schedules: [schedule1, schedule2],
    identConfig: {
      type: 'user',
      props: { tokens: 'secrets' },
    },
  }

  const ret = mergeDefinitions(def1, def2, def3)

  t.deepEqual(ret, expected)
})

// schemas: SchemaDef[]
// services: ServiceDef[]
// mutations?: Record<string, MapDefinition>
// auths?: AuthDef[]
// identConfig?: IdentConfig
// queueService?: string
// dictionaries?: Dictionaries
// schedules?: ScheduleDef[]
