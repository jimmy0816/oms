import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Attachment } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Zod schema for query parameter validation
const QuerySchema = z.object({
  locationIds: z.string().optional(),
  page: z.string().optional().default('1'),
  pageSize: z.string().optional().default('10'),
  sortField: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Define the structure of the response data
export interface PublicReport {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  location: {
    id: string;
    name: string;
  } | null;
  attachments: Attachment[];
}

export interface PaginatedPublicReportsResponse {
  items: PublicReport[];
  total: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedPublicReportsResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const validation = QuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid query parameters.' });
    }

    const {
      locationIds,
      page: pageStr,
      pageSize: pageSizeStr,
      sortField,
      sortOrder,
    } = validation.data;

    const page = parseInt(pageStr, 10);
    const pageSize = parseInt(pageSizeStr, 10);
    const skip = (page - 1) * pageSize;

    // 1. Find parent categories
    const parentCategories = await prisma.category.findMany({
      where: {
        name: { in: ['我拾獲別人的東西'] },
      },
    });
    if (parentCategories.length === 0) {
      return res.status(200).json({ items: [], total: 0 });
    }
    const categoryIds = parentCategories.map((c) => c.id);

    // 3. Build the query for reports
    const whereClause: any = { categoryId: { in: categoryIds } };
    if (locationIds) {
      const locationIdArray = locationIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id);
      if (locationIdArray.length > 0) {
        whereClause.locationId = { in: locationIdArray };
      }
    }

    // 4. Sorting logic
    const orderBy: any = {};
    if (sortField === 'location') {
      orderBy.location = { name: sortOrder };
    } else if (['id', 'createdAt'].includes(sortField)) {
      orderBy[sortField] = sortOrder;
    }

    // 5. Fetch total count and reports in parallel
    const [total, reports] = await prisma.$transaction([
      prisma.report.count({ where: whereClause }),
      prisma.report.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          location: { select: { id: true, name: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    // 6. Fetch attachments for the fetched reports
    const reportIds = reports.map((r) => r.id);
    const attachments = await prisma.attachment.findMany({
      where: {
        parentId: { in: reportIds },
        parentType: 'REPORT',
      },
    });

    // 7. Map attachments to reports
    const reportsWithAttachments = reports.map((report) => ({
      ...report,
      attachments: attachments.filter((a) => a.parentId === report.id),
    }));

    res.status(200).json({ items: reportsWithAttachments, total });
  } catch (error) {
    console.error('Failed to fetch public reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await prisma.$disconnect();
  }
}
