export type PromotionFrequency = 'once_per_session' | 'once_per_day' | 'once_per_campaign' | 'every_app_open';

export type CustomerPromotion = {
    public_id: string;
    name: string;
    image_url: string;
    destination_url: string | null;
    updated_at: string;
};

export type AppOpenPromotion = CustomerPromotion & {
    frequency: PromotionFrequency;
};

type PromotionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function destinationKind(destination: string | null): 'none' | 'internal' | 'external' {
    if (!destination || hasUnsafeUrlCharacter(destination)) {
        return 'none';
    }

    if (destination.startsWith('/') && !destination.startsWith('//')) {
        return 'internal';
    }

    return /^https?:\/\//iu.test(destination) ? 'external' : 'none';
}

function hasUnsafeUrlCharacter(destination: string): boolean {
    return [...destination].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;

        return character === '\\' || codePoint <= 31 || codePoint === 127;
    });
}

export function selectAppOpenPromotion(
    promotions: AppOpenPromotion[],
    session: PromotionStorage,
    local: PromotionStorage,
    localDate: string,
): AppOpenPromotion | null {
    return promotions.find((promotion) => shouldShowPromotion(promotion, session, local, localDate)) ?? null;
}

export function shouldShowPromotion(
    promotion: AppOpenPromotion,
    session: PromotionStorage,
    local: PromotionStorage,
    localDate: string,
): boolean {
    const version = versionKey(promotion);

    return promotion.frequency === 'every_app_open'
        ? true
        : promotion.frequency === 'once_per_session'
          ? session.getItem(`promotion:session:${version}`) !== 'shown'
          : promotion.frequency === 'once_per_day'
            ? local.getItem(`promotion:day:${version}`) !== localDate
            : local.getItem(`promotion:campaign:${version}`) !== 'shown';
}

export function markPromotionShown(
    promotion: AppOpenPromotion,
    session: PromotionStorage,
    local: PromotionStorage,
    localDate: string,
): void {
    const version = versionKey(promotion);

    if (promotion.frequency === 'once_per_session') {
        session.setItem(`promotion:session:${version}`, 'shown');
    } else if (promotion.frequency === 'once_per_day') {
        local.setItem(`promotion:day:${version}`, localDate);
    } else if (promotion.frequency === 'once_per_campaign') {
        local.setItem(`promotion:campaign:${version}`, 'shown');
    }
}

function versionKey(promotion: AppOpenPromotion): string {
    return `${promotion.public_id}:${promotion.updated_at}`;
}
