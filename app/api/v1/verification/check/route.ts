import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse } from '@/lib/utils/api-response'

/**
 * GET /api/v1/verification/check?session=<sessionId>
 * Check the status of a verification code
 *
 * External websites use this endpoint to poll for verification completion
 * They receive the session ID when generating a code and can poll this endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session')

    if (!sessionId) {
      return apiResponse.validationError('Missing session parameter')
    }

    // Find verification by session ID
    const verification = await db.instagramVerification.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        code: true,
        status: true,
        igUsername: true,
        instagramId: true,
        manychatUserId: true,
        externalWebsite: true,
        externalUserId: true,
        expiresAt: true,
        verifiedAt: true,
        failureReason: true,
        createdAt: true,
        metadata: true,
      },
    })

    if (!verification) {
      return NextResponse.json(
        {
          found: false,
          status: 'not_found',
          message: 'Verification session not found',
        },
        { status: 404 }
      )
    }

    // Check if expired
    if (
      verification.expiresAt < new Date() &&
      verification.status === 'pending'
    ) {
      // Mark as expired
      await db.instagramVerification.update({
        where: { id: verification.id },
        data: {
          status: 'expired',
          failureReason: 'Verification code expired',
        },
      })

      return apiResponse.success({
        found: true,
        status: 'expired',
        code: verification.code,
        expires_at: verification.expiresAt.toISOString(),
        created_at: verification.createdAt.toISOString(),
        message: 'Verification code has expired',
      })
    }

    // Return status
    const response: any = {
      found: true,
      status: verification.status,
      code: verification.code,
      expires_at: verification.expiresAt.toISOString(),
      created_at: verification.createdAt.toISOString(),
    }

    // Add verification details if verified
    if (verification.status === 'verified') {
      response.ig_username = verification.igUsername
      response.instagram_id = verification.instagramId
      response.manychat_user_id = verification.manychatUserId
      response.verified_at = verification.verifiedAt?.toISOString()
      response.external_user_id = verification.externalUserId
      response.metadata = verification.metadata
        ? JSON.parse(verification.metadata)
        : null
      response.message = 'Verification successful'
    } else if (verification.status === 'pending') {
      response.message = 'Waiting for user to send verification code via Instagram DM'
    } else if (verification.status === 'failed') {
      response.message = 'Verification failed'
      response.failure_reason = verification.failureReason
    }

    return apiResponse.success(response)
  } catch (error) {
    console.error('Error checking verification status:', error)
    return apiResponse.error(error)
  }
}
