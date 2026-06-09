import { ApiResponse } from '../types/analysis.types'

export function createApiResponse<T>(
  success: boolean, 
  data: T, 
  error?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString()
  }
}

export function validateData<T>(
  schema: any, 
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const errors = result.error.errors.map((err: any) => 
    `${err.path.join('.')}: ${err.message}`
  )
  
  return { success: false, errors }
} 