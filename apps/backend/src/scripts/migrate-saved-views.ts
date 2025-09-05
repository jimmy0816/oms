import { PrismaClient, SavedViewType } from '@prisma/client';

const prisma = new PrismaClient();

// Proposed Unified Filter Structure
interface UnifiedFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  creatorIds?: string[];
  assigneeIds?: string[];
  locationIds?: string[];
  categoryIds?: string[];
  roleIds?: string[];
  dateRange?: (string | Date)[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// Mappings from old keys to new keys
const reportKeyMapping: { [key: string]: keyof UnifiedFilters } = {
  searchTerm: 'search',
  statusFilter: 'status',
  priorityFilter: 'priority',
  creatorFilter: 'creatorIds',
  locationFilter: 'locationIds',
  categoryFilter: 'categoryIds',
  dateRange: 'dateRange',
  sortField: 'sortField',
  sortOrder: 'sortOrder',
};

const ticketKeyMapping: { [key: string]: keyof UnifiedFilters } = {
  search: 'search',
  status: 'status',
  priority: 'priority',
  creatorIds: 'creatorIds',
  assigneeIds: 'assigneeIds',
  locationIds: 'locationIds',
  roleIds: 'roleIds',
  dateRange: 'dateRange',
  sortField: 'sortField',
  sortOrder: 'sortOrder',
};

async function migrateSavedViews() {
  console.log('Starting migration of SavedView filters...');

  const savedViews = await prisma.savedView.findMany();
  let updatedCount = 0;

  for (const view of savedViews) {
    const oldFilters = view.filters as any;
    if (!oldFilters || typeof oldFilters !== 'object') {
      console.log(`Skipping view ${view.id} as filters are invalid.`);
      continue;
    }

    const unifiedFilters: UnifiedFilters = {};
    const keyMapping =
      view.viewType === SavedViewType.REPORT
        ? reportKeyMapping
        : ticketKeyMapping;

    let hasChanged = false;
    for (const oldKey in oldFilters) {
      if (Object.prototype.hasOwnProperty.call(oldFilters, oldKey)) {
        const newKey = keyMapping[oldKey];
        if (newKey) {
          // If the new key is different from the old key, it means a migration is needed.
          if (newKey !== oldKey) {
            hasChanged = true;
          }
          unifiedFilters[newKey] = oldFilters[oldKey];
        } else {
          // If there's no mapping, it might be a field that is already correct or one we are dropping.
          // For safety, we can carry it over if it exists in the unified structure definition.
          if (oldKey in unifiedFilters) {
            unifiedFilters[oldKey as keyof UnifiedFilters] = oldFilters[oldKey];
          }
        }
      }
    }

    // Another check to see if any of the old keys exist, which indicates the old format.
    const oldKeys = Object.keys(
      view.viewType === SavedViewType.REPORT
        ? reportKeyMapping
        : ticketKeyMapping
    );
    const currentFilterKeys = Object.keys(oldFilters);
    if (!hasChanged) {
      hasChanged = currentFilterKeys.some(
        (k) =>
          oldKeys.includes(k) &&
          (reportKeyMapping[k] !== k || ticketKeyMapping[k] !== k)
      );
    }

    if (hasChanged) {
      try {
        await prisma.savedView.update({
          where: { id: view.id },
          data: { filters: unifiedFilters as any },
        });
        console.log(
          `Successfully migrated SavedView ${view.id} (${view.name}).`
        );
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update SavedView ${view.id}. Error:`, error);
      }
    } else {
      console.log(
        `Skipping SavedView ${view.id} (${view.name}) as it seems to be in the new format already.`
      );
    }
  }

  console.log(
    `Migration complete. Total views processed: ${savedViews.length}. Updated views: ${updatedCount}.`
  );
}

migrateSavedViews()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
