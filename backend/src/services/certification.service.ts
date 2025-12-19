import { prisma } from "../db/prisma";

export class CertificationService {
  async getUserCertifications(userId: number) {
    return prisma.certification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createCertification(
    userId: number,
    data: { title: string; description?: string | null; fileUrl?: string | null }
  ) {
    return prisma.certification.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        fileUrl: data.fileUrl ?? null
      }
    });
  }

  async updateCertification(
    certificationId: number,
    userId: number,
    data: { title?: string; description?: string | null; fileUrl?: string | null }
  ) {
    const exists = await prisma.certification.findFirst({ where: { id: certificationId, userId } });
    if (!exists) {
      throw new Error("Certification not found");
    }

    return prisma.certification.update({
      where: { id: certificationId },
      data
    });
  }

  async deleteCertification(certificationId: number, userId: number) {
    const exists = await prisma.certification.findFirst({ where: { id: certificationId, userId } });
    if (!exists) {
      throw new Error("Certification not found");
    }

    await prisma.certification.delete({ where: { id: certificationId } });
    return { success: true };
  }
}

export const certificationService = new CertificationService();
