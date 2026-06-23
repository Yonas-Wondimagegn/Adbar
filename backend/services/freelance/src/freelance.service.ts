import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';
import { PaginationDto, PaginatedResult } from '@adbar/common';

@Injectable()
export class FreelanceService {
  private readonly logger = new Logger(FreelanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: any) {
    const existing = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Freelancer profile already exists');

    return this.prisma.freelancerProfile.create({
      data: {
        userId,
        headline: dto.headline,
        overview: dto.overview || dto.bio,
        hourlyRate: dto.hourlyRate,
        currency: dto.currency ?? 'USD',
        availability: dto.availability ?? 'full_time',
      },
    });
  }

  async updateProfile(userId: string, dto: any) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    return this.prisma.freelancerProfile.update({
      where: { userId },
      data: {
        headline: dto.headline,
        overview: dto.overview || dto.bio,
        hourlyRate: dto.hourlyRate,
        currency: dto.currency,
        availability: dto.availability,
      },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: {
        skills: { include: { skill: true } },
        portfolioItems: true,
        experiences: true,
        educations: true,
        certifications: true,
        languages: true,
      },
    });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');
    return profile;
  }

  async addPortfolioItem(userId: string, dto: any) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    return this.prisma.portfolioItem.create({
      data: {
        freelancerProfileId: profile.id,
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        documentUrl: dto.documentUrl,
        externalUrl: dto.externalUrl || dto.projectUrl,
      },
    });
  }

  async removePortfolioItem(userId: string, itemId: string) {
    const item = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Portfolio item not found');
    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
    return this.getProfile(userId);
  }

  async addSkill(userId: string, dto: any) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    // Find or create the skill
    let skill = await this.prisma.skill.findUnique({ where: { slug: dto.name.toLowerCase().replace(/\s+/g, '-') } });
    if (!skill) {
      skill = await this.prisma.skill.create({ data: { name: dto.name, slug: dto.name.toLowerCase().replace(/\s+/g, '-') } });
    }

    // Check for duplicate
    const existing = await this.prisma.freelancerSkill.findUnique({
      where: { freelancerProfileId_skillId: { freelancerProfileId: profile.id, skillId: skill.id } },
    });
    if (existing) throw new ConflictException(`Skill "${dto.name}" already exists`);

    await this.prisma.freelancerSkill.create({
      data: { freelancerProfileId: profile.id, skillId: skill.id, proficiency: dto.proficiency },
    });
    return this.getProfile(userId);
  }

  async removeSkill(userId: string, skillName: string) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    const skill = await this.prisma.skill.findFirst({ where: { name: { contains: skillName, mode: 'insensitive' } } });
    if (!skill) throw new NotFoundException('Skill not found');

    await this.prisma.freelancerSkill.deleteMany({
      where: { freelancerProfileId: profile.id, skillId: skill.id },
    });
    return this.getProfile(userId);
  }

  async addExperience(userId: string, dto: any) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    return this.prisma.freelancerExperience.create({
      data: {
        freelancerProfileId: profile.id,
        title: dto.title,
        company: dto.company,
        location: dto.location,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent ?? false,
        description: dto.description,
      },
    });
  }

  async addEducation(userId: string, dto: any) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    return this.prisma.freelancerEducation.create({
      data: {
        freelancerProfileId: profile.id,
        institution: dto.institution,
        degree: dto.degree,
        fieldOfStudy: dto.fieldOfStudy,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        description: dto.description,
      },
    });
  }

  async addCertification(userId: string, dto: any) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    return this.prisma.freelancerCertification.create({
      data: {
        freelancerProfileId: profile.id,
        name: dto.name,
        issuingOrganization: dto.issuingOrganization,
        issueDate: new Date(dto.issueDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        credentialId: dto.credentialId,
        credentialUrl: dto.credentialUrl,
      },
    });
  }

  async addLanguage(userId: string, dto: any) {
    const profile = await this.prisma.freelancerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('FreelancerProfile not found');

    return this.prisma.freelancerLanguage.create({
      data: {
        freelancerProfileId: profile.id,
        language: dto.language,
        proficiency: dto.proficiency,
      },
    });
  }

  async listFreelancers(query: any): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.skill) {
      where.skills = { some: { skill: { name: { contains: query.skill, mode: 'insensitive' } } } };
    }
    if (query.search) {
      where.OR = [
        { headline: { contains: query.search, mode: 'insensitive' } },
        { overview: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.minRate !== undefined || query.maxRate !== undefined) {
      where.hourlyRate = {};
      if (query.minRate !== undefined) where.hourlyRate.gte = query.minRate;
      if (query.maxRate !== undefined) where.hourlyRate.lte = query.maxRate;
    }
    if (query.availability) where.availability = query.availability;

    const [data, totalItems] = await Promise.all([
      this.prisma.freelancerProfile.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          skills: { include: { skill: true } },
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.freelancerProfile.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);
    return {
      data,
      pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }
}
