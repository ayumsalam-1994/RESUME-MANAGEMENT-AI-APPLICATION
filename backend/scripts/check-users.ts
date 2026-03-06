import { prisma } from "../src/db/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  
  console.log(`Found ${users.length} user(s):`);
  users.forEach(u => console.log(`- ${u.email} (${u.name})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
