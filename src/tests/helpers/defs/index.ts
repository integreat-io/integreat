import entrySchema from './schemas/entry'
import userSchema from './schemas/user'

import entriesService from './services/entries'
import usersService from './services/users'

import entriesEntryMapping from './mappings/entries-entry'
import exchangeJsonMapping from './mappings/exchangeJson'
import usersUserMapping from './mappings/users-user'

export default {
  schemas: [entrySchema, userSchema],
  services: [entriesService, usersService],
  mappings: [entriesEntryMapping, usersUserMapping, exchangeJsonMapping],
  dictionaries: {
    userRole: [['super', 'admin'] as const, ['readwrite', 'editor'] as const],
  },
  identConfig: {
    type: 'user',
  },
}
