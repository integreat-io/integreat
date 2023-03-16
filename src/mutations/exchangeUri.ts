export default {
  $direction: 'rev',
  $flip: true,
  $modify: '.',
  meta: {
    $modify: 'meta',
    options: {
      $modify: 'meta.options',
      uri: { $transform: 'generateUri', templatePath: 'meta.options.uri' },
    },
  },
}
