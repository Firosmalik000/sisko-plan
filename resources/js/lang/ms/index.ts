import { malayCore } from './common';
import { reviewedMalayOverrides } from './reviewed';

export const malayCatalog: Record<string, string> = {
    ...malayCore,
    ...reviewedMalayOverrides,
};
