import { prisma } from "../src/db/prisma";

async function check() {
  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
    education: await prisma.education.count(),
    skills: await prisma.skill.count(),
    userSkills: await prisma.userSkill.count(),
    experiences: await prisma.experience.count(),
    experienceBullets: await prisma.experienceBullet.count(),
    projects: await prisma.project.count(),
    projectBullets: await prisma.projectBullet.count(),
    certifications: await prisma.certification.count(),
    companies: await prisma.company.count(),
    jobApplications: await prisma.jobApplication.count(),
    interviews: await prisma.interview.count(),
    reminders: await prisma.reminder.count(),
    statusHistory: await prisma.statusHistory.count()
  };

  console.log("\n📊 Database Record Counts:");
  console.log("══════════════════════════");
  Object.entries(counts).forEach(([key, count]) => {
    console.log(`  ${key.padEnd(20)} : ${count}`);
  });
  console.log("══════════════════════════\n");

  await prisma.$disconnect();
}

check().catch(console.error);
