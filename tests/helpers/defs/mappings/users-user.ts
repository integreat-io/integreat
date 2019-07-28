export default {
  id: 'users-user',
  type: 'user',
  service: 'users',
  pipeline: [
    {
      $iterate: true,
      id: 'user',
      type: [
        { $transform: 'fixed', value: 'user', $direction: 'fwd' },
        { $transform: 'fixed', value: undefined, $direction: 'rev' }
      ],
      attributes: {
        username: 'user',
        firstname: 'forename',
        lastname: 'surname',
        yearOfBirth: 'birthyear',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        roles: 'roles[]',
        tokens: 'tokens[]'
      },
      relationships: {
        feeds: 'feeds[]'
      }
    },
    { $apply: 'cast_user' }
  ]
}
