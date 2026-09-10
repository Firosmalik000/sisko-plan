package com.xsisten.app;

import java.util.List;

public final class ReceiptPayload {
    public final String locale;
    public final String currencySymbol;
    public final int currencyDecimalPlaces;
    public final String currencySymbolPosition;
    public final String storeName;
    public final String address;
    public final String header;
    public final String footer;
    public final boolean showAddress;
    public final boolean showCashier;
    public final String documentNumber;
    public final String occurredAt;
    public final String cashierName;
    public final String customerName;
    public final String customerEmail;
    public final String marketplaceLabel;
    public final String externalOrderNumber;
    public final String subtotal;
    public final String itemDiscount;
    public final String transactionDiscount;
    public final String total;
    public final String accountName;
    public final String tenderedAmount;
    public final String changeAmount;
    public final List<Item> items;
    public final Labels labels;

    public ReceiptPayload(String locale, String currencySymbol, int currencyDecimalPlaces,
            String currencySymbolPosition, String storeName, String address, String header, String footer,
            boolean showAddress, boolean showCashier, String documentNumber, String occurredAt, String cashierName,
            String customerName, String customerEmail, String marketplaceLabel, String externalOrderNumber,
            String subtotal, String itemDiscount, String transactionDiscount, String total,
            String accountName, String tenderedAmount, String changeAmount, List<Item> items, Labels labels) {
        this.locale = locale;
        this.currencySymbol = currencySymbol;
        this.currencyDecimalPlaces = currencyDecimalPlaces;
        this.currencySymbolPosition = currencySymbolPosition;
        this.storeName = storeName;
        this.address = address;
        this.header = header;
        this.footer = footer;
        this.showAddress = showAddress;
        this.showCashier = showCashier;
        this.documentNumber = documentNumber;
        this.occurredAt = occurredAt;
        this.cashierName = cashierName;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.marketplaceLabel = marketplaceLabel;
        this.externalOrderNumber = externalOrderNumber;
        this.subtotal = subtotal;
        this.itemDiscount = itemDiscount;
        this.transactionDiscount = transactionDiscount;
        this.total = total;
        this.accountName = accountName;
        this.tenderedAmount = tenderedAmount;
        this.changeAmount = changeAmount;
        this.items = items;
        this.labels = labels;
    }

    public static final class Item {
        public final String name;
        public final String unit;
        public final String quantity;
        public final String unitPrice;
        public final String total;

        public Item(String name, String unit, String quantity, String unitPrice, String total) {
            this.name = name;
            this.unit = unit;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.total = total;
        }
    }

    public static final class Labels {
        public final String cashier;
        public final String customer;
        public final String order;
        public final String subtotal;
        public final String itemDiscount;
        public final String transactionDiscount;
        public final String total;
        public final String paid;
        public final String change;

        public Labels(String cashier, String customer, String order, String subtotal, String itemDiscount,
                String transactionDiscount, String total, String paid, String change) {
            this.cashier = cashier;
            this.customer = customer;
            this.order = order;
            this.subtotal = subtotal;
            this.itemDiscount = itemDiscount;
            this.transactionDiscount = transactionDiscount;
            this.total = total;
            this.paid = paid;
            this.change = change;
        }
    }
}
