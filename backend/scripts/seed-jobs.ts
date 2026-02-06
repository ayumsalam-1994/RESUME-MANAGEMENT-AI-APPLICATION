import { prisma } from "../src/db/prisma";

const STATUSES = [
  "draft",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn"
];

const SAMPLE_TITLES = [
  "Frontend Developer",
  "Backend Engineer",
  "Full Stack Engineer",
  "QA Engineer",
  "DevOps Engineer",
  "Product Engineer",
  "Data Analyst",
  "Mobile Developer",
  "Software Engineer",
  "UI/UX Engineer"
];

const SAMPLE_PLATFORMS = ["LinkedIn", "Indeed", "Company Website", "Referral"];

const SAMPLE_COMPANIES = [
  "Acme Tech",
  "Nimbus Labs",
  "VertexSoft",
  "BluePeak Systems",
  "QuantumWorks",
  "BrightHive",
  "NovaCore",
  "Redwood Apps",
  "Cobalt Dynamics",
  "Summit AI"
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getOrCreateCompany(name: string) {
  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.company.create({ data: { name } });
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@gmail.com" }
  });

  if (!admin) {
    throw new Error("User admin@gmail.com not found. Please create this user first.");
  }

  const created: number[] = [];

  for (let i = 0; i < 30; i++) {
    const status = STATUSES[i % STATUSES.length];
    const title = `${randomFrom(SAMPLE_TITLES)} ${i + 1}`;
    const companyName = SAMPLE_COMPANIES[i % SAMPLE_COMPANIES.length];
    const company = await getOrCreateCompany(companyName);

    const jobDescription = `This is a sample job description for ${title} at ${companyName}. Responsibilities include building features, collaborating with teams, and improving system quality.`;

    const platform = randomFrom(SAMPLE_PLATFORMS);

    const job = await prisma.jobApplication.create({
      data: {
        userId: admin.id,
        companyId: company.id,
        jobTitle: title,
        jobDescription,
        platform,
        applicationUrl: `https://example.com/jobs/${i + 1}`,
        status,
        notes: "Seeded for demo preview",
        dateApplied: status === "draft" ? null : new Date()
      }
    });

    created.push(job.id);
  }

  console.log(`Seeded ${created.length} job applications for admin@gmail.com.`);
  console.log(`Statuses used: ${STATUSES.join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
