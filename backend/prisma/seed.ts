import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// DATABASE_URL dựng từ POSTGRES_* giống env.config.ts / prisma.config.ts.
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}` +
    `@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
});

// userId truyền vào: ưu tiên env SEED_USER_ID, fallback CLI arg cuối cùng.
//   SEED_USER_ID=<userId> npx prisma db seed
//   ts-node prisma/seed.ts <userId>
function resolveUserId(): string {
  const lastArg = process.argv[process.argv.length - 1];
  // const id =
  //   process.env.SEED_USER_ID || (lastArg?.includes('seed') ? '' : lastArg);
  // if (!id) {
  //   throw new Error(
  //     'Thiếu userId. Dùng: SEED_USER_ID=<userId> npx prisma db seed  hoặc  ts-node prisma/seed.ts <userId>',
  //   );
  // }
  return lastArg;
}

async function main() {
  const id = resolveUserId();
  // Bắt buộc user phải tồn tại — document FK tới user thật (đã đăng nhập Firebase).
  const user = await prisma.user.findFirst({ where: { id: id } });
  console.log('>>>', user);
  if (!user) {
    const others = await prisma.user.findMany({
      select: { id: true, email: true },
      take: 10,
    });
    console.error(`❌ Không tìm thấy user id=${id}`);
    if (others.length) {
      console.error('   User hiện có:');
      others.forEach((u) => console.error(`     ${u.id}  ${u.email}`));
    } else {
      console.error(
        '   DB chưa có user nào — đăng nhập web 1 lần để tạo user trước.',
      );
    }
    process.exitCode = 1;
    return;
  }

  // 1) Collection chứa document — idempotent theo (userId, name).
  const collectionName = 'Seed Collection';
  let collection = await prisma.collection.findFirst({
    where: { id, name: collectionName },
  });
  if (!collection) {
    collection = await prisma.collection.create({
      data: {
        userId: id,
        name: collectionName,
        description: 'Seeded documents for development',
        icon: '🧪',
        color: '#6366f1',
      },
    });
  }

  // 2) Documents — phủ đủ sourceType (pdf/docx/url) và status (ready/parsing/failed).
  //    Idempotent: dedupe theo (collectionId, key) — originalName cho file, sourceUrl cho url.
  // const docs = [
  //   {
  //     key: 'bullmq-guide.pdf',
  //     sourceType: 'pdf' as const,
  //     originalName: 'bullmq-guide.pdf',
  //     rawPath: `raw/${userId}/bullmq-guide.pdf`,
  //     textPath: `text/${userId}/bullmq-guide/full.txt`,
  //     status: 'ready' as const,
  //     pageCount: 24,
  //     chunkCount: 42,
  //     byteSize: BigInt(1_842_113),
  //     metadata: { author: 'OptimalBits', title: 'BullMQ Guide' },
  //   },
  //   {
  //     key: 'es-hybrid-search.docx',
  //     sourceType: 'docx' as const,
  //     originalName: 'es-hybrid-search.docx',
  //     rawPath: `raw/${userId}/es-hybrid-search.docx`,
  //     status: 'processing' as const,
  //     byteSize: BigInt(512_000),
  //   },
  //   {
  //     key: 'https://www.elastic.co/what-is/vector-search',
  //     sourceType: 'url' as const,
  //     sourceUrl: 'https://www.elastic.co/what-is/vector-search',
  //     status: 'failed' as const,
  //     errorMessage: 'fetch timeout after 30s',
  //   },
  //   {
  //     key: 'rag-survey-2023.pdf',
  //     sourceType: 'pdf' as const,
  //     originalName: 'rag-survey-2023.pdf',
  //     rawPath: `raw/${userId}/rag-survey-2023.pdf`,
  //     textPath: `text/${userId}/rag-survey-2023/full.txt`,
  //     status: 'ready' as const,
  //     pageCount: 31,
  //     chunkCount: 58,
  //     byteSize: BigInt(2_201_990),
  //     metadata: { author: 'Gao et al.', title: 'RAG: A Survey' },
  //   },
  // ];
  //
  // let created = 0;
  // let readyDocId: string | null = null;
  // for (const { key, ...data } of docs) {
  //   const existing = await prisma.document.findFirst({
  //     where: {
  //       collectionId: collection.id,
  //       ...(data.sourceType === 'url'
  //         ? { sourceUrl: key }
  //         : { originalName: key }),
  //     },
  //     select: { id: true },
  //   });
  //
  //   const doc =
  //     existing ??
  //     (await prisma.document.create({
  //       data: { userId, collectionId: collection.id, ...data },
  //       select: { id: true },
  //     }));
  //   if (!existing) created++;
  //   if (data.status === 'ready' && !readyDocId) readyDocId = doc.id;
  // }
  //
  // // 3) ChunkMeta cho 1 document ready (exercise viewer/citation). Unique (documentId, chunkIndex).
  // if (readyDocId) {
  //   for (let i = 0; i < 5; i++) {
  //     await prisma.chunkMeta.upsert({
  //       where: {
  //         documentId_chunkIndex: { documentId: readyDocId, chunkIndex: i },
  //       },
  //       create: {
  //         documentId: readyDocId,
  //         chunkIndex: i,
  //         page: Math.floor(i / 2) + 1,
  //         charStart: i * 800,
  //         charEnd: i * 800 + 780,
  //         tokenCount: 190,
  //       },
  //       update: {},
  //     });
  //   }
  // }
  //
  // console.log('✅ Seed done.');
  console.log(`   user:       ${user.email} (${user.id})`);
  console.log(`   collection: ${collection.name} (${collection.id})`);
  // console.log(
  //   `   documents:  ${created} created, ${docs.length - created} đã có sẵn`,
  // );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
