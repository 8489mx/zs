import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

@Injectable()
export class PlanFeatureService implements OnModuleInit {
  private planFeatures = new Map<string, Set<string>>();

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    const rows = await this.db.selectFrom('plan_features').select(['plan_id', 'feature_code']).execute();
    const newCache = new Map<string, Set<string>>();
    
    for (const row of rows) {
      if (!newCache.has(row.plan_id)) {
        newCache.set(row.plan_id, new Set());
      }
      newCache.get(row.plan_id)!.add(row.feature_code);
    }
    
    this.planFeatures = newCache;
  }

  hasFeature(planId: string | undefined, extraFeatures: string[] | undefined, requiredFeature: string): boolean {
    if (extraFeatures && extraFeatures.includes(requiredFeature)) {
      return true;
    }
    if (!planId) {
      return true; // If no plan is assigned, assume backward compatibility or handle securely based on your policy
    }
    
    // Hardcoded ultimate check just in case cache misses
    if (planId === 'plan_ultimate') return true;

    const planFeatures = this.planFeatures.get(planId);
    if (!planFeatures) {
      return false;
    }

    return planFeatures.has(requiredFeature);
  }
}
