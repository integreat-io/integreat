import commentSchema from './schemas/comment.js'
import entrySchema from './schemas/entry.js'
import feedSchema from './schemas/feed.js'
import sectionSchema from './schemas/section.js'
import userSchema from './schemas/user.js'

import apiService from './services/api.js'
import entriesService from './services/entries.js'
import usersService from './services/users.js'

import apiEntryMutation from './mutations/api-entry.js'
import entriesEntryMutation from './mutations/entries-entry.js'
import usersUserMutation from './mutations/users-user.js'

export default {
  schemas: [commentSchema, entrySchema, feedSchema, sectionSchema, userSchema],
  services: [apiService, entriesService, usersService],
  mutations: {
    'api-entry': apiEntryMutation,
    'entries-entry': entriesEntryMutation,
    'users-user': usersUserMutation,
  },
  dictionaries: {
    userRole: [['super', 'admin'] as const, ['readwrite', 'editor'] as const],
  },
  identConfig: {
    type: 'user',
  },
}
