import { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { TicketStatus } from 'shared-types';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { id } = req.query;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { content, attachments, finalStatus } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const targetStatus = finalStatus === 'FAILED' ? TicketStatus.FAILED : TicketStatus.COMPLETED;

    try {
      const ticketReview = await prisma.ticketReview.create({
        data: {
          content,
          ticket: {
            connect: { id: id as string },
          },
          creator: {
            connect: { id: user.id },
          },
        },
      });

      if (attachments && attachments.length > 0) {
        await prisma.attachment.createMany({
          data: attachments.map((att: any) => ({
            filename: att.filename,
            url: att.url,
            fileType: att.fileType,
            fileSize: att.fileSize,
            parentId: ticketReview.id,
            parentType: 'TicketReview',
            createdById: user.id,
          })),
        });
      }

      await prisma.ticket.update({
        where: { id: id as string },
        data: { status: targetStatus },
      });

      // Add activity log
      const logContent = targetStatus === TicketStatus.FAILED 
        ? '工單無法完成，提交工單審核，等待審核' 
        : '工單處理完成，提交工單審核，等待審核';

      await prisma.activityLog.create({
        data: {
          content: logContent,
          userId: user.id,
          parentId: id as string,
          parentType: 'TICKET',
        },
      });

      // Create notification for the ticket creator
      const ticket = await prisma.ticket.findUnique({
        where: { id: id as string },
        select: { creatorId: true },
      });

      if (ticket && ticket.creatorId) {
        await prisma.notification.create({
          data: {
            title: `工單 #${(id as string).substring(0, 8)} 已提交審核`,
            message: `${user.name} 已完成工單處理並提交審核。`,
            userId: ticket.creatorId,
            relatedId: id as string,
            relatedType: 'TICKET',
          },
        });
      }

      res.status(201).json(ticketReview);
    } catch (error) {
      console.error('Failed to create ticket review:', error);
      res.status(500).json({ error: 'Failed to create ticket review' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withAuth(handler);
