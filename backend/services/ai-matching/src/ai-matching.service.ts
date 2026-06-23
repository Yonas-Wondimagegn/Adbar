import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@adbar/common';

export interface MatchScore {
  freelancerId: string;
  freelancerName: string;
  avatar?: string;
  score: number;
  skillMatch: number;
  ratingScore: number;
  availabilityScore: number;
  pricingScore: number;
  completedProjects: number;
  skills: string[];
}

export interface RecommendationItem {
  id: string;
  name: string;
  type: 'product' | 'job' | 'freelancer';
  score: number;
  image?: string;
  price?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AiMatchingService {
  private readonly logger = new Logger(AiMatchingService.name);

  // Scoring weights for freelancer matching
  private readonly WEIGHTS = {
    skills: 0.35,
    ratings: 0.25,
    availability: 0.2,
    pricing: 0.15,
    history: 0.05,
  };

  constructor(private readonly prisma: PrismaService) {}

  // ========== PRODUCT RECOMMENDATIONS ==========

  async getProductRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<RecommendationItem[]> {
    // Get user's purchase and browsing history
    const userOrders = await this.prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Extract products the user has interacted with
    const purchasedProductIds = new Set<string>();

    for (const order of userOrders) {
      for (const item of order.items) {
        if (item.productId) {
          purchasedProductIds.add(item.productId);
        }
      }
    }

    // Get user's favorite/wishlist products for additional signals
    const wishlist = await this.prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
    });
    const wishlistIds = wishlist.map((w) => w.productId);

    // Get purchased product categories
    const purchasedProductIdsArray = Array.from(purchasedProductIds);
    const purchasedProducts = purchasedProductIdsArray.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: purchasedProductIdsArray } },
          select: { categoryId: true },
        })
      : [];
    const viewedCategoryIds = new Set<string>(
      purchasedProducts.map((p) => p.categoryId).filter(Boolean) as string[],
    );

    // Build recommendations from similar categories
    const candidateProducts = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        id: {
          notIn: [
            ...purchasedProductIdsArray,
            ...wishlistIds,
          ].filter(Boolean) as string[],
        },
        ...(viewedCategoryIds.size > 0
          ? {
              categoryId: {
                in: Array.from(viewedCategoryIds),
              },
            }
          : {}),
      },
      include: {
        category: true,
        store: { select: { name: true, id: true } },
      },
      take: limit * 3,
    });

    // Score products based on user behavior similarity
    const scored: RecommendationItem[] = candidateProducts.map((product) => {
      let score = 0;

      // Category match score
      const productCategoryId = product.categoryId || product.category?.id;
      const categoryMatch = productCategoryId && viewedCategoryIds.has(productCategoryId) ? 1 : 0;
      score += (categoryMatch / Math.max(viewedCategoryIds.size, 1)) * 40;

      // Popularity score (normalized)
      const avgRating = (product as any).averageRating || 0;
      score += (avgRating / 5) * 30;

      // Review count as social proof
      const reviewCount = (product as any).reviewCount || 0;
      score += Math.min(reviewCount / 10, 1) * 20;

      // Recency boost
      const daysSinceCreated =
        (Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) score += 10;
      else if (daysSinceCreated < 30) score += 5;

      return {
        id: product.id,
        name: product.name,
        type: 'product' as const,
        score: Math.round(score * 100) / 100,
        image: (product as any).images?.[0] || null,
        price: product.price?.toNumber(),
        currency: 'ETB',
        metadata: {
          storeName: product.store?.name,
          categoryNames: product.category?.name ? [product.category.name] : [],
          reviewCount,
        },
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ========== JOB RECOMMENDATIONS ==========

  async getJobRecommendations(
    freelancerId: string,
    limit: number = 10,
  ): Promise<RecommendationItem[]> {
    const freelancer = await this.prisma.user.findUnique({
      where: { id: freelancerId },
      include: {
        freelancerProfile: true,
      },
    });

    if (!freelancer) {
      throw new NotFoundException('Freelancer not found');
    }

    const freelancerProfileSkills = await this.prisma.freelancerSkill.findMany({
      where: { freelancerProfileId: (freelancer as any).freelancerProfile?.id },
      include: { skill: true },
    });
    const freelancerSkills =
      freelancerProfileSkills?.map((s) => s.skill?.name || s.skillId) || [];
    const freelancerRating = (freelancer as any).averageRating || 0;

    // Get active jobs that match the freelancer's skills
    const activeJobs = await this.prisma.job.findMany({
      where: {
        status: 'OPEN',
      },
      include: {
        skills: { include: { skill: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 3,
    });

    // Also get contracts as job recommendations
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'DRAFT',
        freelancerId: undefined,
      },
      take: limit * 2,
    });

    const scored: RecommendationItem[] = [];

    // Score jobs
    for (const job of activeJobs) {
      let score = 0;

      // Skill match
      const jobSkills =
        job.skills?.map((s) => s.skill?.name || s.skillId) || [];
      const skillOverlap = freelancerSkills.filter((s) =>
        jobSkills.some(
          (js) => js.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(js.toLowerCase()),
        ),
      ).length;
      score +=
        (skillOverlap / Math.max(jobSkills.length, 1)) *
        this.WEIGHTS.skills *
        100;

      // Budget fit (if freelancer has a rate)
      const freelancerRate =
        (freelancer.freelancerProfile as any)?.hourlyRate ||
        (freelancer.freelancerProfile as any)?.minimumRate ||
        0;
      const jobBudget = job.budgetMax || job.budgetMin;
      if (jobBudget && freelancerRate > 0) {
        const budgetFit =
          1 - Math.abs(jobBudget.toNumber() - freelancerRate) / jobBudget.toNumber();
        score += Math.max(budgetFit, 0) * this.WEIGHTS.pricing * 100;
      }

      // Recency boost
      const daysSincePosted =
        (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePosted < 1) score += 15;
      else if (daysSincePosted < 3) score += 10;
      else if (daysSincePosted < 7) score += 5;

      // Competition penalty (fewer proposals is better)
      const proposalCount = (job as any)._count?.proposals || 0;
      score -= Math.min(proposalCount * 0.5, 10);

      scored.push({
        id: job.id,
        name: job.title,
        type: 'job',
        score: Math.round(Math.max(score, 0) * 100) / 100,
        price: jobBudget?.toNumber(),
        currency: job.currency || 'ETB',
        metadata: {
          clientId: job.clientId,
          skills: jobSkills,
          proposalCount,
          deadline: job.deadline,
        },
      });
    }

    // Score contracts
    for (const contract of contracts) {
      scored.push({
        id: contract.id,
        name: (contract as any).title || 'Freelance Contract',
        type: 'job',
        score: 30, // Base score for contracts
        price: contract.totalAmount?.toNumber(),
        currency: contract.currency || 'ETB',
        metadata: {
          clientId: contract.clientId,
          contractType: contract.type,
        },
      });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ========== FREELANCER MATCHING FOR JOB ==========

  async matchFreelancersForJob(
    jobId: string,
    limit: number = 10,
  ): Promise<MatchScore[]> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        skills: { include: { skill: true } },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const jobSkills =
      job.skills?.map((s) => ({
        id: s.skillId,
        name: s.skill?.name || '',
      })) || [];
    const jobBudget = job.budgetMax || job.budgetMin;
    const jobBudgetNum = jobBudget?.toNumber() || 0;

    // Get available freelancers
    const freelancers = await this.prisma.user.findMany({
      where: {
        roles: { some: { role: 'FREELANCER' } },
        emailVerified: true,
      },
      include: {
        freelancerProfile: true,
      },
      take: 100,
    });

    if (freelancers.length === 0) {
      return [];
    }

    const scores: MatchScore[] = [];

    for (const freelancer of freelancers) {
      const freelancerProfileSkills = await this.prisma.freelancerSkill.findMany({
        where: { freelancerProfileId: (freelancer as any).freelancerProfile?.id },
        include: { skill: true },
      });
      const freelancerSkillNames =
        freelancerProfileSkills?.map((s) => s.skill?.name || s.skillId) || [];
      const freelancerRate =
        (freelancer as any).freelancerProfile?.hourlyRate ||
        (freelancer as any).freelancerProfile?.minimumRate ||
        0;

      // 1. Skill Match Score (0-100)
      let skillScore = 0;
      if (jobSkills.length > 0) {
        const matchedSkills = jobSkills.filter((js) =>
          freelancerSkillNames.some(
            (fs) =>
              fs.toLowerCase().includes(js.name.toLowerCase()) ||
              js.name.toLowerCase().includes(fs.toLowerCase()),
          ),
        ).length;
        skillScore = (matchedSkills / jobSkills.length) * 100;
      }

      // 2. Rating Score (0-100)
      const freelancerRating = (freelancer as any).averageRating || 0;
      const ratingScore = (freelancerRating / 5) * 100;

      // 3. Availability Score (0-100)
      const completedProjects =
        (freelancer as any).freelancerProfile?.completedJobs || 0;
      const maxActiveProjects =
        (freelancer as any).freelancerProfile?.maxConcurrentProjects || 5;
      const currentActiveProjects = await this.prisma.escrow.count({
        where: {
          freelancerId: freelancer.id,
          status: 'FUNDED',
        },
      });
      const availabilityScore =
        maxActiveProjects > 0
          ? Math.max(
              0,
              ((maxActiveProjects - currentActiveProjects) /
                maxActiveProjects) *
                100,
            )
          : 50;

      // 4. Pricing Score (0-100)
      let pricingScore = 50; // Default neutral
      if (jobBudgetNum > 0 && freelancerRate > 0) {
        // Score is higher when freelancer rate is within budget
        const ratio = freelancerRate / jobBudgetNum;
        if (ratio <= 1) {
          pricingScore = 100 - ratio * 30; // Slight penalty for very low rates
        } else {
          pricingScore = Math.max(0, 70 - (ratio - 1) * 50); // Steeper penalty for over budget
        }
      }

      // 5. History Score (0-100) - Experience bonus
      const historyScore = Math.min(completedProjects * 2, 100);

      // Weighted total
      const totalScore =
        skillScore * this.WEIGHTS.skills +
        ratingScore * this.WEIGHTS.ratings +
        availabilityScore * this.WEIGHTS.availability +
        pricingScore * this.WEIGHTS.pricing +
        historyScore * this.WEIGHTS.history;

      scores.push({
        freelancerId: freelancer.id,
        freelancerName: `${freelancer.firstName} ${freelancer.lastName}`,
        avatar: (freelancer as any).avatar || null,
        score: Math.round(totalScore * 100) / 100,
        skillMatch: Math.round(skillScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
        availabilityScore: Math.round(availabilityScore * 100) / 100,
        pricingScore: Math.round(pricingScore * 100) / 100,
        completedProjects,
        skills: freelancerSkillNames,
      });
    }

    this.logger.log(
      `Matched ${scores.length} freelancers for job ${jobId}`,
    );

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
