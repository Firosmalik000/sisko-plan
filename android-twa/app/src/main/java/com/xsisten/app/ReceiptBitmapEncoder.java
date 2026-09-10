package com.xsisten.app;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class ReceiptBitmapEncoder {
    private ReceiptBitmapEncoder() {}

    public static byte[] encode(ReceiptPayload receipt, int columns) {
        int width = columns == 48 ? 576 : 384;
        float textSize = columns == 48 ? 25f : 22f;
        float lineHeight = textSize * 1.45f;
        float margin = 16f;
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.BLACK);
        paint.setTextSize(textSize);
        paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL));

        List<ReceiptLine> lines = receiptLines(receipt, paint, width - margin * 2);
        int height = Math.max(1, Math.round(margin * 2 + lineHeight * lines.size()));
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        canvas.drawColor(Color.WHITE);
        float baseline = margin + textSize;
        for (ReceiptLine line : lines) {
            paint.setTypeface(Typeface.create(Typeface.SANS_SERIF, line.bold ? Typeface.BOLD : Typeface.NORMAL));
            if (line.separator) {
                canvas.drawLine(margin, baseline - textSize / 2, width - margin, baseline - textSize / 2, paint);
            } else if (line.right != null) {
                canvas.drawText(line.left, margin, baseline, paint);
                canvas.drawText(line.right, width - margin - paint.measureText(line.right), baseline, paint);
            } else {
                float x = line.centered ? (width - paint.measureText(line.left)) / 2 : margin;
                canvas.drawText(line.left, Math.max(margin, x), baseline, paint);
            }
            baseline += lineHeight;
        }

        boolean[][] pixels = new boolean[height][width];
        int[] row = new int[width];
        for (int y = 0; y < height; y++) {
            bitmap.getPixels(row, 0, width, 0, y, width, 1);
            for (int x = 0; x < width; x++) {
                pixels[y][x] = Color.red(row[x]) < 210;
            }
        }
        bitmap.recycle();
        return EscPosRaster.encode(pixels);
    }

    private static List<ReceiptLine> receiptLines(ReceiptPayload receipt, Paint paint, float availableWidth) {
        List<ReceiptLine> lines = new ArrayList<>();
        addWrapped(lines, receipt.storeName, paint, availableWidth, true, true);
        if (receipt.showAddress && hasText(receipt.address)) {
            addWrapped(lines, receipt.address, paint, availableWidth, true, false);
        }
        addWrapped(lines, receipt.header, paint, availableWidth, true, false);
        addWrapped(lines, receipt.documentNumber, paint, availableWidth, true, true);
        addWrapped(lines, receipt.occurredAt, paint, availableWidth, false, false);
        if (receipt.showCashier) {
            addWrapped(lines, receipt.labels.cashier + ": " + receipt.cashierName, paint, availableWidth, false, false);
        }
        if (hasText(receipt.marketplaceLabel)) {
            String marketplace = receipt.marketplaceLabel;
            if (hasText(receipt.externalOrderNumber)) {
                marketplace += " · " + receipt.labels.order + ": " + receipt.externalOrderNumber;
            }
            addWrapped(lines, marketplace, paint, availableWidth, false, true);
        }
        if (hasText(receipt.customerName)) {
            addWrapped(lines, receipt.labels.customer + ": " + receipt.customerName, paint, availableWidth, false, false);
        }
        if (hasText(receipt.customerEmail)) {
            addWrapped(lines, receipt.customerEmail, paint, availableWidth, false, false);
        }
        lines.add(ReceiptLine.separator());
        for (ReceiptPayload.Item item : receipt.items) {
            addWrapped(lines, item.name, paint, availableWidth, false, true);
            lines.add(columns(item.quantity + (hasText(item.unit) ? " " + item.unit : "") + " x " + money(item.unitPrice, receipt),
                    money(item.total, receipt), paint, availableWidth));
        }
        lines.add(ReceiptLine.separator());
        lines.add(columns(receipt.labels.subtotal, money(receipt.subtotal, receipt), paint, availableWidth));
        if (new BigDecimal(receipt.itemDiscount).signum() != 0) {
            lines.add(columns(receipt.labels.itemDiscount, "-" + money(receipt.itemDiscount, receipt), paint, availableWidth));
        }
        if (new BigDecimal(receipt.transactionDiscount).signum() != 0) {
            lines.add(columns(receipt.labels.transactionDiscount, "-" + money(receipt.transactionDiscount, receipt), paint, availableWidth));
        }
        ReceiptLine total = columns(receipt.labels.total, money(receipt.total, receipt), paint, availableWidth);
        total.bold = true;
        lines.add(total);
        lines.add(columns(receipt.labels.paid + (hasText(receipt.accountName) ? " " + receipt.accountName : ""),
                money(receipt.tenderedAmount, receipt), paint, availableWidth));
        lines.add(columns(receipt.labels.change, money(receipt.changeAmount, receipt), paint, availableWidth));
        lines.add(new ReceiptLine("", null, false, false, false));
        addWrapped(lines, receipt.footer, paint, availableWidth, true, false);
        return lines;
    }

    private static ReceiptLine columns(String left, String right, Paint paint, float width) {
        String clipped = left;
        float maximumLeftWidth = Math.max(0, width - paint.measureText(right) - paint.measureText("  "));
        while (clipped.length() > 1 && paint.measureText(clipped) > maximumLeftWidth) {
            clipped = clipped.substring(0, clipped.length() - 1);
        }
        if (!clipped.equals(left) && clipped.length() > 1) {
            clipped = clipped.substring(0, clipped.length() - 1) + "…";
        }
        return new ReceiptLine(clipped, right, false, false, false);
    }

    private static void addWrapped(List<ReceiptLine> lines, String value, Paint paint, float width, boolean centered, boolean bold) {
        String remaining = value == null ? "" : value.trim();
        if (remaining.isEmpty()) {
            return;
        }
        while (paint.measureText(remaining) > width) {
            int split = remaining.length();
            while (split > 1 && paint.measureText(remaining.substring(0, split)) > width) {
                split--;
            }
            int word = remaining.lastIndexOf(' ', split);
            if (word > 0) {
                split = word;
            }
            lines.add(new ReceiptLine(remaining.substring(0, split).trim(), null, centered, bold, false));
            remaining = remaining.substring(split).trim();
        }
        lines.add(new ReceiptLine(remaining, null, centered, bold, false));
    }

    private static String money(String raw, ReceiptPayload receipt) {
        Locale locale = "ms".equals(receipt.locale) ? new Locale("ms", "MY")
                : "vi".equals(receipt.locale) ? new Locale("vi", "VN")
                : "en".equals(receipt.locale) ? Locale.ENGLISH : new Locale("id", "ID");
        NumberFormat localeFormatter = NumberFormat.getNumberInstance(locale);
        DecimalFormat formatter = localeFormatter instanceof DecimalFormat
                ? (DecimalFormat) localeFormatter : new DecimalFormat("#,##0.####", DecimalFormatSymbols.getInstance(locale));
        formatter.setMinimumFractionDigits(receipt.currencyDecimalPlaces);
        formatter.setMaximumFractionDigits(receipt.currencyDecimalPlaces);
        String amount = formatter.format(new BigDecimal(raw));
        return "after".equals(receipt.currencySymbolPosition)
                ? amount + " " + receipt.currencySymbol
                : receipt.currencySymbol + amount;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static final class ReceiptLine {
        final String left;
        final String right;
        final boolean centered;
        boolean bold;
        final boolean separator;

        ReceiptLine(String left, String right, boolean centered, boolean bold, boolean separator) {
            this.left = left;
            this.right = right;
            this.centered = centered;
            this.bold = bold;
            this.separator = separator;
        }

        static ReceiptLine separator() {
            return new ReceiptLine("", null, false, false, true);
        }
    }
}
