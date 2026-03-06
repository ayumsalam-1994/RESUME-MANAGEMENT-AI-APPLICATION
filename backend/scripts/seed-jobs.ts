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

const TECH_SKILLS = [
  "JavaScript", "TypeScript", "React", "Angular", "Vue.js", 
  "Node.js", "Express", "Python", "Django", "FastAPI",
  "Java", "Spring Boot", "MySQL", "PostgreSQL", "MongoDB",
  "Docker", "Kubernetes", "AWS", "GCP", "Azure",
  "Git", "CI/CD", "REST API", "GraphQL", "Redis"
];

const SOFT_SKILLS = [
  "Communication", "Leadership", "Problem Solving", 
  "Team Collaboration", "Time Management", "Critical Thinking"
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function getOrCreateCompany(name: string) {
  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.company.create({ data: { name } });
}

async function main() {
  let admin = await prisma.user.findUnique({
    where: { email: "admin@gmail.com" }
  });

  if (!admin) {
    console.log("Creating admin@gmail.com user...");
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash("Admin123!", 10);
    
    admin = await prisma.user.create({
      data: {
        email: "admin@gmail.com",
        password: hashedPassword,
        name: "Admin User",
        role: "user"
      }
    });
    console.log("✓ Admin user created successfully");
  }

  // 1. Create Profile
  console.log("\n📋 Creating profile...");
  let profile = await prisma.profile.findUnique({ where: { userId: admin.id } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: admin.id,
        email: "admin@gmail.com",
        phone: "+60 12-345 6789",
        linkedin: "https://linkedin.com/in/admin-user",
        github: "https://github.com/adminuser",
        portfolio: "https://adminuser.dev",
        location: "Kuala Lumpur, Malaysia",
        summary: "Experienced software engineer with 5+ years in full-stack development. Passionate about building scalable applications and mentoring junior developers."
      }
    });
    console.log("✓ Profile created");
  }

  // 2. Create Education
  console.log("\n🎓 Creating education records...");
  const existingEducation = await prisma.education.count({ where: { profileId: profile.id } });
  if (existingEducation === 0) {
    await prisma.education.createMany({
      data: [
        {
          profileId: profile.id,
          institution: "University of Malaya",
          degree: "Bachelor of Computer Science",
          field: "Software Engineering",
          startDate: new Date("2016-09-01"),
          endDate: new Date("2020-06-01"),
          current: false,
          description: "Focused on software engineering, data structures, and algorithms. Graduated with First Class Honours."
        },
        {
          profileId: profile.id,
          institution: "Sunway University",
          degree: "Diploma in Information Technology",
          field: "Computer Science",
          startDate: new Date("2014-06-01"),
          endDate: new Date("2016-05-01"),
          current: false,
          description: "Foundation in programming, databases, and web development."
        }
      ]
    });
    console.log("✓ 2 education records created");
  }

  // 3. Create Skills
  console.log("\n💡 Creating skills...");
  const skills = [];
  for (const skillName of [...TECH_SKILLS, ...SOFT_SKILLS]) {
    let skill = await prisma.skill.findUnique({ where: { name: skillName } });
    if (!skill) {
      skill = await prisma.skill.create({
        data: {
          name: skillName,
          category: TECH_SKILLS.includes(skillName) ? "Technical" : "Soft"
        }
      });
    }
    skills.push(skill);
  }
  console.log(`✓ ${skills.length} skills created`);

  // 4. Link Skills to User
  console.log("\n🔗 Linking skills to user...");
  const existingUserSkills = await prisma.userSkill.count({ where: { userId: admin.id } });
  if (existingUserSkills === 0) {
    const levels = ["Beginner", "Intermediate", "Advanced", "Expert"];
    const selectedSkills = skills.slice(0, 15); // Select first 15 skills
    for (const skill of selectedSkills) {
      await prisma.userSkill.create({
        data: {
          userId: admin.id,
          skillId: skill.id,
          level: randomFrom(levels)
        }
      });
    }
    console.log(`✓ ${selectedSkills.length} user skills linked`);
  }

  // 5. Create Experiences with Bullets
  console.log("\n💼 Creating work experiences...");
  const existingExperiences = await prisma.experience.count({ where: { userId: admin.id } });
  if (existingExperiences === 0) {
    const exp1 = await prisma.experience.create({
      data: {
        userId: admin.id,
        company: "Tech Solutions Sdn Bhd",
        position: "Senior Full Stack Developer",
        location: "Kuala Lumpur, Malaysia",
        startDate: new Date("2021-06-01"),
        endDate: null,
        current: true,
        description: "Leading development of enterprise web applications"
      }
    });
    await prisma.experienceBullet.createMany({
      data: [
        { experienceId: exp1.id, content: "Led team of 5 developers in building a customer management platform serving 10,000+ users", order: 0 },
        { experienceId: exp1.id, content: "Reduced application load time by 40% through code optimization and caching strategies", order: 1 },
        { experienceId: exp1.id, content: "Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes", order: 2 },
        { experienceId: exp1.id, content: "Mentored 3 junior developers, conducting code reviews and pair programming sessions", order: 3 }
      ]
    });

    const exp2 = await prisma.experience.create({
      data: {
        userId: admin.id,
        company: "StartupHub Malaysia",
        position: "Full Stack Developer",
        location: "Petaling Jaya, Malaysia",
        startDate: new Date("2020-07-01"),
        endDate: new Date("2021-05-01"),
        current: false,
        description: "Built and maintained multiple client projects"
      }
    });
    await prisma.experienceBullet.createMany({
      data: [
        { experienceId: exp2.id, content: "Developed 5+ responsive web applications using React and Node.js", order: 0 },
        { experienceId: exp2.id, content: "Collaborated with UX designers to implement pixel-perfect interfaces", order: 1 },
        { experienceId: exp2.id, content: "Integrated third-party APIs including payment gateways and social media platforms", order: 2 }
      ]
    });

    console.log("✓ 2 experiences with bullets created");
  }

  // 6. Create Projects with Bullets
  console.log("\n🚀 Creating projects...");
  const existingProjects = await prisma.project.count({ where: { userId: admin.id } });
  if (existingProjects === 0) {
    const proj1 = await prisma.project.create({
      data: {
        userId: admin.id,
        title: "E-Commerce Platform",
        summary: "Full-featured online shopping platform with real-time inventory management",
        description: "Built a scalable e-commerce solution handling 1000+ daily transactions",
        role: "Lead Developer",
        techStack: JSON.stringify(["React", "Node.js", "MongoDB", "Redis", "AWS"]),
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-08-01"),
        url: "https://github.com/adminuser/ecommerce-platform",
        archived: false,
        order: 0
      }
    });
    await prisma.projectBullet.createMany({
      data: [
        { projectId: proj1.id, content: "Implemented shopping cart with Redis caching for 50% faster checkout", order: 0 },
        { projectId: proj1.id, content: "Built admin dashboard for inventory and order management", order: 1 },
        { projectId: proj1.id, content: "Integrated Stripe payment gateway with webhook handling", order: 2 }
      ]
    });

    const proj2 = await prisma.project.create({
      data: {
        userId: admin.id,
        title: "Task Management App",
        summary: "Collaborative task tracking with real-time updates",
        description: "Real-time task management application for teams",
        role: "Full Stack Developer",
        techStack: JSON.stringify(["Angular", "Express", "PostgreSQL", "Socket.io"]),
        startDate: new Date("2022-06-01"),
        endDate: new Date("2022-12-01"),
        url: "https://github.com/adminuser/task-manager",
        archived: false,
        order: 1
      }
    });
    await prisma.projectBullet.createMany({
      data: [
        { projectId: proj2.id, content: "Real-time collaboration using WebSockets for instant updates", order: 0 },
        { projectId: proj2.id, content: "Drag-and-drop interface with smooth animations", order: 1 }
      ]
    });

    console.log("✓ 2 projects with bullets created");
  }

  // 7. Create Certifications
  console.log("\n📜 Creating certifications...");
  const existingCerts = await prisma.certification.count({ where: { userId: admin.id } });
  if (existingCerts === 0) {
    await prisma.certification.createMany({
      data: [
        {
          userId: admin.id,
          title: "AWS Certified Solutions Architect",
          description: "Amazon Web Services certification for architecting scalable systems",
          fileUrl: null
        },
        {
          userId: admin.id,
          title: "Google Cloud Professional Developer",
          description: "GCP certification for cloud application development",
          fileUrl: null
        },
        {
          userId: admin.id,
          title: "MongoDB Certified Developer",
          description: "Official MongoDB certification for database development",
          fileUrl: null
        }
      ]
    });
    console.log("✓ 3 certifications created");
  }

  // 8. Create Job Applications with related data
  console.log("\n📝 Creating job applications...");
  const existingJobs = await prisma.jobApplication.findMany({ 
    where: { userId: admin.id },
    include: { interviews: true, reminders: true, statusHistory: true }
  });
  const created: number[] = [];

  if (existingJobs.length === 0) {
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
          dateApplied: status === "draft" ? null : randomDate(new Date("2025-01-01"), new Date())
        }
      });

      created.push(job.id);

      // Add Status History for non-draft applications
      if (status !== "draft") {
        await prisma.statusHistory.create({
          data: {
            jobApplicationId: job.id,
            status: "applied",
            changedAt: job.dateApplied!,
            notes: "Application submitted"
          }
        });

        if (["interviewing", "offer", "rejected"].includes(status)) {
          await prisma.statusHistory.create({
            data: {
              jobApplicationId: job.id,
              status: "interviewing",
              changedAt: randomDate(job.dateApplied!, new Date()),
              notes: "Moved to interview stage"
            }
          });
        }
      }

      // Add Interviews for interviewing/offer/rejected status
      if (["interviewing", "offer", "rejected"].includes(status)) {
        const rounds = status === "offer" ? 3 : status === "rejected" ? 2 : 1;
        for (let r = 0; r < rounds; r++) {
          await prisma.interview.create({
            data: {
              jobApplicationId: job.id,
              round: `Round ${r + 1}`,
              date: randomDate(new Date("2025-02-01"), new Date()),
              outcome: r < rounds - 1 ? "passed" : (status === "offer" ? "passed" : "failed"),
              notes: `Interview ${r + 1} with ${r === 0 ? "HR" : r === 1 ? "Technical Team" : "CTO"}`,
              feedback: "Good technical knowledge and communication skills"
            }
          });
        }
      }

      // Add Reminders for applications in progress
      if (["applied", "interviewing"].includes(status) && i % 3 === 0) {
        await prisma.reminder.create({
          data: {
            jobApplicationId: job.id,
            title: "Follow up on application",
            dueDate: randomDate(new Date(), new Date("2026-04-01")),
            completed: false,
            notes: "Send follow-up email to hiring manager"
          }
        });
      }
    }

    console.log(`✓ 30 job applications created with interviews, reminders, and status history`);
  } else {
    console.log(`✓ ${existingJobs.length} job applications already exist`);
    
    // Add missing interviews, reminders, and status history
    let interviewsAdded = 0;
    let remindersAdded = 0;
    let historyAdded = 0;

    for (const job of existingJobs) {
      // Add status history if missing
      if (job.statusHistory.length === 0 && job.status !== "draft") {
        await prisma.statusHistory.create({
          data: {
            jobApplicationId: job.id,
            status: "applied",
            changedAt: job.dateApplied || job.createdAt,
            notes: "Application submitted"
          }
        });
        historyAdded++;

        if (["interviewing", "offer", "rejected"].includes(job.status)) {
          await prisma.statusHistory.create({
            data: {
              jobApplicationId: job.id,
              status: "interviewing",
              changedAt: randomDate(job.dateApplied || job.createdAt, new Date()),
              notes: "Moved to interview stage"
            }
          });
          historyAdded++;
        }
      }

      // Add interviews if missing for relevant statuses
      if (job.interviews.length === 0 && ["interviewing", "offer", "rejected"].includes(job.status)) {
        const rounds = job.status === "offer" ? 3 : job.status === "rejected" ? 2 : 1;
        for (let r = 0; r < rounds; r++) {
          await prisma.interview.create({
            data: {
              jobApplicationId: job.id,
              round: `Round ${r + 1}`,
              date: randomDate(new Date("2025-02-01"), new Date()),
              outcome: r < rounds - 1 ? "passed" : (job.status === "offer" ? "passed" : "failed"),
              notes: `Interview ${r + 1} with ${r === 0 ? "HR" : r === 1 ? "Technical Team" : "CTO"}`,
              feedback: "Good technical knowledge and communication skills"
            }
          });
          interviewsAdded++;
        }
      }

      // Add reminders if missing for applications in progress
      if (job.reminders.length === 0 && ["applied", "interviewing"].includes(job.status) && job.id % 3 === 0) {
        await prisma.reminder.create({
          data: {
            jobApplicationId: job.id,
            title: "Follow up on application",
            dueDate: randomDate(new Date(), new Date("2026-04-01")),
            completed: false,
            notes: "Send follow-up email to hiring manager"
          }
        });
        remindersAdded++;
      }
    }

    if (interviewsAdded > 0 || remindersAdded > 0 || historyAdded > 0) {
      console.log(`  → Added ${interviewsAdded} interviews, ${remindersAdded} reminders, ${historyAdded} status history entries`);
    }
  }

  console.log("\n✨ Database seeding completed!");
  console.log("\n📊 Summary:");
  console.log("- 1 User (admin@gmail.com / Admin123!)");
  console.log("- 1 Profile");
  console.log("- 2 Education records");
  console.log(`- ${skills.length} Skills`);
  console.log("- 15 User skills linked");
  console.log("- 2 Work experiences with bullets");
  console.log("- 2 Projects with bullets");
  console.log("- 3 Certifications");
  console.log("- 30 Job applications");
  console.log("- Multiple interviews, reminders, and status history entries");
  console.log(`\nStatuses distributed: ${STATUSES.join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
