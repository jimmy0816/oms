import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse, Ticket, Report } from 'shared-types';
import { notificationService } from '@/services/notificationService';

// Define Report type based on Prisma schema
interface Report {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  assigneeId?: string | null;
  category?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: Date;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  tickets?: Ticket[];
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    fileType: string;
    fileSize: number;
    createdAt: Date;
    createdById?: string | null;
    createdBy?: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  activityLogs?: Array<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    parentId: string;
    parentType: string;
  }>;
}

// Define UpdateReportRequest type
interface UpdateReportRequest {
  title?: string;
  description?: string;
  location?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  category?: string;
  contactPhone?: string;
  contactEmail?: string;
  ticketIds?: string[];
  attachments?: any[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID',
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getReportById(id, req, res);
      case 'PUT':
        return await updateReport(id, req, res);
      case 'DELETE':
        return await deleteReport(id, req, res);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error(`Error in reports/${id} API:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

async function getReportById(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      tickets: { include: { ticket: true } },
    },
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  // Fetch attachments separately using polymorphic relation
  const attachments = await prisma.attachment.findMany({
    where: {
      parentId: id,
      parentType: 'REPORT',
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Fetch activity logs separately using polymorphic relation
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      parentId: id,
      parentType: 'REPORT',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Manually attach attachments and activityLogs to the report object
  const reportWithRelations = {
    ...report,
    attachments,
    activityLogs,
  };

  return res.status(200).json({
    success: true,
    data: reportWithRelations,
  });
}

async function updateReport(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  const {
    title,
    description,
    location,
    status,
    priority,
    assigneeId,
    category,
    contactPhone,
    contactEmail,
    attachments,
    ticketIds,
  } = req.body as UpdateReportRequest;

  // Check if report exists
  const existingReport = await prisma.report.findUnique({
    where: { id },
  });

  if (!existingReport) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  // Prepare update data
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (location !== undefined) updateData.location = location;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
  if (category !== undefined) updateData.category = category;
  if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail;

  // Handle ticketIds update
  if (ticketIds !== undefined) {
    updateData.tickets = {
      set: ticketIds.map((ticketId) => ({
        ticketId: ticketId,
        reportId: id,
      })),
    };
  }

  // Update report
  const updatedReport = await prisma.report.update({
    where: { id },
    data: updateData,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tickets: {
        // Include tickets in the response
        include: {
          ticket: true,
        },
      },
    },
  });

  // Create notification if assignee was changed
  if (assigneeId && assigneeId !== existingReport.assigneeId) {
    await notificationService.create({
      title: '通報已指派給您',
      message: `您已被指派到通報：「${updatedReport.title}」`,
      userId: assigneeId,
      relatedId: id,
      relatedType: 'REPORT',
    });
  }

  // Create notification if status was changed
  if (status && status !== existingReport.status) {
    // Notify creator
    await notificationService.create({
      title: '通報狀態更新',
      message: `您的通報「${updatedReport.title}」狀態已更新為 ${status}`,
      userId: existingReport.creatorId,
      relatedId: id,
      relatedType: 'REPORT',
    });
  }

  return res.status(200).json({
    success: true,
    data: updatedReport,
  });
}

async function deleteReport(
  id: string,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  // Check if report exists
  const existingReport = await prisma.report.findUnique({
    where: { id },
  });

  if (!existingReport) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  // Delete related comments first to avoid foreign key constraint errors
  await prisma.comment.deleteMany({
    where: { reportId: id },
  });

  // Delete related notifications
  await prisma.notification.deleteMany({
    where: { relatedId: id, relatedType: 'REPORT' },
  });

  // Delete the report
  const deletedReport = await prisma.report.delete({
    where: { id },
  });

  return res.status(200).json({
    success: true,
    data: deletedReport,
  });
}