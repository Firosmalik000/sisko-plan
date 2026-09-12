import { englishOverrides } from './application';
import { englishDynamicCatalog } from './dynamic';
import { englishProductCatalog } from './product';
import { landingEnglishOverrides } from './public';
import { englishOverrides as englishReferralCatalog } from './referral';

export const englishCatalog: Record<string, string> = {
    ...englishOverrides,
    ...landingEnglishOverrides,
    ...englishProductCatalog,
    ...englishDynamicCatalog,
    ...englishReferralCatalog,
};
