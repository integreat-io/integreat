import test from 'ava'

import mergeDefinitions from './mergeDefinitions.js'

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

const entryMutation = {
  $iterate: true,
  id: ['key', { $transform: 'prefixId' }],
  title: [
    { $alt: ['headline', { $value: 'An entry' }] },
    { $transform: 'trim' },
  ],
}

const entriesService = {
  id: 'entries',
  transporter: 'mock',
  auth: 'entries',
  adapters: ['json'],
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
  adapters: ['json'],
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

const job1 = {
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

const job2 = {
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
    jobs: [job1],
    identConfig: {
      type: 'unknown',
    },
  }
  const def2 = {
    services: [queueService],
    queueService: 'queue',
    jobs: [],
  }
  const def3 = {
    auths: [usersAuth],
    schemas: [userSchema],
    services: [usersService],
    mutations: {},
    dictionaries: { roles },
    jobs: [job2],
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
    jobs: [job1, job2],
    identConfig: {
      type: 'user',
      props: { tokens: 'secrets' },
    },
  }

  const ret = mergeDefinitions(def1, def2, def3)

  t.deepEqual(ret, expected)
})
