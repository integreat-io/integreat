export default {
  id: 'users-user',
  type: 'user',
  service: 'users',
  pipeline: [
    {
      $iterate: true,
      id: 'user',
      username: 'user',
      firstname: 'forename',
      lastname: 'surname',
      yearOfBirth: 'birthyear',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      roles: 'roles[]',
      tokens: 'tokens[]',
      feeds: 'feeds[]'
    },
    { $apply: 'cast_user' }
  ]
}
