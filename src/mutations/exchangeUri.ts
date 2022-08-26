export default {
  $direction: 'rev',
  $flip: true,
  $modify: '.',
  meta: {
    $modify: 'meta',
    options: {
      $modify: 'meta.options',
      uri: { $transform: 'template', templatePath: 'meta.options.uri' },
    },
  },
}
