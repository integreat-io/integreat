export default {
  $direction: 'rev',
  $flip: true,
  options: {
    uri: { $transform: 'template', templatePath: 'options.uri' },
    queryParams: 'options.queryParams',
  },
}
