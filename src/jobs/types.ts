import type {
  TransformDefinition,
  TransformObject,
  Pipeline,
} from 'map-transform/types.js'
import { Action, Condition, ValidateObject } from '../types.js'

export interface JobStepDef {
  id: string
  conditions?: Record<string, Condition | undefined>
  preconditions?: ValidateObject[]
  premutation?: TransformObject | Pipeline
  mutation?: TransformObject | Pipeline
  iterate?: TransformDefinition
  iteratePath?: string
  iterateConcurrency?: number
  action: Action
  postmutation?: TransformObject | Pipeline
  responseMutation?: TransformObject | Pipeline
  // postconditions?: ValidateObject[]
}

export interface JobDef {
  id?: string
  action?: Action
  flow?: (JobStepDef | JobStepDef[])[]
  cron?: string
  tz?: string
  postmutation?: TransformObject | Pipeline
  responseMutation?: TransformObject | Pipeline
}
