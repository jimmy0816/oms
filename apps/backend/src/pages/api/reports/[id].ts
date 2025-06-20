import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'prisma-client';
import { ApiResponse } from 'shared-types';
import { withApiHandler } from '@/lib/api-handler';

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
  images: string[];
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
  images?: string[];
}

export default withApiHandler(async function handler(
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
    return res
      .status(500)
      .json({
        success: false,
        error: error.message || 'Internal Server Error',
      });
  }
});

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
    },
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: report,
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
    images,
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
  if (images !== undefined) updateData.images = images;

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
    },
  });

  // Create notification if assignee was changed
  if (assigneeId && assigneeId !== existingReport.assigneeId) {
    await prisma.notification.create({
      data: {
        title: 'Report Assigned to You',
        message: `You have been assigned to report: ${updatedReport.title}`,
        userId: assigneeId,
        relatedReportId: id,
      },
    });
  }

  // Create notification if status was changed
  if (status && status !== existingReport.status) {
    // Notify creator
    await prisma.notification.create({
      data: {
        title: 'Report Status Updated',
        message: `Your report "${updatedReport.title}" status has been updated to ${status}`,
        userId: existingReport.creatorId,
        relatedReportId: id,
      },
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
    where: { relatedReportId: id },
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
