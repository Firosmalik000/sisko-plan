import { formatMoney as money, formatQuantity as quantity } from './currency.ts';

export type ReceiptImageProps = {
    receipt: {
        store_name: string;
        address: string | null;
        header: string;
        footer: string;
        paper_size: '58mm' | '80mm';
        show_address: boolean;
        show_cashier: boolean;
        show_logo?: boolean;
        logo_url?: string | null;
    };
    sale: {
        public_id: string;
        document_number: string;
        customer_name: string | null;
        customer_phone: string | null;
        customer_email: string | null;
        sales_channel: 'in_store' | 'marketplace';
        marketplace_code: string | null;
        marketplace_label: string | null;
        external_order_number: string | null;
        subtotal: string;
        item_discount_amount: string;
        transaction_discount_amount: string;
        total_amount: string;
        paid_amount: string;
        change_amount: string;
        occurred_at: string;
        notes: string | null;
        cashier_name: string;
    };
    items: Array<{
        public_id: string;
        product_name: string;
        sku: string | null;
        unit_symbol: string;
        quantity: string;
        unit_price: string;
        net_total: string;
        returned_quantity: string;
    }>;
    payment: {
        amount: string;
        tendered_amount: string;
        change_amount: string;
        account_name: string;
    };
    timezone: string;
    formattedDate?: string;
    translate?: (text: string) => string;
};

export function loadReceiptLogo(url: string, timeoutMs = 2500): Promise<HTMLImageElement | null> {
    if (typeof Image === 'undefined') {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const img = new Image();
        let resolved = false;
        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(null);
            }
        }, timeoutMs);

        img.crossOrigin = 'anonymous';
        img.onload = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve(img);
            }
        };
        img.onerror = () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve(null);
            }
        };
        img.src = url;
    });
}

export function wrapCanvasText(measureWidth: (text: string) => number, text: string, maxWidth: number): string[] {
    const trimmed = text.trim();

    if (!trimmed) {
        return [];
    }

    const words = trimmed.split(/\s+/u);
    const lines: string[] = [];
    let currentLine = words[0] ?? '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const candidate = `${currentLine} ${word}`;

        if (measureWidth(candidate) <= maxWidth) {
            currentLine = candidate;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

export function drawReceiptToContext(
    ctx: CanvasRenderingContext2D | null,
    props: ReceiptImageProps,
    width = 480,
    margin = 32,
    logoImage?: CanvasImageSource | null,
): number {
    const t = props.translate ?? ((key: string) => key);
    const contentWidth = width - margin * 2;
    const fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    const measure = (text: string, font: string): number => {
        if (!ctx) {
            const sizeMatch = /(\d+)px/u.exec(font);
            const size = sizeMatch ? Number(sizeMatch[1]) : 14;

            return text.length * size * 0.55;
        }

        ctx.font = font;

        return ctx.measureText(text).width;
    };

    let y = 36;

    // 0. Store Logo
    if (props.receipt.show_logo !== false && logoImage) {
        const maxLogoWidth = 140;
        const maxLogoHeight = 60;
        const naturalWidth = Number((logoImage as { width?: number }).width) || maxLogoWidth;
        const naturalHeight = Number((logoImage as { height?: number }).height) || maxLogoHeight;
        const ratio = Math.min(maxLogoWidth / naturalWidth, maxLogoHeight / naturalHeight, 1);
        const logoW = Math.round(naturalWidth * ratio);
        const logoH = Math.round(naturalHeight * ratio);

        if (ctx) {
            ctx.drawImage(logoImage, (width - logoW) / 2, y, logoW, logoH);
        }

        y += logoH + 12;
    }

    // 1. Store Name
    const storeFont = `bold 20px ${fontFamily}`;
    const storeLines = wrapCanvasText((line) => measure(line, storeFont), props.receipt.store_name.toUpperCase(), contentWidth);

    for (const line of storeLines) {
        if (ctx) {
            ctx.font = storeFont;
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'center';
            ctx.fillText(line, width / 2, y);
        }

        y += 26;
    }

    // 2. Address
    if (props.receipt.show_address && props.receipt.address) {
        const addressFont = `12px ${fontFamily}`;
        const addressLines = wrapCanvasText((line) => measure(line, addressFont), props.receipt.address, contentWidth * 0.85);

        for (const line of addressLines) {
            if (ctx) {
                ctx.font = addressFont;
                ctx.fillStyle = '#6b7280';
                ctx.textAlign = 'center';
                ctx.fillText(line, width / 2, y);
            }

            y += 16;
        }

        y += 4;
    }

    // 3. Receipt Header
    if (props.receipt.header) {
        y += 4;
        const headerFont = `bold 12px ${fontFamily}`;

        if (ctx) {
            ctx.font = headerFont;
            ctx.fillStyle = '#0284c7';
            ctx.textAlign = 'center';
            ctx.fillText(props.receipt.header.toUpperCase(), width / 2, y);
        }

        y += 24;
    }

    // 4. Document Number
    const docFont = `bold 24px ${fontFamily}`;

    if (ctx) {
        ctx.font = docFont;
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.fillText(props.sale.document_number, width / 2, y);
    }

    y += 22;

    // 5. Date & Cashier
    const metaFont = `12px ${fontFamily}`;
    let metaText = props.formattedDate ?? props.sale.occurred_at;

    if (props.receipt.show_cashier && props.sale.cashier_name) {
        metaText += ` · ${t('Checkout')} ${props.sale.cashier_name}`;
    }

    if (ctx) {
        ctx.font = metaFont;
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText(metaText, width / 2, y);
    }

    y += 18;

    // 6. Marketplace Info
    if (props.sale.sales_channel === 'marketplace') {
        const marketFont = `bold 12px ${fontFamily}`;
        let marketText = props.sale.marketplace_label ?? 'Marketplaces';

        if (props.sale.external_order_number) {
            marketText += ` · ${t('Order')} ${props.sale.external_order_number}`;
        }

        if (ctx) {
            ctx.font = marketFont;
            ctx.fillStyle = '#0284c7';
            ctx.textAlign = 'center';
            ctx.fillText(marketText, width / 2, y);
        }

        y += 18;
    }

    // 7. Customer Info
    if (props.sale.customer_name && props.sale.customer_phone) {
        const custFont = `12px ${fontFamily}`;
        const custText = `${t('Customer')} ${props.sale.customer_name} · ${props.sale.customer_phone}`;

        if (ctx) {
            ctx.font = custFont;
            ctx.fillStyle = '#4b5563';
            ctx.textAlign = 'center';
            ctx.fillText(custText, width / 2, y);
        }

        y += 16;

        if (props.sale.customer_email) {
            if (ctx) {
                ctx.font = custFont;
                ctx.fillStyle = '#4b5563';
                ctx.textAlign = 'center';
                ctx.fillText(props.sale.customer_email, width / 2, y);
            }

            y += 16;
        }
    }

    // Dashed Divider 1
    y += 10;

    if (ctx) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
        ctx.restore();
    }

    y += 22;

    // 8. Items List
    const itemTitleFont = `bold 14px ${fontFamily}`;
    const itemSubFont = `12px ${fontFamily}`;
    const itemPriceFont = `bold 14px ${fontFamily}`;
    const priceColWidth = 110;
    const nameMaxWidth = contentWidth - priceColWidth;

    for (const item of props.items) {
        const itemStartY = y;
        const nameLines = wrapCanvasText((line) => measure(line, itemTitleFont), item.product_name, nameMaxWidth);

        for (const line of nameLines) {
            if (ctx) {
                ctx.font = itemTitleFont;
                ctx.fillStyle = '#111827';
                ctx.textAlign = 'left';
                ctx.fillText(line, margin, y);
            }

            y += 18;
        }

        let subText = `${quantity(item.quantity)} ${item.unit_symbol} × ${money(item.unit_price)}`;

        if (Number(item.returned_quantity) > 0) {
            subText += ` · ${t('returned')} ${quantity(item.returned_quantity)}`;
        }

        if (ctx) {
            ctx.font = itemSubFont;
            ctx.fillStyle = '#6b7280';
            ctx.textAlign = 'left';
            ctx.fillText(subText, margin, y);
        }

        y += 18;

        if (ctx) {
            ctx.font = itemPriceFont;
            ctx.fillStyle = '#111827';
            ctx.textAlign = 'right';
            ctx.fillText(money(item.net_total), width - margin, itemStartY);
        }

        y += 8;
    }

    // Dashed Divider 2
    y += 8;

    if (ctx) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
        ctx.restore();
    }

    y += 24;

    // 9. Totals Summary
    const summaryRow = (label: string, value: string, font: string, labelColor: string, valueColor: string, isBold = false) => {
        if (ctx) {
            ctx.font = font;
            ctx.fillStyle = labelColor;
            ctx.textAlign = 'left';
            ctx.fillText(label, margin, y);

            ctx.fillStyle = valueColor;
            ctx.textAlign = 'right';
            ctx.fillText(value, width - margin, y);
        }

        y += isBold ? 28 : 22;
    };

    const regularFont = `13px ${fontFamily}`;
    summaryRow(t('Subtotal'), money(props.sale.subtotal), regularFont, '#6b7280', '#111827');

    if (Number(props.sale.item_discount_amount) > 0) {
        summaryRow(t('Discount item'), `-${money(props.sale.item_discount_amount)}`, regularFont, '#6b7280', '#dc2626');
    }

    if (Number(props.sale.transaction_discount_amount) > 0) {
        summaryRow(t('Transaction discount'), `-${money(props.sale.transaction_discount_amount)}`, regularFont, '#6b7280', '#dc2626');
    }

    y += 4;
    const totalFont = `bold 20px ${fontFamily}`;
    summaryRow(t('Total'), money(props.sale.total_amount), totalFont, '#0f172a', '#0f172a', true);

    summaryRow(`${t('Paid via')} ${props.payment.account_name}`, money(props.payment.tendered_amount), regularFont, '#6b7280', '#111827');

    const changeFont = `bold 14px ${fontFamily}`;
    summaryRow(t('Change'), money(props.payment.change_amount), changeFont, '#0284c7', '#0284c7');

    // 10. Notes
    if (props.sale.notes) {
        y += 8;
        const noteFont = `12px ${fontFamily}`;
        const noteContent = `${t('Notes:')} ${props.sale.notes}`;
        const noteLines = wrapCanvasText((line) => measure(line, noteFont), noteContent, contentWidth - 24);
        const boxHeight = noteLines.length * 16 + 16;

        if (ctx) {
            ctx.fillStyle = '#f3f4f6';

            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(margin, y, contentWidth, boxHeight, 8);
            } else {
                ctx.rect(margin, y, contentWidth, boxHeight);
            }

            ctx.fill();

            ctx.font = noteFont;
            ctx.fillStyle = '#4b5563';
            ctx.textAlign = 'left';
            let lineY = y + 16;

            for (const line of noteLines) {
                ctx.fillText(line, margin + 12, lineY);
                lineY += 16;
            }
        }

        y += boxHeight + 12;
    }

    // 11. Footer
    if (props.receipt.footer) {
        y += 14;
        const footerFont = `12px ${fontFamily}`;
        const footerLines = wrapCanvasText((line) => measure(line, footerFont), props.receipt.footer, contentWidth);

        for (const line of footerLines) {
            if (ctx) {
                ctx.font = footerFont;
                ctx.fillStyle = '#6b7280';
                ctx.textAlign = 'center';
                ctx.fillText(line, width / 2, y);
            }

            y += 16;
        }
    }

    y += 36;

    return y;
}

export async function generateReceiptBlob(props: ReceiptImageProps): Promise<Blob> {
    if (typeof document === 'undefined') {
        throw new Error('Canvas rendering is only available in the browser.');
    }

    const width = 480;
    const margin = 32;
    const scale = 2;

    let logoImage: HTMLImageElement | null = null;

    if (props.receipt.show_logo !== false && props.receipt.logo_url) {
        logoImage = await loadReceiptLogo(props.receipt.logo_url);
    }

    const calculatedHeight = drawReceiptToContext(null, props, width, margin, logoImage);

    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = calculatedHeight * scale;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get 2D canvas context.');
    }

    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, calculatedHeight);

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, calculatedHeight - 1);

    drawReceiptToContext(ctx, props, width, margin, logoImage);

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to create receipt image blob.'));
            }
        }, 'image/png');
    });
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareReceiptImage(props: ReceiptImageProps): Promise<'shared' | 'downloaded' | 'aborted'> {
    const blob = await generateReceiptBlob(props);
    const filename = `nota-${props.sale.document_number}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: `${props.receipt.store_name} - ${props.sale.document_number}`,
            });

            return 'shared';
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                return 'aborted';
            }

            triggerDownload(blob, filename);

            return 'downloaded';
        }
    }

    triggerDownload(blob, filename);

    return 'downloaded';
}

export async function downloadReceiptImage(props: ReceiptImageProps): Promise<void> {
    const blob = await generateReceiptBlob(props);
    const filename = `nota-${props.sale.document_number}.png`;
    triggerDownload(blob, filename);
}

export async function copyReceiptImage(props: ReceiptImageProps): Promise<boolean> {
    const blob = await generateReceiptBlob(props);

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

        return true;
    }

    return false;
}
