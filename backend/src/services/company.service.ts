import { prisma } from "../db/prisma";

export class CompanyService {
  // Get all companies
  async getCompanies() {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" }
    });

    return companies;
  }

  // Get single company
  async getCompany(companyId: number) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        jobApplications: {
          orderBy: { updatedAt: "desc" },
          take: 5
        }
      }
    });

    if (!company) {
      throw new Error("Company not found");
    }

    return company;
  }

  // Create company
  async createCompany(data: {
    name: string;
    industry?: string;
    size?: string;
    website?: string;
    notes?: string;
  }) {
    const company = await prisma.company.create({
      data
    });

    return company;
  }

  // Update company
  async updateCompany(companyId: number, data: Record<string, unknown>) {
    const company = await prisma.company.update({
      where: { id: companyId },
      data
    });

    return company;
  }

  // Delete company
  async deleteCompany(companyId: number) {
    await prisma.company.delete({
      where: { id: companyId }
    });

    return { success: true };
  }

  // Search companies by name
  async searchCompanies(query: string) {
    const companies = await prisma.company.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive"
        }
      },
      orderBy: { name: "asc" },
      take: 20
    });

    return companies;
  }
}

export const companyService = new CompanyService();
