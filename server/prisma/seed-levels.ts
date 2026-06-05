import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getDifficultyWeights(level: number): {
  easyWeight: number;
  mediumWeight: number;
  hardWeight: number;
} {
  // Gradual difficulty progression across 50 levels
  if (level <= 8)  return { easyWeight: 100, mediumWeight: 0,   hardWeight: 0   };
  if (level <= 16) return { easyWeight: 60,  mediumWeight: 40,  hardWeight: 0   };
  if (level <= 24) return { easyWeight: 20,  mediumWeight: 80,  hardWeight: 0   };
  if (level <= 32) return { easyWeight: 0,   mediumWeight: 60,  hardWeight: 40  };
  if (level <= 40) return { easyWeight: 0,   mediumWeight: 20,  hardWeight: 80  };
  return              { easyWeight: 0,   mediumWeight: 0,   hardWeight: 100 };
}

async function main() {
  console.log('Seeding 50 level configurations...');

  for (let level = 1; level <= 50; level++) {
    const weights = getDifficultyWeights(level);
    await prisma.levelConfig.upsert({
      where: { levelNumber: level },
      update: weights,
      create: {
        levelNumber: level,
        subLevelCount: 6,
        questionsPerSublevel: 20,
        ...weights,
        isActive: true,
      },
    });
    process.stdout.write(`\r  Level ${level}/50 configured`);
  }

  console.log('\nDone! 50 levels ready.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
