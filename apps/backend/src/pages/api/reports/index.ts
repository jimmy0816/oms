import { IdService } from '@/services/idService';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  ApiResponse,
  PaginatedResponse,
  FileInfo,
  ReportStatus,
  Category,
} from 'shared-types';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { ActivityLogService } from '@/services/activityLogService';
import { notificationService } from '@/services/notificationService';
import { categoryService } from '@/services/categoryService'; // Import categoryService

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
  category?: string | null; // This will now store categoryId
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
  locationId?: string; // Changed to string
  priority?: string;
  categoryId?: string; // This will now be categoryId
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
  const status = req.query.status as string | string[] | undefined;
  const priority = req.query.priority as string | string[] | undefined;
  const categoryFilterId = req.query.categoryIds as string | string[] | undefined; // Changed to categoryIds for multi-select
  const assigneeId = req.query.assigneeId as string | undefined;
  const creatorId = req.query.creatorId as string | undefined;
  const search = req.query.search as string | undefined;
  const locationIds = req.query.locationIds as string | string[] | undefined;
  const sortField = req.query.sortField as string | undefined;
  const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

  const skip = (page - 1) * pageSize;

  const orderByClause: any = {};

  switch (sortField) {
    case 'id':
      orderByClause.id = sortOrder || 'asc';
      break;
    case 'title':
      orderByClause.title = sortOrder || 'asc';
      break;
    case 'status':
      orderByClause.status = sortOrder || 'asc';
      break;
    case 'category':
      orderByClause.category = { name: sortOrder || 'asc' }; // Assuming category is a direct field
      break;
    case 'priority':
      orderByClause.priority = sortOrder || 'asc';
      break;
    case 'location':
      orderByClause.location = { name: sortOrder || 'asc' };
      break;
    case 'createdAt':
      orderByClause.createdAt = sortOrder || 'asc';
      break;
    case 'creator':
      orderByClause.creator = { name: sortOrder || 'asc' };
      break;
    default:
      orderByClause.createdAt = 'desc'; // Default sort
      break;
  }

  // Build filter conditions
  const where: any = {};
  const andClauses = [];

  if (status) {
    const parsedStatus = Array.isArray(status) ? status : status.split(',');
    if (parsedStatus.length > 0) {
      andClauses.push({ status: { in: parsedStatus } });
    }
  }

  if (priority) {
    const parsedPriority = Array.isArray(priority)
      ? priority
      : priority.split(',');
    if (parsedPriority.length > 0) {
      andClauses.push({ priority: { in: parsedPriority } });
    }
  }

  if (assigneeId) andClauses.push({ assigneeId });
  if (creatorId) andClauses.push({ creatorId });

  if (locationIds) {
    const parsedLocationIds = Array.isArray(locationIds) ? locationIds : locationIds.split(',');
    if (parsedLocationIds.length > 0) {
      andClauses.push({ locationId: { in: parsedLocationIds } });
    }
  }

  // Handle category filtering by top-level category (now supports multiple categoryIds)
  if (categoryFilterId) {
    const parsedCategoryIds = Array.isArray(categoryFilterId)
      ? categoryFilterId
      : categoryFilterId.split(',');

    if (parsedCategoryIds.length > 0) {
      const allCategories = await categoryService.getAllCategories();
      const thirdLevelCategoryIds: string[] = [];

      parsedCategoryIds.forEach((filterId) => {
        const targetCategory = allCategories.find((cat) => cat.id === filterId);
        if (targetCategory) {
          const collectThirdLevelIds = (category: Category) => {
            if (category.level === 3) {
              thirdLevelCategoryIds.push(category.id);
            }
            if (category.children) {
              category.children.forEach(collectThirdLevelIds);
            }
          };
          collectThirdLevelIds(targetCategory);
        }
      });
      andClauses.push({ categoryId: { in: thirdLevelCategoryIds } });
    } else {
      andClauses.push({ categoryId: { in: [] } }); // Effectively returns no reports
    }
  }

  // 處理搜尋關鍵字
  if (search) {
    andClauses.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { name: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  // Get reports with pagination
  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: orderByClause,
      include: {
        location: true, // Include location data
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
    locationId,
    priority,
    categoryId,
    contactPhone,
    contactEmail,
    attachments = [],
    assigneeId,
    ticketIds = [],
  } = req.body as CreateReportRequest;

  const creatorId = req.user.id;
  const newId = await IdService.generateId('R');

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Title is required',
    });
  }

  // 1. 先建立 report
  const report = await prisma.report.create({
    data: {
      id: newId,
      title,
      description,
      locationId,
      priority: priority || 'MEDIUM',
      status: ReportStatus.UNCONFIRMED,
      creatorId,
      assigneeId,
      categoryId,
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
    const attachmentData = attachments.map((att: any) => ({
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

  // 4. Add notification for assignee if report is assigned on creation
  if (assigneeId) {
    await notificationService.create({
      title: '新通報已指派給您',
      message: `新通報「${report.title}」已指派給您。`,
      userId: assigneeId,
      relatedId: report.id,
      relatedType: 'REPORT',
    });
  }

  // 5. 回傳結果
  return res.status(201).json({
    success: true,
    data: report,
  });
}
