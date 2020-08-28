import entrySchema from './schemas/entry'
import userSchema from './schemas/user'

import apiService from './services/api'
import entriesService from './services/entries'
import usersService from './services/users'

import apiEntryMutation from './mutations/api-entry'
import entriesEntryMutation from './mutations/entries-entry'
import exchangeJsonMutation from '../../../mutations/exchangeJson'
import exchangeUriMutation from '../../../mutations/exchangeUri'
import usersUserMutation from './mutations/users-user'

export default {
  schemas: [entrySchema, userSchema],
  services: [apiService, entriesService, usersService],
  mutations: {
    'api-entry': apiEntryMutation,
    'entries-entry': entriesEntryMutation,
    'users-user': usersUserMutation,
    'exchange:json': exchangeJsonMutation,
    'exchange:uri': exchangeUriMutation,
  },
  dictionaries: {
    userRole: [['super', 'admin'] as const, ['readwrite', 'editor'] as const],
  },
  identConfig: {
    type: 'user',
  },
}
