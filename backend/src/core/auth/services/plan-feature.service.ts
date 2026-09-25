import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

import { getIndustryProfile } from '../../tenant/industry-profiles';

@Injectable()
export class PlanFeatureService implements OnModuleInit {
  private planFeatures = new Map<string, Set<string>>();

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    try {
      const rows = await this.db.selectFrom('plan_features').select(['plan_id', 'feature_code']).execute();
      const newCache = new Map<string, Set<string>>();
      
      for (const row of rows) {
        if (!newCache.has(row.plan_id)) {
          newCache.set(row.plan_id, new Set());
        }
        newCache.get(row.plan_id)!.add(row.feature_code);
      }
      
      this.planFeatures = newCache;
    } catch (error: any) {
      // Table might not exist yet if migrations haven't run
      this.planFeatures = new Map<string, Set<string>>();
      console.warn(`[PlanFeatureService] Could not refresh cache (possibly missing table): ${error.message}`);
    }
  }

  hasFeature(
    planId: string | undefined,
    extraFeatures: string[] | undefined,
    requiredFeature: string,
    pillar?: string,
    activityType?: string,
  ): boolean {
    if (extraFeatures && extraFeatures.includes(`-${requiredFeature}`)) {
      return false;
    }
    if (extraFeatures && extraFeatures.includes(requiredFeature)) {
      return true;
    }

    // 1. Full Vertical Suite Invariant: Contracting & Maritime Freight get their full operational suite automatically
    if (pillar === 'contracting' || activityType === 'contracting') {
      const profile = getIndustryProfile('contracting');
      if (profile.defaultFeatures.includes(requiredFeature)) {
        return true;
      }
      if (['pharmacy', 'restaurant', 'maritime_freight', 'storefront', 'kds'].includes(requiredFeature)) {
        return false;
      }
    }

    if (pillar === 'maritime_freight' || activityType === 'maritime_freight') {
      const profile = getIndustryProfile('maritime_freight');
      if (profile.defaultFeatures.includes(requiredFeature)) {
        return true;
      }
      if (['pharmacy', 'restaurant', 'contracting', 'manufacturing', 'storefront', 'pos', 'kds'].includes(requiredFeature)) {
        return false;
      }
    }

    // Manufacturing is a normal band-4 commerce product (has POS, like wholesale/import — see
    // pricing-catalog.json), not an isolated pillar; it falls through to the commerce branch below,
    // and its sector flag is granted via defaultFeatures. It can also be installed as an add-on
    // module on top of ANY other activity (a restaurant making chocolate, a pharmacy compounding)
    // via the literal extraFeatures check above.

    if (pillar === 'commerce' || !pillar || ['retail_general', 'pharmacy', 'restaurant', 'maintenance'].includes(activityType || '')) {
      const profile = getIndustryProfile(activityType);
      if (profile.defaultFeatures.includes(requiredFeature)) {
        return true;
      }
      if (['contracting', 'maritime_freight'].includes(requiredFeature)) {
        return false;
      }
    }

    if (!planId) {
      return true; // If no plan is assigned, assume backward compatibility
    }
    
    // Explicit tier checks for commerce pillar
    if (planId === 'plan_omnichannel') return true;
    if (planId === 'plan_ultimate' && requiredFeature === 'storefront') return false;

    const planFeatures = this.planFeatures.get(planId);
    if (!planFeatures) {
      if (planId === 'plan_ultimate') return true;
      return false;
    }

    return planFeatures.has(requiredFeature);
  }
}
