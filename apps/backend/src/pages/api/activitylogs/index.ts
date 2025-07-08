import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, ActivityLog, CreateActivityLogRequest } from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ActivityLogService } from '@/services/activityLogService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ActivityLog | ActivityLog[]>>
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getActivityLogs(req, res);
      case 'POST':
        return await withAuth(createActivityLog)(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in activitylogs API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
});

async function getActivityLogs(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ActivityLog[]>>
) {
  const { parentId, parentType } = req.query;

  if (!parentId || Array.isArray(parentId) || !parentType || Array.isArray(parentType)) {
    return res.status(400).json({
      success: false,
      error: 'Parent ID and Parent Type are required',
    });
  }

  if (parentType !== 'TICKET' && parentType !== 'REPORT') {
    return res.status(400).json({
      success: false,
      error: 'Invalid Parent Type. Must be TICKET or REPORT.',
    });
  }

  const activityLogs = await ActivityLogService.getActivityLogs(
    parentId as string,
    parentType as 'TICKET' | 'REPORT'
  );

  return res.status(200).json({
    success: true,
    data: activityLogs,
  });
}

async function createActivityLog(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<ActivityLog>>
) {
  const { content, parentId, parentType } = req.body as CreateActivityLogRequest;
  const userId = req.user.id;

  if (!content || !parentId || !parentType) {
    return res.status(400).json({
      success: false,
      error: 'Content, Parent ID, and Parent Type are required',
    });
  }

  if (parentType !== 'TICKET' && parentType !== 'REPORT') {
    return res.status(400).json({
      success: false,
      error: 'Invalid Parent Type. Must be TICKET or REPORT.',
    });
  }

  const activityLog = await ActivityLogService.createActivityLog(
    content,
    userId,
    parentId,
    parentType
  );

  return res.status(201).json({
    success: true,
    data: activityLog,
  });
}
