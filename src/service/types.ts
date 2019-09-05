import { MapTransform } from 'map-transform'
import { Data } from '../types'

export interface Ident {
  id: string
  root?: boolean
}

export interface Request<T = Data> {
  action: string
  params: {
    [param: string]: Data
  }
  endpoint: {
    [option: string]: Data
  }
  data?: T
  auth?: object | boolean
  access?: { ident: Ident }
}

export interface Response<T = Data> {
  status: string
  data: T
  error?: string
  responses?: Response[]
  access?: object
}

export interface Mappings {
  [type: string]: MapTransform
}

export interface SendOptions {
  request: Request
  response?: Response
  mappings: Mappings
  responseMapper?: MapTransform
  requestMapper?: MapTransform
}
