import { malayCore } from './common';
import { malayDynamicCatalog } from './dynamic';
import { landingMalayOverrides } from './public';
import { malayProductCatalog } from './product';
import { reviewedMalayOverrides } from './reviewed';

export const malayCatalog: Record<string, string> = {
    ...malayCore,
    ...reviewedMalayOverrides,
    ...landingMalayOverrides,
    ...malayProductCatalog,
    ...malayDynamicCatalog,
};
