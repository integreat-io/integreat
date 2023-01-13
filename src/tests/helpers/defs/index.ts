import entrySchema from './schemas/entry.js'
import userSchema from './schemas/user.js'

import apiService from './services/api.js'
import entriesService from './services/entries.js'
import usersService from './services/users.js'

import apiEntryMutation from './mutations/api-entry.js'
import entriesEntryMutation from './mutations/entries-entry.js'
import exchangeJsonMutation from '../../../mutations/exchangeJson.js'
import exchangeUriMutation from '../../../mutations/exchangeUri.js'
import usersUserMutation from './mutations/users-user.js'

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
