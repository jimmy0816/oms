import { withApiHandler } from '@/lib/api-handler';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'prisma-client';
import { ApiResponse, PaginatedResponse } from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';

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
}

// Define CreateReportRequest type
interface CreateReportRequest {
  title: string;
  description: string;
  location?: string;
  priority?: string;
  category?: string;
  contactPhone?: string;
  contactEmail?: string;
  images?: string[];
  assigneeId?: string;
}

export default withApiHandler(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report | PaginatedResponse<Report>>>
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getReports(req, res);
      case 'POST':
        return await withAuth(createReport)(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res
          .status(405)
          .json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error in reports API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
});

async function getReports(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaginatedResponse<Report>>>
) {
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;
  const category = req.query.category as string | undefined;
  const assigneeId = req.query.assigneeId as string | undefined;
  const creatorId = req.query.creatorId as string | undefined;
  const search = req.query.search as string | undefined;

  const skip = (page - 1) * pageSize;

  // Build filter conditions
  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (assigneeId) where.assigneeId = assigneeId;
  if (creatorId) where.creatorId = creatorId;
  
  // 處理搜尋關鍵字
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get reports with pagination
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.report.count({ where }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

async function createReport(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<Report>>
) {
  const {
    title,
    description,
    location,
    priority,
    category,
    contactPhone,
    contactEmail,
    images = [],
    assigneeId,
  } = req.body as CreateReportRequest;

  // In a real app, you would get the creator ID from the authenticated user
  // For this prototype, we'll use a mock user ID or the one provided in headers
  const creatorId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      error: 'Title and description are required',
    });
  }

  const report = await prisma.report.create({
    data: {
      title,
      description,
      location,
      priority: priority || 'MEDIUM',
      status: 'PENDING', // 設置默認狀態為待處理
      creatorId,
      assigneeId,
      category,
      contactPhone,
      contactEmail,
      images,
    },
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

  // Create a notification for the assignee if one is assigned
  if (assigneeId) {
    await prisma.notification.create({
      data: {
        title: 'New Report Assigned',
        message: `You have been assigned a new report: ${title}`,
        userId: assigneeId,
        relatedReportId: report.id,
      },
    });
  }

  return res.status(201).json({
    success: true,
    data: report,
  });
}
