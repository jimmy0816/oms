import { NextApiRequest, NextApiResponse } from 'next';
import {
  ApiResponse,
  PaginatedResponse,
  FileInfo,
  ReportStatus,
} from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { ActivityLogService } from '@/services/activityLogService';

// Define Report type based on Prisma schema (updated to include attachments)
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
  attachments?: FileInfo[]; // New attachments field
  category?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  creator?: {
    id: string;
    name: true;
    email: true;
  };
  assignee?: {
    id: string;
    name: true;
    email: true;
  } | null;
}

// Define CreateReportRequest type (updated to include attachments)
interface CreateReportRequest {
  title: string;
  description: string;
  location?: string;
  priority?: string;
  category?: string;
  contactPhone?: string;
  contactEmail?: string;
  attachments?: FileInfo[]; // New attachments field
  assigneeId?: string;
  ticketIds?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Report | PaginatedResponse<Report>>>
) {
  console.log('API /api/reports handler called', req.method, req.url);

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
}

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
    attachments = [],
    assigneeId,
    ticketIds = [],
  } = req.body as CreateReportRequest;

  const creatorId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      error: 'Title and description are required',
    });
  }

  // 1. 先建立 report
  const report = await prisma.report.create({
    data: {
      title,
      description,
      location,
      priority: priority || 'MEDIUM',
      status: ReportStatus.UNCONFIRMED,
      creatorId,
      assigneeId,
      category,
      contactPhone,
      contactEmail,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // 2. 建立歷程紀錄
  await ActivityLogService.createActivityLog(
    `建立通報`,
    creatorId,
    report.id,
    'REPORT'
  );

  // 3. 建立附件資料
  if (attachments.length > 0) {
    const attachmentData = attachments.map((att) => ({
      filename: att.name,
      url: att.url,
      fileType: att.type,
      fileSize: att.size,
      createdById: creatorId,
      parentId: report.id,
      parentType: 'REPORT',
    }));
    await prisma.attachment.createMany({
      data: attachmentData,
    });
  }

  // 4. 回傳結果
  return res.status(201).json({
    success: true,
    data: report,
  });
}
