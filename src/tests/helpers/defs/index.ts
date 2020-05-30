import entrySchema from './schemas/entry'
import userSchema from './schemas/user'

import entriesService from './services/entries'
import usersService from './services/users'

import entriesEntryMutation from './mutations/entries-entry'
import exchangeJsonMutation from './mutations/exchangeJson'
import usersUserMutation from './mutations/users-user'

export default {
  schemas: [entrySchema, userSchema],
  services: [entriesService, usersService],
  mutations: {
    'entries-entry': entriesEntryMutation,
    'users-user': usersUserMutation,
    'exchange:json': exchangeJsonMutation,
  },
  dictionaries: {
    userRole: [['super', 'admin'] as const, ['readwrite', 'editor'] as const],
  },
  identConfig: {
    type: 'user',
  },
}
