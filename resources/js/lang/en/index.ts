import { englishOverrides } from './application';
import { englishDynamicCatalog } from './dynamic';
import { landingEnglishOverrides } from './public';
import { englishProductCatalog } from './product';

export const englishCatalog: Record<string, string> = {
    ...englishOverrides,
    ...landingEnglishOverrides,
    ...englishProductCatalog,
    ...englishDynamicCatalog,
};
