# HTTP transport for Integreat

Adapter that lets
[Integreat](https://github.com/integreat-io/integreat) send and receive data
over http/https.

## Getting started

### Prerequisits

Requires node v10 and Integreat v0.8.

### Installing and using

Install from npm:

```
npm install integreat-transport-http
```

Example of use:

```javascript
const integreat = require('integreat')
const httpAdapter = require('integreat-transport-http')
const defs = require('./config')

const resources = integreat.mergeResources(integreat.resources(), {
  transporters: { http: httpAdapter() },
})
const great = integreat(defs, resources)

// ... and then dispatch actions as usual
```

Example source configuration:

```javascript
{
  id: 'store',
  transporter: 'http',
  endpoints: [
    { options: { uri: 'https://api.com/api' } }
  ]
}
```

Data will be sent with content-type `application/json`.

An optional logger may be provided to the `jsonAdapter()` function, to log out
the request sent to the service, and its response. The logger must be an object
with an `info()` and an `error()` function. Both should accept a string message
as first argument, and a meta object as the second.

### Running the tests

The tests can be run with `npm test`.

## Contributing

Please read
[CONTRIBUTING](https://github.com/integreat-io/integreat/blob/master/CONTRIBUTING.md)
for details on our code of conduct, and the process for submitting pull
requests.

## License

This project is licensed under the ISC License - see the
[LICENSE](https://github.com/integreat-io/integreat/blob/master/LICENSE)
file for details.
