export default {
  id: 'users-user',
  type: 'user',
  service: 'users',
  mapping: [
    {
      $iterate: true,
      id: 'user',
      username: 'user',
      firstname: 'forename',
      lastname: 'surname',
      yearOfBirth: 'birthyear',
      createdBy: 'creator',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      roles: ['roles[]', { $transform: 'map', dictionary: 'userRole' }],
      tokens: 'tokens[]',
      feeds: 'feeds[]'
    },
    { $apply: 'cast_user' }
  ]
}
