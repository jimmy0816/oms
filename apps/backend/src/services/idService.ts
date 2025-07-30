import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export const IdService = {
  async generateId(prefix: 'R' | 'W'): Promise<string> {
    const modelName = prefix === 'R' ? 'Report' : 'Ticket';
    const today = format(new Date(), 'yyMMdd');

    return await prisma.$transaction(async (tx) => {
      const sequenceEntry = await tx.idSequence.findUnique({
        where: { modelName_date: { modelName, date: today } },
      });

      let newSequence = 1;
      if (sequenceEntry) {
        newSequence = sequenceEntry.sequence + 1;
        await tx.idSequence.update({
          where: { id: sequenceEntry.id },
          data: { sequence: newSequence },
        });
      } else {
        await tx.idSequence.create({
          data: {
            id: `${modelName}-${today}`,
            modelName,
            date: today,
            sequence: newSequence,
          },
        });
      }

      const year = format(new Date(), 'yy');
      const monthDay = format(new Date(), 'MMdd');
      const sequenceString = String(newSequence).padStart(5, '0');

      return `${prefix}${year}${monthDay}${sequenceString}`;
    });
  },
};
