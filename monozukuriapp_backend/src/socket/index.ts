import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'
import { TokenValidationService } from '../services/token-validation.service'

const logger = new Logger('SocketHandler')

interface AuthenticatedSocket extends Socket {
  userId?: string
  sessionId?: string
}

export function setupSocketHandlers(io: Server, tokenValidationService: TokenValidationService) {
  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      // Verify token using TokenValidationService
      const userId = await tokenValidationService.validateTokenAndGetUserId(token)
      if (!userId) {
        return next(new Error('Invalid token'))
      }

      (socket as AuthenticatedSocket).userId = userId.toString()
      next()
    } catch (error) {
      logger.error('Socket authentication failed:', error)
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket
    logger.log(`User ${authSocket.userId} connected`)

    // Join session room
    socket.on('join_session', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data
        
        // TODO: Verify user has access to this session
        // const hasAccess = await verifySessionAccess(authSocket.userId!, sessionId)
        // if (!hasAccess) {
        //   socket.emit('error', { message: 'Access denied to session' })
        //   return
        // }

        // Leave previous session if any
        if (authSocket.sessionId) {
          socket.leave(authSocket.sessionId)
        }

        // Join new session
        socket.join(sessionId)
        authSocket.sessionId = sessionId
        
        // TODO: Get user email from database
        // const userEmail = await getUserEmail(authSocket.userId!)
        
        // Notify others in the session
        socket.to(sessionId).emit('user_joined', {
          userId: authSocket.userId,
          userEmail: 'user@example.com', // TODO: Replace with actual email
          timestamp: new Date().toISOString()
        })

        logger.log(`User ${authSocket.userId} joined session ${sessionId}`)
      } catch (error) {
        logger.error('Error joining session:', error)
        socket.emit('error', { message: 'Failed to join session' })
      }
    })

    // Leave session room
    socket.on('leave_session', () => {
      if (authSocket.sessionId) {
        socket.to(authSocket.sessionId).emit('user_left', {
          userId: authSocket.userId,
          userEmail: 'user@example.com', // TODO: Replace with actual email
          timestamp: new Date().toISOString()
        })
        
        socket.leave(authSocket.sessionId)
        logger.log(`User ${authSocket.userId} left session ${authSocket.sessionId}`)
        authSocket.sessionId = undefined
      }
    })

    // Fishbone status subscription
    socket.on('subscribe_fishbone_status', () => {
      try {
        const userId = authSocket.userId
        if (!userId) {
          socket.emit('error', { message: 'User ID not found' })
          return
        }

        // Join fishbone status room for this user
        socket.join(`fishbone_status_${userId}`)
        logger.log(`User ${userId} subscribed to fishbone status updates`)
        
        socket.emit('fishbone_status_subscribed', {
          userId,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        logger.error('Error subscribing to fishbone status:', error)
        socket.emit('error', { message: 'Failed to subscribe to fishbone status' })
      }
    })

    // Unsubscribe from fishbone status
    socket.on('unsubscribe_fishbone_status', () => {
      try {
        const userId = authSocket.userId
        if (!userId) {
          socket.emit('error', { message: 'User ID not found' })
          return
        }

        // Leave fishbone status room
        socket.leave(`fishbone_status_${userId}`)
        logger.log(`User ${userId} unsubscribed from fishbone status updates`)
        
        socket.emit('fishbone_status_unsubscribed', {
          userId,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        logger.error('Error unsubscribing from fishbone status:', error)
        socket.emit('error', { message: 'Failed to unsubscribe from fishbone status' })
      }
    })

    // Handle collaboration events
    socket.on('start_analysis', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data
        
        // TODO: Implement analysis start logic
        logger.log(`Starting analysis for session ${sessionId} by user ${authSocket.userId}`)
        
        // Emit to all users in the session
        io.to(sessionId).emit('analysis_started', {
          sessionId,
          startedBy: authSocket.userId,
          timestamp: new Date().toISOString()
        })
        
        // TODO: Call actual analysis service
        // await analysisService.startAnalysis(sessionId, authSocket.userId!)
        
      } catch (error) {
        logger.error('Error starting analysis:', error)
        socket.emit('analysis_error', { 
          message: 'Failed to start analysis',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    socket.on('chat_message', async (data: { sessionId: string; message: string }) => {
      try {
        const { sessionId, message } = data
        
        // TODO: Save chat message to database
        logger.log(`Chat message in session ${sessionId} from user ${authSocket.userId}: ${message}`)
        
        // Emit to all users in the session
        io.to(sessionId).emit('chat_message', {
          sessionId,
          userId: authSocket.userId,
          userEmail: 'user@example.com', // TODO: Replace with actual email
          message,
          timestamp: new Date().toISOString()
        })
        
        // TODO: Save to database
        // await chatService.saveMessage(sessionId, authSocket.userId!, message)
        
      } catch (error) {
        logger.error('Error handling chat message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    socket.on('node_updated', async (data: { sessionId: string; nodeId: string; updates: any }) => {
      try {
        const { sessionId, nodeId, updates } = data
        
        // TODO: Update node in database
        logger.log(`Node ${nodeId} updated in session ${sessionId} by user ${authSocket.userId}`)
        
        // Emit to all users in the session
        io.to(sessionId).emit('node_updated', {
          sessionId,
          nodeId,
          updates,
          updatedBy: authSocket.userId,
          timestamp: new Date().toISOString()
        })
        
        // TODO: Save to database
        // await analysisService.updateNode(sessionId, nodeId, updates, authSocket.userId!)
        
      } catch (error) {
        logger.error('Error updating node:', error)
        socket.emit('error', { message: 'Failed to update node' })
      }
    })

    socket.on('collaboration_event', async (data: { sessionId: string; eventType: string; payload: any }) => {
      try {
        const { sessionId, eventType, payload } = data
        
        logger.log(`Collaboration event ${eventType} in session ${sessionId} by user ${authSocket.userId}`)
        
        // Emit to all users in the session
        io.to(sessionId).emit('collaboration_event', {
          sessionId,
          eventType,
          payload,
          userId: authSocket.userId,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        logger.error('Error handling collaboration event:', error)
        socket.emit('error', { message: 'Failed to process collaboration event' })
      }
    })

    socket.on('presence_update', async (data: { sessionId: string; status: string }) => {
      try {
        const { sessionId, status } = data
        
        logger.log(`Presence update in session ${sessionId} by user ${authSocket.userId}: ${status}`)
        
        // Emit to all users in the session
        io.to(sessionId).emit('presence_update', {
          sessionId,
          userId: authSocket.userId,
          userEmail: 'user@example.com', // TODO: Replace with actual email
          status,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        logger.error('Error handling presence update:', error)
        socket.emit('error', { message: 'Failed to update presence' })
      }
    })

    socket.on('disconnect', () => {
      if (authSocket.sessionId) {
        socket.to(authSocket.sessionId).emit('user_left', {
          userId: authSocket.userId,
          userEmail: 'user@example.com', // TODO: Replace with actual email
          timestamp: new Date().toISOString()
        })
      }
      logger.log(`User ${authSocket.userId} disconnected`)
    })
  })

  logger.log('Socket.IO handlers setup completed')
} 