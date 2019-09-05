import { MapTransform } from 'map-transform'
import { GenericData } from '../types'

export interface Ident {
  id: string
  root?: boolean
}

export interface Request<T = GenericData> {
  action: string
  params: {
    [param: string]: GenericData
  }
  endpoint: {
    [option: string]: GenericData
  }
  data?: T
  auth?: object | boolean
  access?: { ident: Ident }
}

export interface Response<T = GenericData> {
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
