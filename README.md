# ![Integreat](media/logo.png)

An integration layer for node.js.

[![npm Version](https://img.shields.io/npm/v/integreat.svg)](https://www.npmjs.com/package/integreat)
[![Maintainability](https://api.codeclimate.com/v1/badges/a5bd9841a47ff9f74577/maintainability)](https://codeclimate.com/github/integreat-io/integreat/maintainability)

The basic idea of Integreat is to make it easy to define how to send data to and
receive data from a set of [**services**](#services), and expose them through a
well defined interface, abstracting away the specifics of each service.

There are a few concepts that makes this possible:

- [**Transporters**](#transporters) and [**adapters**](#adapters) speak the
  language of different types of services and standards of data exchange, and
  does the basic translation to and from the structures used by Integreat. You
  deal with familiar JavasScript objects, arrays, and primitive data types,
  regardless of what the service expects.
- [**Mutation pipelines**](#mutations) let you define how the data coming from
  or going to a service should be transformed. This includes changing the overal
  structure, renaming properties, transforming and filtering values with
  transformer functions, etc. You may also provide your own transformer
  functions.
- [**Schemas**](#schemas) serve as a common normalization of data between
  services. You define your own schemas and mutate data to and from them,
  enabling inter-service sharing of data. If you have data in one schema, you
  may send it to any service where you have set up the right mutations for this
  schema, again abstracting away all service details.

All configuration is done through basic JSON-friendly structures, and you define
your services with different endpoints, mutation pipelines, authentication
schemes, etc.

Your configuration is spun up as an Integreat instance. To send and retrieve
data, you dispatch [**actions**](#actions) to your instance and get
[**response**](#action-response) objects back. You may define [jobs](#jobs) to
run simple actions or longer "flows" consisting of several actions with
conditions and logic. You may also configure [queues](#queues) to have actions
run in sequence or on a later time.

```
                   ____________________________________________________
                  |                                                   |
                  |                Integreat instance                 |
Action ----|      |                                                   |
           |-> Dispatch <-> Schema <-> Mutation <-> Adapter <-> Transporter <-> Service
Response <-|      |                                                   |
                  |___________________________________________________|
```

To deal with security and permissions, Integreat has a concept of an ident.
Other authentication schemes may be mapped to Integreat's ident scheme, to
provide data security from a service to another service or to the dispatched
action. A ground principle is that nothing that enters Integreat from an
authenticated service, will leave Integreat unauthenticated. What this means,
though, depends on how you define your services.

# Table of contents

1. [Usage](#usage)
   1. [Install](#install)
   2. [Basic example](#basic-example)
2. [Integreat concepts](#integreat-concepts)
   1. [Services](#services)
   2. [Transporters](#transporters)
   3. [Adapters](#adapters)
   4. [Authenticators](#authenticators)
   5. [Mutations](#mutations)
   6. [Schemas](#schemas)
   7. [Actions](#actions)
   8. [Jobs](#jobs)
   9. [Queues](#queues)
   10. [Middleware](#middleware)
3. [Debugging](#debugging)

# Usage

## Install

Requires node v18.

Install from npm:

```
npm install integreat
```

You will probably also need some [transporters](#transporters) and
[adapters](#adapters), and the basic transformers in
[`integreat-transformers`](https://github.com/integreat-io/integreat-transformers).

## Basic example

The following is the "hello world" example of Integreat. As most hello world
examples, this is a bit too trivial a use case to demonstrate the real
usefulness of Integreat, but it shows you the simplest setup possible.

Here, we fetch cat facts from the API endpoint
'https://cat-fact.herokuapp.com/facts', which returns data in JSON and requires
no authentication. The returned list of facts are mutated and cast to the `fact`
schema. We only fetch data _from_ the service, and no data is sent _to_ it.

```javascript
import Integreat from 'integreat'
import httpTransporter from 'integreat-transporter-http'
import jsonAdapter from 'integreat-adapter-json'

const schemas = [
  {
    id: 'fact', // The id of the schema
    shape: {
      // The fields of the type
      id: 'string', // An id field will always be included, but we define it here for readability
      text: 'string', // The text of the cat fact
      createdAt: 'date', // The created date (`createdAt` and `updatedAt` will always be dates)
    },
    access: { allow: 'all' }, // No access restrictions
  },
]

const services = [
  {
    id: 'catfact', // The id of the service
    transporter: 'http', // Use the http transporter
    adapters: ['json'], // Run the request and the response through the json adapter
    options: {
      transporter: {
        // Options for the transporter
        uri: 'https://cat-fact.herokuapp.com/facts', // Only the uri is needed here
      },
    },
    endpoints: [
      {
        match: { action: 'GET', type: 'fact' }, // Match to a GET action for type 'fact'
        mutation: {
          $direction: 'from', // We're mutating data _from_ the service
          // Here we're mutating `response.data` and "setting it back" where we found it ...
          'response.data': [
            'response.data[]',
            {
              $iterate: true, // Mutate each item in an array
              id: '_id', // The id is called `_id` the data from the service
              text: 'text', // text is called `text`
              createdAt: 'createdAt', // Creation date is called `createdAt`
            },
          ],
        },
      },
    ],
  },
]

// Create the Integreat instance from our definitions and provide the
// transporters and adapters we require.
const great = Integreat.create(
  { schemas, services },
  { transporters: { http: httpTransporter }, adapters: { json: jsonAdapter } }
)

// Prepare an action to fetch all cat facts from the service `catfact`
const action = { type: 'GET', payload: { type: 'fact', service: 'catfact' } }

// Dispatch the action and get the response
const response = await great.dispatch(action)
```

The `response` object will look like this:

```javascript
{
   status: 'ok',
   data: [
    {
      id: '58e008780aac31001185ed05',
      $type: 'fact',
      text: 'Owning a cat can reduce the risk of stroke and heart attack by a third.',
      createdAt: new Date('2018-03-29T20:20:03.844Z')
    },
    // ...
  ]
}
```

# Integreat concepts

As mentioned in the introduction, the building blocks of Integreat are services,
transporters and adapters, mutation pipelines, and schemas.

## Services

A service is the API, database, FTP server, queue, etc. that you want to get
data from and/or set data to. We pass on a set of service definitions to
Integreat, specifying what transporter, adapters, authentication schemas it
requires, in adition to defining the different endpoints available on the
service, how they should be called, and how data should be mutated in each case.

We'll get back to the details of all of this in turn, but first we want to
highlight how central the concept of a service is to Integreat. Basically, in
Integreat "everything is a service". A simple REST/JSON API is a service, a
database is a service, and everything external you want to communicate with are
services. Want to set up a queue to handle actions one by one? That's a service.
Want to cache data in a memory store? That's a service. Want to schedule actions
to run on intervals? That's a service to. By simply defining services and their
specifics, you may set up a variety of different types of configurations with
the same few building blocks. This is very powerful as soon as you get into the
right mindset.

Services are configured by service definitions, and tells Integreat how to
fetch data from a service, how to mutate this data to schemas, and how to send
data back to the service.

The service definition object includes the transporter id, adapter ids, any
authentication method, the endpoints for fetching from and sending to the
service, mutations that data to all endpoints will pass through, and options
for transporters, adapters, etc.

```javascript
{
  id: <service id>,
  transporter: <transporter id>,
  adapters: [<adapter id>, <adapter id>, ...],
  auth: <auth config>,
  meta: <type id>,
  options: {...},
  mutation: <mutation pipeline>,
  endpoints: [
    <endpoint definition>,
    ...
  ]
}
```

Service definitions are passed to Integreat on creation through the
`Integreat.create()` function. There is no way to change service defintions
after creation.

See [mutations](#mutations) for a description of how to define the mutation
pipeline for a service.

The `auth` property should normally be set to the id of an
[auth definition](#service-authentication), if the service requires
authentication. In cases where the service is authenticated by other means, e.g.
by including username and password in the uri, set the `auth` property to `true`
to signal that this is an authenticated service. For services accepting incoming
actions, `auth` should be set to an object with
`{ outgoing: <auth id | true>, incoming: <auth id | true>}`. To accept several
incoming actions, provide an array of `<auth id | true>`, and they will be run
from first to last until one of them returns an ident or an error other than
`noaccess`.

**Note:** When connecting to a service for listening, the `outgoing` auth is
used. `incoming` is only used for validating the actions being dispatched "back"
from the service.

In `options`, you may provide options for transporters and adapters. It is
merged with the `options` object on the endpoint. See
[the `options` object](#options-object) for more on this.

### Endpoints

A service will have at least one endpoint, but often there will be several.
Endpoints are the definitions of the different ways Integreat may interact with
a service. You decide how you want to set up the endpoints and what is the right
"endpoint design" for a service, but there might be one endpoint for each
operation that can be done with a type of data.

For example, let's say you have a simple REST API with blog articles and
authors. There will most likely be an endpoint to fetch all (or some) articles,
one endpoint for fetching one article by id, one endpoint for creating an
article, one for updating an article, and so on. And you'll have similar
endpoints for authors, one endpoint for fetching all, one for fetching one by
id, one endpoint for creating an author, etc. As this is REST, each endpoint
will address a different combination of urls and http verbs (through the
transporter).

As another example, you may be accessing a database of articles and authors
directly. The configuration details will be very different than for a REST API,
but you'll probably have the same endpoints, fetching all articles, fetching
one, creating, updating, and the same all over for users. Instead of urls and
http verbs, as for REST, these endpoints will address different databases and
different database operations (through the transporter).

> Note: This is not to say that Integreat requires you to set up endpoints
> exactly as described in these examples, it might be that you would like to set
> up an endpoint that handles many of these cases. The intention here is just to
> give you an understanding of what an endpoint is in Integreat.

When you dispatch an action, Integreat will figure out what service and what
endpoint to send the action to. The target service is often specified in the
action payload with the `targetService` (or shorthand `service`) property, but
if not, the default service of the schema specified with the payload `type`
property, will be used.

The matching to an endpoint is done by finding the endpoint whose `match` object
matches the action with most accuracy. The rules of the endpoint matching is
describe in more details [below](#match-properties).

Here's the format of an endpoint definition:

```javascript
{
  id: <endpoint id>,
  match: {
    type: <schema id>,
    scope: <'collection'|'member'|'members'|'all'>,
    action: <action type>,
    params: {...},
    incoming: <boolean>,
    conditions: [...]
  },
  validate: [
    {
      condition: <mutation pipeline>,
      failResponse: <response object>
    }
  ],
  mutate: <mutation pipeline>,
  allowRawRequest: <boolean>,
  allowRawResponse: <boolean>
  options: {...},
}
```

All of these properties are optional. An empty endpoint defintion object will
match anything, pass on the action to the transporter untouched, and relay any
response coming back. This might be what you need, but often you'll want to
specify a few things:

- `id`: The endpoint may have an id, which you may use to specify that you want
  an action to go to this particular id. However, most of the time you'll set
  up the `match` object so that Integreat will decide what endpoint to use for
  the action you dispatch.
- `match`: The match object is used to decide the right endpoint for an action.
  More one this in the [Match properties](#match-properties) section.
- `validate`: This is an array of condition that have to be met in order for
  Integreat to proceed with the endpoint. The `condition` is a mutation pipeline
  that should return a truthy value for the validation to pass. Any falsy value
  will cause the validation to fail. If `validate` is missing or an empty array,
  no validation will be done. This may sound similar to `match`, but `validate`
  is only processed after a match is found, and if the validation fails, no
  other endpoint is considered. On a failing validation, the `failResponse` is
  returned as the response from this action, or a `badrequest` response if no
  `failResponse` is provided. There's also a shorthand, where you set
  `failResponse` to a string, which will be the `error` message of the
  `badrequest` response. The response is passed through the mutation pipeline.
- `mutate`: A mutation pipeline for the endpoint. The pipeline is run for both
  actions going to a service and the response coming back, so keep this in mind
  when you set up this pipeline. See [Mutation pipelines](#mutations)
  for more on how to define the mutation. `mutation` is an alias for `mutate`.
- `allowRawRequest`: When set to `true`, payload `data` sent to this endpoint
  will not by cast automatically nor will an error be returned if the data is
  not typed.
- `allowRawResponse`: When set to `true`, response `data` coming from this
  endpoint will not by cast automatically nor will an error be returned if the
  data is not typed.
- `options`: This object is merged with the `options` object on the service
  definition, and provide options for transporters and adapters. See
  [the `options` object](#options-object) for more on this.

#### Match properties

An endpoint may specify none or more of the following match properties:

- `type`: When set, the endpoint will only be used for actions with the
  specified schema type (the schema's id). `type` may also be an array of types,
  matching any one of the schemas in the list.
- `scope`: May be `member`, `members`, `collection`, or `all`, to specify that
  the endpoint should be used to request one item (member) by id, several items
  by ids (members), or an entire collection of items. Setting this to `member`
  or `members` will only match actions with a payload `id` property, and the
  `id` should be an array of ids for `members`. Not setting this property, or
  setting it to `all`, signals an endpoint that will work for all scopes.
- `action`: May be set to the type string of an action. The endpoint will match
  only actions of this type. When this is not specified, any action type will
  match. `action` may also be a list of action types, matching any of these.
- `params`: This object should list all params that this endpoint supports. A
  param in this context is any property on the action payload except `type`,
  `id`, or `data`. Use the param name as key on this object and set the value to
  `true` if it is required, and `false` if it is optional. When matching
  endpoints, an action will only match if it has all the required params, and in
  case several match, the endpoint with more specified params will be preferred.
- `incoming`: If this is `true`, it will only match incoming actions, if `false`
  only outgoing, and if not set, it will match both.
- `conditions`: An array of mutation pipelines that will be run on the action to
  see if it's a fit for this endpoint. If all pipelines return a truthy value,
  the endpoint is chosen (given that the other match properties also match). We
  rely on JavaScript definition of 'truthy' here, so any value that is not
  `false`, `null`, `undefined`, `0`, `NaN`, or `''` will be considered truthy.

> There used to be a `filters` property on the endpoint match object. It is
> still supported, but it's deprecated and will be removed in v1.1. Please use
> `conditions` instead.

> Editor's note: Describe what incoming actions are, and give more details on
> filters.

There might be cases where several endpoints match an action, and in these cases
the endpoint with the highest level of specificity will be used. E.g., for a
`GET` action asking for resources of type `entry`, an endpoint with both
`action: 'GET'` and `type: 'entry'` is picked over an endpoint matching all
`GET` actions regardless of type. For `params` and `filters` this is decided by
the highest number of properties on these objects.

The order of the endpoints in the `endpoints` list matters only when two
endpoints are equally specified with the same match properties specified. Then
the first one is used.

When no match properties are set, the endpoint will match any actions, as long
as no other endpoints match.

Finally, if an action specifies the endpoint id with the `endpoint`
[payload property](#payload-properties), this overrides all else, and the
endpoint with the id is used regardless of how the match object would apply.

Example service definition with endpoint match object:

```javascript
{
  id: 'entries',
  transporter: 'http',
  endpoints: [
    {
      match: {
        type: 'entry',
        action: 'GET',
        scope: 'collection',
        params: {
          author: true,
          archive: false
        }
      },
      options: {
        transporter: {
          uri: 'https://example.api.com/1.0/{author}/{type}_log?archive={archive}'
        }
      }
    }
  ],
  // ...
}
```

### Options object

A service defintion may have `options` object in two places: Direction on the
service definition and on any of the endpoints. When an action is sent to an
endpoint, the combination of the two `options` are used. Also, there may be
different options for the transporter and for the adapters.

Example of an `options` object set on the service definition:

```javascript
{
  id: 'entries',
  options: {
    uri: 'https://ourapi.com/v1',
    transporter: {
      method: 'POST',
      incoming: { port: 3000 }
    },
    adapters: {
      xml: { namespaces: { ... } },
      // ...
    }
  }
}
```

Any properties set directly on the `options` object or on a `transporter`
property, are treated as options for the transporter. If there are properties on
both the `options` and a `transporter` object, they will be merged, with the
`transporter` object having priority if conflicts. This is a shallow merge, so
objects used in the options will not be merged.

In the example above, the options passed to the transporter will include `uri`,
`method`, and `incoming`.

The `incoming` object on the transporter options is a bit special, as it holds
separate options for transporters that support incoming requests trough the
`listen()` method. If there are `incoming` objects on both the `options` and
`transporter` objects, they will be merged, again with priority to the one on
the `transporter` object.

Note that we recommend setting transporter options on the `transporter` object
for clarity, but both will work.

Adapter options may be given in an `adapters` object, where each adapter may
have its own options, set with the id of the adapter as a key. In the example
above, the `xml` adapter will be given the `namespaces` object. A requirement
for this, is that the adapter actually have an id. Adapters provided directly on
service definition may not have an id, but all adapters that are referenced by
an id, will also be given options set on that id, which is the common behavior.

Finally, when all this sorting have been done on options from both the service
definition and an endpoint, the two options structures are merged before being
used. Here, the endpoint options take priority, so that you may set a general
option on the service, and override it on the endpoint.

Example of endpoint options overriding service options:

```javascript
{
  id: 'entries',
  options: {
    transporter: {
      uri: 'https://ourapi.com/v1',
      method: 'GET',
    }
  },
  endpoints: [
    {
      match: { ... }
    },
    {
      match: { ... },
      options: {
        transporter: {
          method: 'POST'
        }
      }
    }
  ]
}
```

Here, the first enpoint will be given `method: 'GET'`, while the next will get
`method: 'POST'`.

Before actions are passed through mutations and finally passed to the
transporter, the merged transporter options is set on an `options` property in
the `meta` object of the action. This way, you may also mutate these options
before they reach the transporter.

### Service authentication

This definition format is used to authenticate with a service:

```javascript
{
  id: <id>,
  authenticator: <authenticator id>,
  options: {
    // ...
  },
  overrideAuthAsMethod: <auth-as method>,
}
```

- `id`: The id used to reference this authentication, especially from the
  [service definition](#services).
- `authenticator`: The id of an [authenticator](#authenticators) used to
  authenticate requests. Integreat comes with a few basic ones built in, and
  there are others available.
- `options`: An object of values meaningful to the authenticator. See the
  documentation of each authenticator to learn how it should be configured.
- `overrideAuthAsMethod`: Transporters specify a default method for getting an
  auth object that makes sense for authenticating with the service. For
  instance, the HTTP transporter has `asHttpHeaders` as the default, to get the
  relevant auth headers to send with the request. With `overrideAuthAsMethod`,
  you may override this in the service auth definition when relevant. Default
  value is `undefined`, meaning "no override". Note that we say "method" here,
  but the value is a string with the name of the auth-as method to use.

The authenticator is responsible for doing all the heavy-lifting, based on the
options provided in the service authentication definition.

### Configuring service metadata

Integreat supports getting and setting metadata for a service. The most common
use of this is to keep track of when data of a certain type was last synced.

Some services may have support for storing their own metadata, but usually you
set up a dedicated service for storing other services' metadata. A few different
pieces goes into setting up a meta store:

- A meta schema with the fields available as metadata
- A service for storing metadata, with an endpoint suporting the metadata schema
- Possible a metadata mutation for the metadata service

When all of this is set up, you activate the metadata on the service the
metadata will be stored for, by setting the `meta` property to the id of the
schema defining the metadata fields. The `service` set on the schema will tell
Integreat what service to get and set the metadata from/to.

The schema will look something like this:

```javascript
{
  id: 'meta', // You may give it any id you'd like and reference it on the `meta` prop on the service
  service: <id of service handling the metadata>,
  shape: {
    <metadataKey>: <type string>,
    // ...
  }
}
```

To get or set metadata, use [`GET_META`](#get_meta) and [`SET_META`](#set_meta)
with the service you are getting metadata from as the `service`. Integreat will
figure out the rest.

## Transporters

A transporter handles all the details of sending and receiving data to and from
a service. When dispatching an action to a service, the action will be handled
in a relevant manner for the type of service the transporter supports, e.g.
sending an http requrest for the HTTP transporter, or doing a query to a
database for the MongoDb transporter. Some transporters may also support
listening to a service, e.g. the HTTP transporter listing for incoming requests
or the MQTT transporter subscribing to events on a topic.

Integreat has transporters for some common cases, and more may come:

- [Bull](https://github.com/integreat-io/integreat-transporter-bull)
- [FTP](https://github.com/integreat-io/integreat-transporter-ftp)
- [HTTP](https://github.com/integreat-io/integreat-transporter-http)
- [MongoDb](https://github.com/integreat-io/integreat-transporter-mongodb)
- [MQTT](https://github.com/integreat-io/integreat-transporter-mqtt)
- [Redis](https://github.com/integreat-io/integreat-transporter-redis)

You may write your own transporters if your case is not covered by any of these.
Documentation on developing transporters are coming.

Integreat will handle the transporters based on you configurations, but there
are some specifics to each transporter, like HTTP needing an `uri` option or
MongoDb needing a `collection` option. See the documentation of each transporter
for more.

## Adapters

Adapters are working together with transporters to prepare the incoming and
outgoing data in accordance with the type of services they support.

As an example, the HTTP transporter will return data from a response as a
string, since there is no common way to treat the response body. So for a JSON
API, you will configure the JSON adapter to make sure the data from the
mutations are sent as a JSON string, and that the JSON comming back from the
service is parsed before mutation starts. For a service using XML, you would
instead set up the XML adapter, and perhaps also the SOAP adapter, to again
stringify and parse the data going back and forth.

The MongoDb transporter, on the other hand, does not require any adapters, as
documents from the database will always come as arrays and object, and may be
fed directly into the mutation pipelines.

Integreat currently have the following adapters:

- [CSV](https://github.com/integreat-io/integreat-adapter-csv)
- [JSON](https://github.com/integreat-io/integreat-adapter-json)
- [SOAP](https://github.com/integreat-io/integreat-adapter-soap)
- [Url encoded form data](https://github.com/integreat-io/integreat-adapter-form)
- [URI templates](https://github.com/integreat-io/integreat-adapter-uri)
- [XML](https://github.com/integreat-io/integreat-adapter-xml)

You may write your own adapters as well, and documentation on this is coming.

## Authenticators

At its simplest, an authenticator will provide necessary credientials to an
outgoing action, or an ident to an incoming action. Some authenticators do this
based only on the options provided, while others will do a more complex dance
with the service or a third-party service, like with OAuth2.

When [setting up a service](#services), you may provide it with an auth id that
refers to a [service authentication definition](#service-authentication), that
again refers to an authenticator by id. The service auth definition also holds
options for the authenticator, so when assigning an auth id to a service, you're
assigning it an authenticator with those specific options. Another service may
use the same authenticator, but with different options, and you would set this
up with a different service authentication definition.

Authentication for outgoing actions are done when sending the action. When
authenticated, an auth object is retrieved with the auth-as method specified on
the transporter (e.g. `asHttpHeaders` for the http transporter), or on the
`overrideAuthAsMethod` in [auth options](#service-authentication) if set. The
auth object is passed to the transporter on the action `meta.auth` prop. It is
applied just before sending it, though, so it will be available to service
middleware, but not to the mutation pipeline. This is done to expose credentials
in as few places as possible. If you however _want_ to have the auth object in
mutations, set `authInData` to `true` on the service or endpoint options, and
authentication will be done in the `preflightAction` step instead, making it
available on `meta.auth` throughout the entire mutation pipeline.

For incoming actions, authentication is done when a listening action calls the
`authenticate()` callback. The `validate()` method on the authenticator is used
here, which will provide the transporter with an authorized ident.

Available authenticators:

- `http`: Supports http native authentications, like `Basic` and `Bearer`. It's
  included with the
  [HTTP transporter](https://github.com/integreat-io/integreat-transporter-http).
- `ident`: Will always grant access and `validate()` will return an ident with
  the id provided in `identId` on the `options` object, or `'anonymous'` if no
  `identId` is provided. This is built into Integreat.
- `options`: Will pass on the options as authentication, so whatever you provide
  here is the authentication. What options to provide, then, is depending on
  what the relevant transporter requires. For outgoing actions, the options are
  provided as is. Incoming action are validated agains the values given in the
  options (the keys may be dot notation paths in this case, and `identId` is
  excluded). An ident with the `identId` from the options as `id`, is returned
  if the action matches. This is built into Integreat.
- `token`: A simple way of authenticating with a given token. For HTTP requests,
  the token will be provided as a `Authorization` header, and a configurable
  prefix like `Basic` or `Bearer`. This is built into Integreat.
- [`jwt`](https://github.com/integreat-io/integreat-authenticator-jwt): Will
  generate and encode a JavaScript Web Token (JWT) based on the options.
- [`oauth2`](https://github.com/integreat-io/integreat-authenticator-oauth2):
  Will run the balett of calling different OAuth2 endpoints and receive a token
  based on the provided options.

## Mutations

Both on the service and on endpoints, you define mutation pipelines. The service
mutation is run before the endpoint mutation for data coming from a service, and
in the oposite order when going to a service.

A nice - but sometimes complicated - thing about mutations, is that they are run
in both directions. They are by default defined for mutating data coming _from_
a service, and will be run in reverse for data going _to_ a service. In some
cases this reversing of the pipeline will work as expected without modifications
-- you define the mutation pipeline for data coming _from_ the service, and the
reversed pipeline works _to_ as well. But many times you need to make
adjustments and sometimes you'll have to have separate steps based on the
direction. We'll get into more details in the following.

A mutation pipeline consists of one or more steps that the data will go through,
before coming out on the other in the desired shape. It helps picturing this as
an actual pipeline. After each step, data will be in a different shape, and this
is the input to the next step.

You define a pipeline in Integreat with an array, although for a pipeline with
only one step, you may skip the array for simplicity.

Each step may be one of the following:

- [**A dot notation path**](#dot-notation-paths), e.g. `path.to.data`. The data
  at that path will be extracted, and will be provided as the data to the next
  step in the pipeline. When going in reverse, the data will be set on that path
  instead.
- **A mutation object** is an object that basically describes the object you
  want as a result, where the keys are dot notation paths and the values are
  mutation pipelines. Each pipeline on the mutation object will be run on the
  data, and then set on the path, resulting in an object that will be passed on
  to the next step. Setting `$iterate: true` on the object will cause it to
  iterate over items in an array, otherwise it will be applied to the array.
  Setting `$modify: true` will cause any properties on an object in the pipeline
  not set in the mutation, to be included, much like the spread in JavaScript.
  Setting `$modify` to a path works the same, but you will spread from the
  object at the path (`$modify: true` is equal to `$modify: '.'`).
- **A transform object** letting you run a transformer function on the data,
  e.g. `{ $transform: 'number' }` to transform the value into a number, or
  `undefined` if not possible.
- **A filter object** that will run a transformer function on the data and
  filter away any items not resulting in a truthy value. As an example,
  `{ $filter: 'boolean' }` will filter away anything that is not convertable to
  `true` in JS rules. When applied to an array, you'll get an array where items
  are filtered away. For an object or a plain value, filtering away will means
  `undefined` is passed on to the next step in the pipeline.
- **An if object** that runs a `then` pipeline if the provided pipeline returns
  truthy, and the `else` pipeline if it returns falsy.
- **A cast object**, e.g. `{ $cast: 'author' }` that casts the data into a
  schema, removing all properties that is not part of the shape of the schema,
  and transforming all values to the expected types or `undefined` if not
  possible. (Not available until v1.0)

### Dot notation paths

At its most basic, a dot notation path is just a property key, like `content`.
You may dive into a data structure by adding a key from the next level,
separated by a dot, like `content.articles`. With an object like this:

```javascript
{
  content: {
    articles: [{ id: '1' }, { id: '2' }],
    authors: [{ id: 'john' }]
  }
}
```

... the path `content.articles` will give you the array
`[{ id: '1' }, { id: '2' }]`.

You may add brackets to the path to traverse into arrays, e.g.
`content.articles[0]` will give you the object `{ id: '1' }`, and
`content.articles[0].id` will give you `'1'`.

Empty brackets, like `content.articles[]` will ensure that you get an array
back. If the data at the path is an array, this will return the same as
`content.articles`, but if the path returns an object or a plain value, it will
be returned in an array.

When mapping data _to_ a service, the paths are used to reconstruct the data
format the service expects. Only properties included in the paths will be
created.

Arrays are reconstructed with any object or value at the first index, unless a
single, non-negative index is specified in the path.

You may use a carret `^` to go one level up -- to the parent -- in the data
(after going down), so after `content.articles`, the path `^.authors` will
return `[{ id: 'john' }]`. Arrays count as one level, so after
`content.articles[0]` you will need to go up twice like so: `^.^.authors`.

A double carret `^^` takes you to the top -- the root -- so after
`content.articles[0].id`, `^^.content.authors` returns `[{ id: 'john' }]`.

Carret notations -- parents and roots -- does not currently work in reverse, but
they might in a future version.

## Schemas

A central idea to Integreat, is that any integration has two sides; the getting
of data from one service and the sending of data to another. Instead of setting
up an integration directly from A to B, you have a schema in middle, and
configure how data from A will be mutated to a schema, and then have data in
that schema will be mutated and sent to B.

This is a useful abstraction, and if you ever need to change one side, you can
do so without involving the other side. If you need to switch out service B with
service C, you can do so without involving the configuration of service A, or
you can send data to both B and C, using the same setup for service A.

To be clear, you can setup flows without schemas in Integreat, but at the loss
of this flexibility and maintainability.

A schema describe the data you expected to get out of Integreat, or send through
it. You basically define the fields and their types, and may then cast data to
that shape. Note that data on an action for a specified type, will be
automatically cast to that type.

```javascript
{
  id: <schema id>,
  plural: <the id in plural>,
  service: <the default service for this schema>,
  shape: {
    <fieldId>: <field type>,
    <fieldId>: {
      $type: <field type>,
      default: <default value>
      const: <value that will override any other value>
    },
  },
  access: <access def>
}
```

- `id`: The id of the schema, used to reference it in actions (the payload
  `type`), when casting to the schema with `{ $type: '<schema id>' }`, and to
  signal what schema a data object is cast to (the `$type` prop on typed data
  items). The convention is to use singular mode for the `id`, e.g. if your
  defining a schema for articles, you would give it the id `'article'`.
- `plural`: When the plural of `id` is not simply a matter of adding an `'s'`,
  you may specify the plural mode here. E.g. `id: 'entry'` would have
  `plural: 'entries'`. This is not used by Integreat right now, but it may be
  used in the future for error messages, generating APIs from schemas, etc.
- `service`: You may specify a default service for the schema when it makes
  sense. This allows you to dispatch an action for a type without specifying the
  target service, e.g. `{ type: 'GET', payload: { type: 'article' } }`, and have
  Integreat use the default service. This is a way of hiding configuration
  details from the code dispatching the actions, and you may also change the
  default service without changing the dispatching code if need be. You may
  always override this by specifying a `service` on the action payload.
- `shape`: This is where you define all the fields, see
  [the section below](#the-shape-of-a-schema).
- `generateId`: Set this to `true` to generate a unique id for the `id` field
  when the data being cast does not provide an `id`. Default is `false`, which
  will just set `id: null`. The id will be 36 chars and consist of A-Z, a-z,
  0-9, underscore `'_'`, and hyphen `'-'`.
- `access`: Integreat lets you define authorization schemes per schema. All use
  of data cast to a schema will then be controlled by the rules you set here.
  See [Access rules](#access-rules) below for details on these rules. Note that
  `access` is optional, but when you get data from a service where any form of
  authentication is used to access the data, you will not be able to do anything
  with the data unless you cast it to a schema with `access` set up (or
  specifically says that you allow raw data from that endpoint).

### The shape of a schema

The shape is defined by an object where each key is the id of a field, which may
contain only alphanumeric characters, and may not start with a digit. A schema
cannot have the same id as a primitive type (see list below).

The values on this object define the types of the fields and a few other
optional features:

```javascript
{
  $type: <field type>,
  default: <default value>
  const: <value that will override any other value>
}
```

The `$type` prop sets the type of the field. The available primitive types, are
`string`, `integer`, `float` (or `number`), `boolean`, and `date`. A field may
also have another schema as its type, in which case the id of the schema is set
in `$type`. An example can be an
`article` schema with an `author` field of type `user`, referring to a schema
with id `user`. When casting the `article`, data on the `author` prop will be
cast with the `user` schema.

The `default` value will be used when the field is `undefined`, `null`, or not
preset in data object being cast to this schema. If `default` is set to a
function, the function will be run with no argument, and the returned value is
used as the default value. When no `default` is given, `undefined` is used.

The `const` value override any value you provide to the field. It may be useful
if you want a field to always have a fixed value. Just as for `default`, you may
set it to a function, in which case the function will be run without arguments
and the returned value will be used.

If both `const` and `default` are set, `const` will be used.

When only setting the field type, you don't need to provide the entire object,
you can just provide the type string.

Example schema:

```javascript
{
  id: 'article',
  shape: {
    id: 'string', // Not needed, as it is always provided, but it's good to include for clarity
    title: { $type: 'string', default: 'Unnamed article' },
    text: 'string',
    readCount: 'integer',
    archived: { $type: 'boolean', default: false },
    rating: 'float',
    createdAt: 'date',
    updatedAt: 'date'
  },
  access: 'all'
}
```

Note that if you provide the `id` field, it should be set to type `'string'` or
Integreat will throw. The same happens if you set `createdAt` or `updatedAt` to
anything else than the type `'date'`. If you don't include these fields,
Integreat will include the `id` for you, but not `createdAt` or `updatedAt`.

### Typed data

When data is cast to a schema, the data will be in the following format:

```
{
  id: <string>,
  $type: <schema>,
  createdAt: <date>,
  updatedAt: <date>,
  <key>: <value>,
  <key>: { id: <string>, $ref: <schema> },
  <key: [{ id: <string>, $type: <schema>, ... }],
  ...
}
```

- `id`: The id is mandatory and created by Integreat when it is not included in
  the schema. If you don't map anything to the id prop, it will be set to
  `null`, unless the schema is set up with `generateId: true`, in which case a
  universally unique id will be generated for you.
- `$type`: Set to the id of the schema by Integreat. This is a signal that the
  data has been cast.
- `createdAt`: This is not mandatory, but has special meaning. When a schema has
  a `createdAt` field, but the date is not set in the data, it will be set to
  the same as `updatedAt` (if provided) or to the current date/time.
- `updatedAt`: Just as `createdAt`, this is not mandatory. When a schema has
  an `updatedAt` field, and the date is not set in the data, it will be set to
  the same as `createdAt` (if provided) or the current date/time.
- `<key>`: Then follows the values of all the fields specified in the schema.
  Any value not provided in the data will be set to their default value or
  `undefined`. Fields with other schemas as their type, will be an object. If
  only the id is provided in the data, the `{ id: <string>, $ref: <schema id> }`
  format will be used, with `$ref` being the id of the field type schema. When
  more data is provided, Integreat will cast it to the target schema and provide
  the entire data object, or array of objects, with the relevant `$type`.

### Access rules

Set the `access` property on a schema to enforce permission checking. This
applies to any service that provides data in this schema.

The simplest access rule is `auth`, which means that anyone can do anything with
the data of this schema, as long as they are authenticated. Being authenticated,
in this context, means that the dispatched action has an `ident` in the `meta`
object. See [the section on idents](#idents) for more on this.

Example of a schema with an access rule:

```javascript
{
  id: 'article',
  shape: {
    // ...
  },
  access: 'auth'
}
```

To signal that the schema really has no need for authorization, use `all`.
This is not the same as not setting the `auth` prop, as `all` will override
Integreat's principle of not letting authorized data out of Integreat without
an access rule. `all` allows anybody to access the data, even the
unauthenticated.

On the other end of the spectrum, `none` will allow no one to access data cast
to this schema, no matter who they are.

For more fine-grained rules, set `access` to an access definition object with
rules telling Integreat which rights to require when performing different
actions with a given schema. These rules apply to the [idents](#idents) set on
the action `meta` object.

The following access rule props are available:

- `allow`: Set to `all`, `auth`, or `none`, to give access to everybody, only
  the authenticated, or no one at all. This is what we describe in short form
  above, where we provided this string instead of a access rule object.
- `role`: Authorize only idents with this `role`. May also be an array.
- `ident`: Authorize only idents with this precise `id`. May also be an array.
- `roleFromField`: Same as `role`, except the role is gotten from a field in the
  schema. When authorizing data cast to this schema, the value of the role field
  needs to be identical to (one of) the role(s) of the ident.
- `identFromField` - The same as `roleFromField`, but for an ident id.

In addition, you may override the general access rules of a schema with specific
rules for a type of action, by setting an `action` object with access rules for
action types. Here's an example of an access definition for allowing all
authorized idents to `GET` data in a certain shema, requiring the role `admin`
for `SET`s, and disallowing all other actions with the general rule
`allow: 'none'`:

```javascript
{
  id: 'article',
  shape: {
    // ...
  },
  access: {
    allow: 'none',
    actions: {
      GET: { allow: 'auth' },
      SET: { role: 'admin' }
    }
  }
}
```

Note that these action specific rules only applies to actions being sent to a
service. Some actions will never reach a service, but will instead trigger other
actions, and access will be granted or rejected only for the actions that are
about to be sent to a service. E.g. when you dispatch a `SYNC` action, it starts
off by dispatching one or more `GET` actions. The `SYNC` action is not subjected
to any access rules, but the `GET` actions are, and so the `SYNC` will fail if
one of the `GET` is rejected.

Another example, intended for authorizing only the ident matching a user:

```javascript
{
  id: 'user',
  shape: {
    // ...
  },
  access: { identFromField: 'id' }
}
```

Here, only actions where the ident id is the same as the id of the user data,
will be allowed. This means that authenticated users (idents) may only
only access their own user data.

## Actions

Actions are serializable objects that are dispatched to Integreat. It is a
important that they are serializable, as this allows them to, for instance, be
put in a database persisted queue and be picked up of another Intergreat
instance in another process. Note that `Date` objects are considered
serializable, as they are converted to ISO date strings when needed.

An action looks like this:

```javascript
{
  type: <action type>,
  payload: <payload object>,
  meta: <meta object>
}
```

- `type`: This is the id of one [of the action handlers](#available-action-handlers)
  that comes with Integreat, e.g. `GET`. When you dispatch an action, it is
  handed off to this handler (after some inital preperation). You may write
  your own action handlers as well.
- `payload`: Holds parameters and [data](#typed-data) for this action. There are
  some reserved [payload properties](#payload-properties), and the rest will be
  made available to you in the mutation pipeline.
- `meta`: Holds information about the action that does not belong in the
  payload, like the ident of the user dispatching, action id, etc. There are
  some reserved [meta properties](#meta-properties), but you may add your own
  here too.

When an action is dispatched, it returns a [response object](#action-response)
with status, data, error message, etc.

Note that in a mutation pipeline, action handler, or middleware, the
response object is provided as a fourth property on the action. You will most
likely meet this at least when setting up mutations.

### Payload properties

The payload is, together with the action `type`, a description to Integreat and
the service of what to do. A design principle of Integreat has been to have as
little specifics in these payload, so actions may be discpatched to service
without knowing how the service works. This is not always possible, at least not
yet, but it's a good principle to follow, also when you configure services and
plan what props need to be sent in the action payload.

You may set any properties on the payload, and they will be be available to you
in the service endpoint match and in the service mutations. Some properties have
special meanings, though, and you should avoid using them for anything else:

- `type`: The type of the data the action sends and/or receives. This refers to
  the `id` of a schema, and you will usually want to set this. Data provided
  in the payload `data` and response `data` will be cast to this schema. If
  you're dealing with several types in one action, you may set an array of
  types, but will have to cast the data in the mutation yourself. Integreat will
  validate that the data you send and receive is indeed of that type, and will
  give you an auth error if not. (See
  [`allowRawRequest` and `allowRawResponse` on endpoints](#endpoints) for an
  exception.)
- `id`: You provide an id when you want to address a specific data item, usually
  when you want to fetch one data item with an action like
  `{ type: 'GET', payload: { type: 'article', id: '12345' } }`. You may also
  supply an array of ids to fetch several data items by id. When setting data,
  the id will instead be specified in the `data` when appropriate.
- `data`: The data to send to a service. This may be any data that makes sense
  to the service, but will usually be a [typed data object](#typed-data) or an
  array of typed data objects, where the adjustments for the service happens in
  service mutations.
- `service`: The `id` of the service to send this action to. If not specified,
  Integreat will try and find the right service from the `type`.
- `targetService`: An alias of `service`.
- `sourceService`: When data comes from a different service and has not been
  mutated and cast yet, the `sourceService` property will tell Integreat to run
  the data through the source service configuration before passing the action on
  to an action handler. An example may be data coming in through an API, where
  the API is configured as a service in Integreat. Note that this property is
  usually set by transporters in their `listen()` methods, but you may also set
  it directly on the action when it makes sense.
- `endpoint`: Set this to the `id` of a service endpoint when you want to
  override the endpoint match rules of Integreat. This should only be used when
  it is really necessary. Normally, you should instead design the match
  properties to match the correct actions.

For services that support pagination, i.e. fetching data in several rounds, one
page at a time, the following properties may be supported:

- `pageSize`: The number of data items to fetch in one request to the service.
  By specifying a page size, you signal that you would like to use pagination,
  and without it all other pagination properties will be disregarded. You will
  get the number of data items you specify (or less, if there are not that many
  items), and may then go on to dispatch an action for the next page. See
  [pagination](#pagination) for more
- `pageOffset`: The number of data items to "skip" before returning the number
  of items specified in `pageSize`. If you ask for 500 items, the first action
  should have `pageOffset: 0` (or not specified), the next action
  `pageOffset: 500`, then `pageOffset: 1000`, and so on.
- `page`: The index of the page to fetch. Unlike most other indexes, this starts
  with `1` being the first page. The effect is the same as `pageOffset`, it's
  just a different way of specifying it. `page: 1` is the same as
  `pageOffset: 0`, and `page: 2` is the same as `pageOffset: 500`, given a
  `pageSize: 500`. Integreat will actually calculate both before sending it to
  the transporter, as different types of services support different types of
  pagination.
- `pageAfter`: As an alternative to specifying the number of items to skip, you
  may ask for the items after the item with the id you provide as `pageAfter`.
  If the last item of the first page is `'12345'`, you may set
  `pageAfter: '12345'` to get the next page.
- `pageBefore`: This works the same as `pageAfter`, except it is intended for
  when your going backward and fetching a number items _before_ the id you
  provide.
- `pageId`: Some services and/or transporters will return an id for the next
  page, as an alternative to the other properties mentioned above. You then
  apply this id as `pageId` when dispatching the action for the next page. Note
  that this id may hold internal logic from the transporter, but you should
  never rely on this logic and simply use it as an id.

> **Important note:** Pagination has to be supported by the service and your
> service configuration, and sometimes also the transporter. Integreat prepares
> and passes on these pagination properties, but if the service disregards them,
> there is little Integreat can do – except limiting the number of items
> returned. It's up to you to figure out how to configure pagination for a
> service, but youshould use these pagination properties to support it, to make
> this predictable. It also lets you use actions such as `GET_ALL`, that support
> pagination.

Finally, there are some properties that has no special meaning to Integreat
itself, but that may be set on incoming actions from transporters. These should
ideally be used in the same way or avoided:

- `contentType`: A keyword for the type of content in the `data` property. E.g.
  `application/json` or `text/plain`.
- `headers`: An object of header information, given as key/value pairs. The
  value may be a string or an array of strings. This may be HTTP headers or any
  other type of header information that makes sense to a service.
- `hostname`: The host name that incoming request was sent to. For HTTP, this
  will be the domain name the request was sent to.
- `method`: The method of the incoming request. The HTTP transporter will set
  this to `GET`, `POST`, `PUT`, etc. from the incoming request.
- `path`: The path from the incoming request. For the HTTP transporter, this
  will be the part of the url after the domain name, like
  `'/v1.0/articles/12345'`.
- `port`: The port number of the incoming request.
- `queryParams`: An object of query params from the incoming request, usually
  key/value pairs where the value is a string or an array of strings. For HTTP,
  this will be the part after the question mark.

### Meta properties

The action meta object is for information about an action that does not directly
define the action itself. The difference may be subtle in some cases, but the
general rule is a piece of information affects how the action is run, it should
be in the payload. E.g. the type of items to fetch is in the payload, while the
time the action was dispatched would go in the meta.

This rule does not always hold, e.g. for information on the user dispatching the
action in `ident` on the meta object. Different idents may result in different
data being returned from the service, but still the action to perform is the
same, so it makes sense to have the ident in the meta object.

You may set your own meta properties, but in most cases you'll probably rather
set payload properties.

Current meta properties reserved by Integreat:

- `ident`: The ident to authorize the action with. May hold an `id`, `roles`,
  `tokens`, and a few other options. See
  [the section on idents](#idents-and-security-rules).
- `id`: The id of the action itself. You may set this yourself or let Integreat
  generate a universally unique id for you. Useful for logging and may be used
  by queues.
- `cid`: A correlation id that may be used to group actions that belong
  together, primarily for logging purposes. You may set this yourself or
  Integreat will set it to the same as the `id`. Some Integreat action handlers
  will dispatch sub actions using the `cid` from the original action.
- `dispatchedAt`: Timestamp for when the action was dispatched (set by
  Integreat).
- `queue`: Signals to Integreat that an action may be queued. Set to `true` when
  you want the action to be queued, but executed as soon as possible. Set to a
  UNIX timestamp (number) to schedule for a later time. If no queue is set up,
  the action will be dispatched right away. More on this under
  [the section on queues](#queue).
- `queuedAt`: Timestamp for when the action was pushed to the queue (set by
  Integreat).
- `options`: Used for passing the processed service endpoint options object to
  a transporter. The `options` object is available through mutations, so that
  you may modify it futher before it goes to the transporter. Note that only the
  transporter options are provided here, not the adapter options.
- `authorized`: An internal flag signaling that the action has been authorized.
  Will be removed from any dispatched actions.

### Action response

When you dispatch an action, you will get a response object back in this format:

```javascript
{
  status: <status code>,
  data: <data from the service, usually mutated>,
  error: <error message>,
  warning: <warning message>,
  origin: <code telling where an error originated>
  access: <holds the ident actually being used>,
  paging: <pagination objects>,
  params: <key/value pairs>,
  headers: <key/value pairs>,
  responses: <array of sub-responses when relevant>,
}
```

- `status`: The status of the action. Will be `ok` when everything went well,
  see [list of status codes](#status-codes) below for more.
- `data`: Any data returned from the service, after being modified by the
  mutation pipelines from your service and endpoint configuration. It will be
  cast to [typed data](#typed-data) through the schema specified by the payload
  `type`, if it is set to a single type and the endpoint `allowRawResponse` is
  not set to `true`.
- `error`: All error statuses (i.e. not `ok` or `queued`) will return an error
  message, some may include error messages from the service.
- `warning`: When the action was successful, but there still was something you
  should know, the warning message is where you'll get noticed. An example is
  when you get an array of data items, but some of them was removed due to the
  access of the ident on the action.
- `origin`: When the response is an error (status is not `'ok'` or `'queue'`),
  this property will hold a code for where the error originated. The goal is to
  set it as close to the actual origin as possible. See
  [list of origin codes](#origin-codes) below.
- `access`: An object holding the `ident` that was actually being used. This may
  be different than the `meta.ident` on the action, as the ident may also be
  mutated or completed with roles etc. along the way.
- `paging`: For services and transporters that support
  [pagination](#pagination), this object will hold information about how to get
  the next or previous page, in a `next` or `prev` object. These objects are
  essentially the payloads you need to dispatch (with the same action `type` and
  meta), to get the next or previous page. If there is no next or previous page,
  the corresponding prop will not be set on the `paging` object. When pagination
  is not relevant or used, the `paging` object may be missing completely.
- `params`: Integreat never sets this, but you may set it in your mutations to
  provide parameters from a service that does not belong in the `data`.
- `headers`: Integreat never sets this, but you may set it in your mutations to
  provide header key/value pairs from a service. Typically used when this is a
  response to an incoming request that support headers, like HTTP do.
- `responses`: In some cases, an action will run several sub-actions, like
  `SYNC` or `RUN`. The action handlers _may_ then provide an array of all the
  sub-response objects here.

> Editor's note: Is it correct that queues return the id in the data?

When the status is `queued`, the id of the queued action may found in
`response.data.id`. This is the id assigned by the queue, and not necessarily
the same as `action.meta.id`.

### Status codes

The `status` property on the action response will be one of the following status
codes:

- `ok`: Everything is well, data is returned as expected
- `queued`: The action has been queued. This is regarded as a success status
- `noaction`: The action did nothing, e.g. when a `SYNC` action has no data to
  sync
- `notfound`: Tried to get or modify a resource that does not exist
- `timeout`: The attempt to perform the action timed out
- `autherror`: An authentication request failed
- `noaccess`: Authentication is required or the provided auth is not enough
- `badrequest`: Request data is not as expected
- `badresponse`: Response data is not as expected
- `error`: Any other error

### Origin codes

The `origin` property is not exclusively defined, but these are some of the more
common codes:

- `service:<service id>`: The error originated in service. There may also be
  third level of detail here, if the service sets an origin code of its own.
  E.g. `'service:entries:handshake`.
- `middleware:service:<service id>`: The error happened in the middleware chain
  on the service side.
- `internal:service:<service id>`: Used for errors in the service class, that
  has nothing to do with the actual service, e.g. if the service class is not
  configured correctly.
- `mutate:request`: The error was set in a request mutation pipeline.
- `mutate:response`: The error was set in a response mutation pipeline.
- `auth:action`: The error occured while attempting to authorize the action.
- `auth:data`: The error occured while attempting to authorize data in an
  action payload or a response.
- `auth:service:<service id>`: The error occured while attempting to authorize
  the service with the given id.
- `auth:service:<service id>:<authenticator id>`: The error occured while
  attempting to authorize the service with the given id, through the given
  authenticator.
- `handler:<handler id>`: The error occurred with the handler with the given id,
  e.g. `'handler:GET'`. This means the error did happen in the service or the
  mutation pipelines, but in the internal workings of then handler.
- `validate:service:<service id>:endpoint:<endpoint id>`: Validation of an
  action against an endpoint failed. Note that not all endpoints has an id, in
  which case that part of the origin code is left out.
- `middleware:dispatch`: The error happened within the middleware chain, on the
  `dispatch()` end (not on the service end).
- `dispatch`: This is the lowest level of origin, as the error happened within
  the `dispatch()` method.

### Idents

An ident in Integreat is basically an id unique to one participant in the
security scheme. It is represented by an object that may also have other
properties to describe the ident's access, like `roles`, or to make it possible
to match to identities in other services.

Example ident:

```javascript
{
  id: 'ident1',
  tokens: ['auth0|12345', 'github|23456'],
  roles: ['admin']
}
```

- `id`: A unique string identifying the ident. The actual value is irrelevant to
  Integreat, as long as it is a string with A-Z, a-z, 0-9, \_, and -, and it's
  unique within one Integreat configuration. This means that mapped values from
  services may be used as ident ids, as long as they are unique among these
  services.
- `tokens`: A list of values that may identify this ident in other services. For
  example, an api that uses Twitter OAuth to identify its users, may provide
  the `'github|23456'` token in the example above, which will be replaced with
  this ident when it enters Integreat.
- `roles`: A list of roles or permissions given to this ident. The roles are
  custom defined per setup, and may be mapped to roles from other systems. When
  setting the auth rules for a schema, you specify required rules so that to get
  data cast in this schema, an ident with e.g. the role `admin` must be
  provided.

Actions are authenticated by setting an ident on the `meta.ident` property. It's
up to the code dispatching an action to get hold of the properties of an ident
in a secure way. Once Integreat receives an ident through a dispatch, it will
assume this is accurate information and uphold its part of the security
agreement and only return data and execute actions that the ident have
permissions for.

Note that it's possible to set up
[the `completeIdent` middleware](#completeIdent-middleware) for combining
information from the authenticator with user information held e.g. in a
database.

### Available action handlers

#### `GET`

Get data from a service. You receive the data on the `data` property, after it
has been run through your service and endpoint mutations.

Example GET action to a collection of data items:

```javascript
{
  type: 'GET',
  payload: { type: 'article' }
}
```

By providing an `id` property on `payload`, the item with the given id and type
is fetched, if it exists:

```javascript
{
  type: 'GET',
  payload: { type: 'article', id: '12345' }
}
```

See [the section on payload properties](#payload-properties) for more properties
that may be used with the `GET` action.

#### `GET_ALL`

Will run as many `GET` actions as needed to the get all available pages of data.

The action ...

```javascript
{
  type: 'GET_ALL',
  payload: { type: 'article', pageSize: 500 }
}
```

... will dispatch the following action is sequence:

```javascript
{
  type: 'GET',
  payload: { type: 'article', pageSize: 500 }
}
```

```javascript
{
  type: 'GET',
  payload: { type: 'article', pageSize: 500, pageOffset: 500 }
}
```

... and so on, until we get no more data.

See [the section on pagination](#pagination) for more on the paging properties.

#### `SET`

Send data to a service. The data to send is provided in the payload `data`
property. Recomended practice is to provide the data as
[typed data](#typed-data), i.e. data objects cast to a schema, and let
mutations on the service endpoint modify it to the format the service expects.

Any data coming back from the service, will be provided on `response.data` and
may be mutated through service endpoint mutations, just as for [`GET`](#get)
actions.

Example `SET` action:

```javascript
{
  type: 'SET',
  payload: {
    type: 'article',
    data: [
      { id: '12345', $type: 'article', title: 'First article' },
      { id: '12346', $type: 'article', title: 'Second article' }
    ]
  }
}
```

#### `UPDATE`

Update data on a service. The idea is that while `SET` is used for setting data
to a service – with no regard to what is actually set in the service already,
`UPDATE` is used for updating data, possibly not overwriting all properties.
If `UPDATE` provides data with only a few properties, the expectation is that
only these properties will be updated in the service. The `UPDATE` action is
also expected to fail when the item being updated does not exist, unlike `SET`,
that will usually create it.

Note that the actual behavior is up to how you set up the service and what the
service itself supports, but the `UPDATE` action will provide you with a way of
doing this.

An `UPDATE` action may be handled in one of two ways, where the first is just to
run it against a service endpoint, much like a `SET` action (except it will
match different endpoints). Data provided in the payload `data` is mutated and
sent to the service according to the endpoint configuration, and any data coming
back, will be provided on `response.data` and mutated.

What makes `UPDATE` different from `SET`, though, is the second way we may
handle `UPDATE` actions. Whenever there is no maching `UPDATE` endpoint,
Integreat will run the action as a `GET` and then a `SET`, to mimick and update.
The `GET` action will have the same `payload` and `meta` as the original action.
The same goes for the `SET` action, but the `payload.data` will be the data
returned from `GET` merged with the data on the original `UPDATE` action. This
will be a deep merge, prioritizing properties from the `UPDATE` action. A
requirement for this to work as expected, is that the data is casted to the same
schema, but that should normally be the case when you use `payload.type` and
don't set `allowRawRequest` or `allowRawResponse` on the endpoint.

When a `GET` fail, the `UPDATE` will fail with the same status and error.

Example `UPDATE` action:

```javascript
{
  type: 'UPDATE',
  payload: {
    type: 'article',
    data: [
      { id: '12345', $type: 'article', title: 'First article' },
      { id: '12346', $type: 'article', title: 'Second article' }
    ]
  }
}
```

#### `DELETE` / `DEL`

Delete one or more items from a service. Set the data for the items to delete,
in the payload `data` property as an array of [typed data](#typed-data).
In most cases, you only need to provide the `id` and the `$type`, but the way
you set up the service may require more properties.

Any data coming back from the service, will be provided on `response.data` and
may be mutated through service endpoint mutations, just as for [`GET`](#get)
actions.

Example `DELETE` action:

```javascript
{
  type: 'DELETE',
  payload: {
    type: 'article',
    data: [
      { id: '12345', $type: 'article' },
      { id: '12346', $type: 'article' }
    ]
  }
}
```

You may also `DELETE` one item like this:

```javascript
{
  type: 'DELETE',
  payload: {
    id: 'ent1',
    type: 'entry'
  }
}
```

`DEL` is a shorthand for `DELETE`.

#### `GET_META`

Get metadata for a service. See
[the section on metadata](#configuring-service-metadata) for how to set this up.

The `data` of the response from this aciton contains the `service` (the service
id) and `meta` object with the metadata set as properties.

Example `GET_META` action:

```javascript
{
  type: 'GET_META',
  payload: {
    service: 'entries',
    keys: ['lastSyncedAt', 'status']
  }
}
```

This will return data in the following form:

```javascript
{
  status: 'ok',
  data: {
    service: 'entries',
    meta: {
      lastSyncedAt: '2017-08-19T17:40:31.861Z',
      status: 'ready'
    }
  }
}
```

If the action has no `keys`, all metadata set on the service will be retrieved.
The `keys` property may be an array of keys to retrieve several in one request,
or a single key.

#### `SET_META`

Set metadata on a service. The payload should contain the `service` to get
metadata for (the service id), and a `meta` object, with all metadata to set as
properties.

Any data coming back from the service, will be provided on `response.data` and
may be mutated through service endpoint mutations, just as for [`GET`](#get)
actions.

Example `SET_META` action:

```javascript
{
  type: 'SET_META',
  payload: {
    service: 'entries',
    meta: {
      lastSyncedAt: Date.now()
    }
  }
}
```

Note that the service must be set up to handle metadata. See
[Configuring metadata](#configuring-service-metadata) for more.

#### `RUN`

The `RUN` action will run jobs provided to `Integreat.create()` in the jobs
definitions. These jobs will then run other actions or series of action, also
called "flows".

Only one payload property is required – the `jobId`, which refers to a job in
the jobs definitions. Any other properties on the payload will be passed on as
input to the job.

An action for running the `archiveOutdated` job:

```javascript
{
  type: 'RUN',
  payload: { jobId: 'archiveOutdated' }
}
```

See [the section on jobs](#jobs) for more on how to configure jobs.

#### `SYNC`

The `SYNC` action will `GET` items from one service and `SET` them on another.
There are different options for how to retrieve items, ranging from a crude
retrieval of all items on every sync, to a more fine grained approach where only
items that have been updated or created since last sync, will be synced.

The simplest action definition would look like this, where all items would be
retrieved from the service and set on the target:

```javascript
{
  type: 'SYNC',
  payload: {
    type: <item type>,
    retrieve: 'all',
    from: <service id | payload>,
    to: <service id | payload>
  }
}
```

The action will dispatch a `GET` action right away, and then immediately
dispatch a `SET_META` action to update the `lastSyncedAt` date on the service.
The `SET` actions to update the target service is added to the queue if one is
configured.

To retrieve only new items, change the `retrieve` property to `updated`. In
this case, the action will dispatch `GET_META` to get the `lastSyncedAt` from
the `from` service, and get only newer items, by passing it the `updatedAfter`
param. The action will also filter out older items, in case the service does not
support `updatedAfter`.

By setting `retrieve` to `created`, you accomplish the same, but with
`createdAfter`.

If you need to include more params in the actions to get from the `from` service
or set to the `to` service, you may provide a params object for the `from` or
`to` props, with the service id set as a `service` param. You may also provide
different action types than `GET` and `SET`, by setting the `action` prop on
the `from` or `to` objects respectively.

> There are more options than these, and the documentation will be updated to
> include them later.

#### `EXPIRE`

> Note: This action will change before we reach v1.0.

The `EXPIRE` action will `GET` expired data items from a service, and the then
`DELETE` them.

Here's an example of an `EXPIRE` action:

```javascript
{
  type: 'EXPIRE',
  payload: {
    service: 'store',
    type: 'entry',
    endpoint: 'getExpired',
    msFromNow: 0
  }
}
```

The `endpoint` property is required for this action, and needs to specify a
service endpoint used to fetch expired items. The action dispatched to this
endpoint will have a `timestamp` property with the current time as microseconds
since epoc (Januar 1, 1970 UTC), and `isodate` as the current time in the
extended ISO 8601 format(`YYYY-MM-DDThh:mm:ss.sssZ`).

To have `timestamp` and `isodate` be a time in the future instead, set
`msFromNow` to a positive number of milliseconds. This will be added to the
current time. To have a time in the past, use a negative number for `msFromNow`.

#### `SERVICE`

A `SERVICE` action will be sent directly to the specified service without any
intervention by Integreat. This allows for running specialized actions on the
service that goes beyond what Integreat supports. It's up to each transporter to
support such actions, describe what they'll do, and define their payload
properties.

An example of an action that will tell a
[Bull](https://github.com/integreat-io/integreat-transporter-bull) queue to
clean out all completed jobs more than a week old:

```javascript
{
  type: 'SERVICE',
  payload: {
    type: 'cleanCompleted',
    targetService: 'bullService',
    olderThanMs: 604800000
  }
}
```

### Write your own action handlers

You may write your own action handlers to handle dispatched actions just like
the built-in types.

Action handler signature:

```javascript
async function (action, { dispatch, getService, setProgress, options }) { ... }
```

- `action`: This is the dispatched action after it has been modified a bit
  by the `dispatch()` method and possible after running an incoming mutation on
  it. The modifications include cleaning up alias fields (e.g. `service` will be
  set as `targetService`), removing sensitive or forbidden fields, and setting a
  few default or internal fields (like the `dispatchedAt` meta).
- `dispatch`: From the handler, you may dispatch your own sub actions to the
  provided `dispatch()` method. Note that this is an "internal dispatch method",
  so it will return an action with the `response` object on it, instead of just
  the `response` object. It's good practice to set the `cid` meta prop for the
  actions you dispatch, to the `cid` meta prop on the `action` you're handling.
  You should also use the same `ident` unless you have very good reasons to do
  otherwise, to make sure you don't create security holes.
- `getService`: This is a convenience method that will return the relevant
  service object when you provide it with a type and optional a service id. With
  a service id, you'll get the service with that id, with only the type, you'll
  get the default service for that type. E.g.: `getService('article')`.
- `setProgress`: For long running tasks, you may want to set the progress along
  the way. Progress is specified as a number between `0` and `1`, e.g.
  `setProgress(.5)` to signal that you're halfway through. When the your handler
  is finished, the progress will automatically be set to `1`. This may be used
  by queue implementations etc., to give progress feedback to users and to know
  the action has not gone stale.
- `options`: This is an object with a few settings: `queueService` is the id of
  the service set up as the default queue, and `identConfig` is the config
  object used for mapping ident schemas to ids, roles, and tokens (see
  [the `completeIdent` middleware](#completeIdent-middleware)).

Your action handler must return a [response object](#action-response). If your
handler just relays to another action handler, it may pass on the response
returned from that handler, but in many cases it will be more correct to
generate your own response.

You provide your custom actions to Integreat on setup, by providing an object
with the key set to the action type your handler will be responsible for, and
the handler function as the value:

```javascript
const actions = {
  `MY_ACTION`: async function myAction (action, { dispatch }) { ... }
}
const great = Integreat.create(defs, { schemas, services, mappings, actions })
```

Note that if you set up your custom action handler with an action type that is
already used by one of Integreat's built-in action handlers, the custom handler
will have precedence. So be careful when you choose an action type, if your
intention is not to replace an existing action handler.

## Jobs

> **Editor's note:** Write this section.

## Queues

As everything else in Integreat, a queue is also a service. You configure a
queue service, e.g.
[`integreat-transporter-bull`](https://github.com/integreat-io/integreat-transporter-bull),
and set its service id on the `queueService` property of the definition object
you give to `Integreat.create()`:

```javascript
import bullQueue from `integreat-transporter-bull`

const services = [
  {
    id: 'queue',
    transporter: 'bull',
    // ...
  }
]
const transporters = {
  bull: bullQueue
}

const great = Integreat.create(
  { services, queueService: 'queue' },
  { transporters }
)
```

To queue an action instead of dispatching it right away, you set `queue: true`
on the `meta` object. If everything is set up correctly, Integreat will push the
action to the queue. When the action is later pulled from the queue, it will be
dispatched again, but without the `queue` property.

You may also set the meta `queue` property to a Unix timestamp, and if the queue
transporter supports it, it will be run at this time instead of being processed
as soon as it is next in line in the queue.

When a queue is not set up, a dispatched action with `queue: true` will just be
run right away as a normal action.

You may also use queues directly, by dispatching to it as a server and getting
incoming actions from its `listen()` method. In that case, it's just as any
other service with no need for any special handling.

> Queueing actions are actually done through an action handler, but this handler
> is not available from outside Integreat.

## Middleware

Integreat supports middleware, and there are two different middleware
"pipelines":

- The first one is run on dispatched actions. The action goes through the
  middleware before the action handler takes over, but after the incoming
  mutations have been run. Because of this, given that you have set up the
  services with mutation and casting to schemas, you should always be dealing
  with [typed data](#typed-data) in the middleware.
- The action then passes through a second middleware "pipeline" just before it
  is sent to the service. This happens _after_ all mutations have been run, so
  you will be dealing with the data as it is sent to the service. Incoming
  actions from a service also pass through this middleware on the way in,
  _before_ it is mutated, giving you access to the data as it comes from the
  service.

To set up a logger of what we recieve from and send to a service, you'll use the
second middleware "pipeline", while a logger of dispatched actions would be
placed in the first.

When actions pass through middleware, they may modifiy the actions as
appropriate, and you will have middleware that modifies (e.g. the
[`completeIdent` middleware](#completeident-middleware)), and others that just
monitors what's coming through (e.g. a logger).

Middelware is passed to Integreat like this:

```javascript
const great = Integreat.create(
  defs,
  resources,
  [
    // Dispatch middleware
  ],
  [
    // Service middleware
  ]
)
```

### `completeIdent` middleware

If your access rules are based only on the information received from an
authenticator, you don't need the following. You will always get an id and
potentially some other fields, like roles.

But when you need to match the ident id from the authenticator with user
information held somewhere else, e.g. in a database, you need to configure a
user schema and set up a service to fetch this information.

Integreat uses schemas and services to store idents. In the definition object
passed to `Integreat.create()`, you may provide an `identConfig` property with
a definition object looking something like this:

```javascript
const great = Integreat.create(
  {
    // ...,
    identConfig: {
      type: 'user',
      props: {
        id: 'id',
        roles: 'groups',
        tokens: 'tokens',
      },
    },
  },
  {
    // ...
  }
)
```

- `type`: This is the id of the schema used for getting ident data. This schema
  needs to have a `service` specified.
- `props`: You may provide alternative field names for the `id`, `roles`, and
  `tokens` for an ident in the schema specified on `type`. When the prop and the
  field has the same name, it may be omitted, though it doesn't hurt to specif
  it anyway for clarity.

Note that in the example above, the `id` of the data will be used as the ident
`id`. When the id is not suited for this, you will need another field on the
schema that may act as the ident id. In cases where you need to transform the
id from the data in some way, this must be set up as a separate field and the
mutation will dictate how to transform it. In most cases, the `id` will do,
though.

For some setups, this requires certain endpoints to be defined on the service.
To match a token with an ident, the service must have an endpoint that matches
actions like this:

```javascript
{
  type: 'GET',
  payload: {
    type: 'user',
    tokens: 'github|23456'
  }
}
```

In this case, `user` is the schema mapped to idents, and the `tokens`
property on the ident is mapped to the `tokens` field on the schema.

To make Integreat complete idents on actions with the persisted data, set it up
with the `completeIdent` middleware:

```javascript
const great = Integreat.create(defs, resources, [
  Integreat.middleware.completeIdent,
])
```

This middleware will intercept any action with `meta.ident` and replace it with
the ident item loaded from the designated schema. If the ident has an `id`,
the ident with this id is loaded, otherwise a `withToken` is used to load the
ident with the specified token. If no ident is found, the original ident is
kept.

### Writing middleware

You may write middleware to intercept dispatched actions. This may be useful
for logging, debugging, and situations where you need to make adjustments to
certain actions.

A middleware is a function that accepts a `next()` function as only argument,
and returns an async function that will be called with the action on dispatch.
The returned function is expected to call `next()` with the action, and return
the result from the `next()` function, but is not required to do so. The only
requirement is that the functions returns a valid
[response object](#action-response).

Example implementation of a very simple logger middleware:

```javascript
const logger = (next) => async (action) => {
  console.log('Dispatch was called with action', action)
  const response = await next(action)
  console.log('Dispatch completed with response', response)
  return respons
}
```

# Debugging

Run Integreat with env variable `DEBUG=great`, to receive debug messages.

Some sub modules sends debug messages with the `integreat:` prefix, so use
`DEBUG=great,integreat:*` to catch these as well.
