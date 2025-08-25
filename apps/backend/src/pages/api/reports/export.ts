import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withPermission } from '@/middleware/auth';
import { Permission, ReportStatus, ReportPriority } from 'shared-types';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

// Helper functions
const getStatusName = (status: ReportStatus) => {
  switch (status) {
    case ReportStatus.UNCONFIRMED:
      return '未確認';
    case ReportStatus.PROCESSING:
      return '處理中';
    case ReportStatus.REJECTED:
      return '不處理';
    case ReportStatus.PENDING_REVIEW:
      return '待審核';
    case ReportStatus.REVIEWED:
      return '已歸檔';
    case ReportStatus.RETURNED:
      return '已退回';
    default:
      return '未知狀態';
  }
};

const getPriorityText = (priority: ReportPriority) => {
  switch (priority) {
    case ReportPriority.LOW:
      return '低';
    case ReportPriority.MEDIUM:
      return '中';
    case ReportPriority.HIGH:
      return '高';
    case ReportPriority.URGENT:
      return '緊急';
    default:
      return priority;
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      status,
      priority,
      categoryIds: categoryFilterId,
      assigneeId,
      creatorIds,
      search,
      locationIds,
      sortField,
      sortOrder,
      startDate,
      endDate,
    } = req.body;

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
        orderByClause.category = { name: sortOrder || 'asc' };
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
      case 'trackingDate':
        orderByClause.trackingDate = sortOrder || 'asc';
        break;
      default:
        orderByClause.createdAt = 'desc';
        break;
    }

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
    if (creatorIds) {
      const parsedCreatorIds = Array.isArray(creatorIds)
        ? creatorIds
        : creatorIds.split(',');
      if (parsedCreatorIds.length > 0) {
        andClauses.push({ creatorId: { in: parsedCreatorIds } });
      }
    }

    if (locationIds) {
      const parsedLocationIds = Array.isArray(locationIds)
        ? locationIds
        : locationIds.split(',');
      if (parsedLocationIds.length > 0) {
        andClauses.push({ locationId: { in: parsedLocationIds } });
      }
    }

    if (categoryFilterId) {
      const parsedCategoryIds = Array.isArray(categoryFilterId)
        ? categoryFilterId
        : categoryFilterId.split(',');

      if (parsedCategoryIds.length > 0) {
        andClauses.push({ categoryId: { in: parsedCategoryIds } });
      }
    }

    if (search) {
      andClauses.push({
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { name: { contains: search, mode: 'insensitive' } } },
          { creator: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: orderByClause,
      include: {
        location: true,
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
        category: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reports');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: '標題', key: 'title', width: 30 },
      { header: '描述', key: 'description', width: 50 },
      { header: '狀態', key: 'status', width: 15 },
      { header: '優先級', key: 'priority', width: 15 },
      { header: '分類', key: 'category', width: 20 },
      { header: '位置', key: 'location', width: 20 },
      { header: '通報人', key: 'creator', width: 20 },
      { header: '負責人', key: 'assignee', width: 20 },
      { header: '建立時間', key: 'createdAt', width: 20 },
      { header: '更新日期', key: 'updatedAt', width: 20 },
      { header: '追蹤日期', key: 'trackingDate', width: 20 },
    ];

    reports.forEach((report) => {
      worksheet.addRow({
        id: report.id,
        title: report.title,
        description: report.description,
        status: getStatusName(report.status as ReportStatus),
        priority: getPriorityText(report.priority as ReportPriority),
        category: report.category?.name || 'N/A',
        location: report.location?.name || 'N/A',
        creator: report.creator?.name || 'N/A',
        assignee: report.assignee?.name || 'N/A',
        createdAt: format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        updatedAt: format(new Date(report.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
        trackingDate: report.trackingDate ? format(new Date(report.trackingDate), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'reports.xlsx'
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error: any) {
    console.error('Error in reports export API:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error',
    });
  }
}

export default withPermission(Permission.EXPORT_REPORTS)(handler);
