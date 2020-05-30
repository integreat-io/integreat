import got from 'got'
import debugLib = require('debug')
import { OauthOptions } from '.'

const debug = debugLib('great:auth')

interface Body {
  access_token: string
}

export default async function authenticate({ uri, key, secret }: OauthOptions) {
  if (!key || !secret || !uri) {
    return null
  }

  const credentials = `${encodeURIComponent(key)}:${encodeURIComponent(secret)}`
  const credentials64 = Buffer.from(credentials).toString('base64')

  try {
    const body: Body = await got
      .post(uri, {
        body: 'grant_type=client_credentials',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Authorization: `Basic ${credentials64}`,
        },
        retry: 0,
      })
      .json()
    return body.access_token
  } catch (error) {
    debug(`Oauth2: Server returned an error. ${error}`)
    return null
  }
}
