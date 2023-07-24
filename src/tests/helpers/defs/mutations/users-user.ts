export default {
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
  feeds: 'feeds[]',
}
