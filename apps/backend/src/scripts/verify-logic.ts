import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.development
const envPath = path.resolve(__dirname, '../../.env.development');
if (fs.existsSync(envPath)) {
  console.log('Loading .env.development...');
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} else {
  console.warn('.env.development file not found at ' + envPath);
}

const prisma = new PrismaClient();

// COPY OF THE LOGIC FROM categoryService.ts (to avoid import alias issues in script)
async function reorderCategories(
  updates: { id: string; displayOrder: number; parentId: string | null }[],
): Promise<void> {
  const updateOperations = async (update: {
    id: string;
    displayOrder: number;
    parentId: string | null;
  }) => {
    // 1. Calculate the new level based on the new parent
    let newLevel = 1;
    if (update.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: update.parentId },
      });
      if (parent) {
        newLevel = parent.level + 1;
      }
    }

    // 2. Fetch the current category to check if the level is changing
    const currentCategory = await prisma.category.findUnique({
      where: { id: update.id },
      select: { level: true },
    });

    const ops: any[] = [];

    // Update the category itself
    ops.push(
      prisma.category.update({
        where: { id: update.id },
        data: {
          displayOrder: update.displayOrder,
          parentId: update.parentId,
          level: newLevel,
        },
      }),
    );

    // 3. If level changes, recursively update children
    if (currentCategory && currentCategory.level !== newLevel) {
      const levelDiff = newLevel - currentCategory.level;
      const updateChildren = async (parentId: string, diff: number) => {
        const children = await prisma.category.findMany({
          where: { parentId },
        });
        for (const child of children) {
          ops.push(
            prisma.category.update({
              where: { id: child.id },
              data: { level: child.level + diff },
            }),
          );
          await updateChildren(child.id, diff);
        }
      };
      await updateChildren(update.id, levelDiff);
    }

    return ops;
  };

  const allOps = [];
  for (const update of updates) {
    const ops = await updateOperations(update);
    allOps.push(...ops);
  }

  await prisma.$transaction(allOps);
}

// Helper to create category
async function createCategory(
  name: string,
  parentId: string | null,
  level: number,
) {
  // Generate valid slug or allow default? Schema likely has defaults or we need to provide.
  // Assuming simple schema for now, but checking categoryService.ts logic:
  // createCategory calculates level.
  // We can just iterate prisma create directly.
  return prisma.category.create({
    data: {
      name,
      parentId,
      level, // We manually set it here for setup
      // displayOrder defaults?
      displayOrder: 0,
    },
  });
}

async function main() {
  console.log('--- Starting Verification ---');
  const prefix = 'TEST_V_' + Date.now();
  let root: any, child: any, grandChild: any;

  try {
    // Setup Hierarchy: Root(1) -> Child(2) -> GrandChild(3)
    root = await createCategory(prefix + '_Root', null, 1);
    child = await createCategory(prefix + '_Child', root.id, 2);
    grandChild = await createCategory(prefix + '_GrandChild', child.id, 3);

    console.log(
      `Created: Root(${root.level}), Child(${child.level}), GrandChild(${grandChild.level})`,
    );

    // TEST 1: Move Child to Root Level
    console.log('--- TEST 1: Moving Child to Top Level (Level 1) ---');
    await reorderCategories([
      {
        id: child.id,
        parentId: null,
        displayOrder: 10,
      },
    ]);

    // Re-fetch
    child = await prisma.category.findUnique({ where: { id: child.id } });
    grandChild = await prisma.category.findUnique({
      where: { id: grandChild.id },
    });

    console.log(
      `New Levels: Child(${child.level}), GrandChild(${grandChild.level})`,
    );

    if (child.level !== 1)
      throw new Error(`Child level incorrect. Expected 1, got ${child.level}`);
    if (grandChild.level !== 2)
      throw new Error(
        `GrandChild level incorrect. Expected 2, got ${grandChild.level} (Did recursion work?)`,
      );

    // TEST 2: Move Child back to be child of Root
    console.log('--- TEST 2: Moving Child back under Root (Level 2) ---');
    await reorderCategories([
      {
        id: child.id,
        parentId: root.id,
        displayOrder: 0,
      },
    ]);

    child = await prisma.category.findUnique({ where: { id: child.id } });
    grandChild = await prisma.category.findUnique({
      where: { id: grandChild.id },
    });

    console.log(
      `New Levels: Child(${child.level}), GrandChild(${grandChild.level})`,
    );

    if (child.level !== 2)
      throw new Error(`Child level incorrect. Expected 2, got ${child.level}`);
    if (grandChild.level !== 3)
      throw new Error(
        `GrandChild level incorrect. Expected 3, got ${grandChild.level}`,
      );

    console.log('--- ALL TESTS PASSED ---');
  } catch (e) {
    console.error('TEST FAILED:', e);
    process.exit(1);
  } finally {
    console.log('Cleaning up...');
    if (grandChild)
      await prisma.category
        .delete({ where: { id: grandChild.id } })
        .catch(() => {});
    if (child)
      await prisma.category.delete({ where: { id: child.id } }).catch(() => {});
    if (root)
      await prisma.category.delete({ where: { id: root.id } }).catch(() => {});
    await prisma.$disconnect();
  }
}

main();
