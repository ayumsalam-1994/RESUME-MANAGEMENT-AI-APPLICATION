import { Request, Response } from "express";
import { z } from "zod";
import { companyService } from "../services/company.service";

const CompanySchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional()
});

// Get all companies
export async function getCompanies(req: Request, res: Response) {
  try {
    const { search } = req.query;
    
    let companies;
    if (search && typeof search === "string") {
      companies = await companyService.searchCompanies(search);
    } else {
      companies = await companyService.getCompanies();
    }

    res.json(companies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get single company
export async function getCompany(req: Request, res: Response) {
  try {
    const companyId = Number(req.params.companyId);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company id" });
    }

    const company = await companyService.getCompany(companyId);
    res.json(company);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

// Create company
export async function createCompany(req: Request, res: Response) {
  try {
    const data = CompanySchema.parse(req.body);
    const company = await companyService.createCompany(data);

    res.status(201).json(company);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update company
export async function updateCompany(req: Request, res: Response) {
  try {
    const companyId = Number(req.params.companyId);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company id" });
    }

    const data = CompanySchema.partial().parse(req.body);
    const company = await companyService.updateCompany(companyId, data);

    res.json(company);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete company
export async function deleteCompany(req: Request, res: Response) {
  try {
    const companyId = Number(req.params.companyId);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company id" });
    }

    await companyService.deleteCompany(companyId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
