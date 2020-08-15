export default {
  $direction: 'rev',
  $flip: true,
  options: {
    '.': 'options',
    uri: { $transform: 'template', templatePath: 'options.uri' },
  },
}
