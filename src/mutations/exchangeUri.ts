export default {
  $direction: 'rev',
  $flip: true,
  meta: 'meta',
  'meta.options': {
    '.': 'meta.options',
    uri: { $transform: 'template', templatePath: 'meta.options.uri' },
  },
}
