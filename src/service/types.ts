import { MapTransform } from 'map-transform'
import { Request, Response } from '../types'

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
