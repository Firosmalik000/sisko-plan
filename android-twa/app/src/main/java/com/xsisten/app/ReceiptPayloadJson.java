package com.xsisten.app;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class ReceiptPayloadJson {
    private ReceiptPayloadJson() {}

    public static ReceiptPayload parse(String json) throws JSONException {
        JSONObject root = new JSONObject(json);
        JSONObject receipt = root.getJSONObject("receipt");
        JSONObject sale = root.getJSONObject("sale");
        JSONObject payment = root.getJSONObject("payment");
        JSONObject labels = root.getJSONObject("labels");
        JSONObject currencyFormat = root.getJSONObject("currency_format");
        JSONArray rows = root.getJSONArray("items");
        List<ReceiptPayload.Item> items = new ArrayList<>();
        for (int index = 0; index < rows.length(); index++) {
            JSONObject item = rows.getJSONObject(index);
            items.add(new ReceiptPayload.Item(item.getString("product_name"), item.getString("unit_symbol"),
                    item.getString("quantity"), item.getString("unit_price"), item.getString("net_total")));
        }
        return new ReceiptPayload(root.optString("locale", "id"), currencyFormat.getString("symbol"),
                currencyFormat.getInt("decimal_places"),
                currencyFormat.getString("symbol_position"),
                receipt.getString("store_name"), nullable(receipt, "address"), receipt.getString("header"),
                receipt.getString("footer"), receipt.getBoolean("show_address"), receipt.getBoolean("show_cashier"),
                sale.getString("document_number"), sale.getString("occurred_at"), sale.getString("cashier_name"),
                nullable(sale, "customer_name"), nullable(sale, "customer_email"), nullable(sale, "marketplace_label"),
                nullable(sale, "external_order_number"), sale.getString("subtotal"), sale.getString("item_discount_amount"),
                sale.getString("transaction_discount_amount"), sale.getString("total_amount"),
                payment.getString("account_name"), payment.getString("tendered_amount"), payment.getString("change_amount"),
                items, new ReceiptPayload.Labels(labels.getString("cashier"), labels.getString("customer"),
                        labels.getString("order"), labels.getString("subtotal"), labels.getString("item_discount"),
                        labels.getString("transaction_discount"), labels.getString("total"), labels.getString("paid"),
                        labels.getString("change")));
    }

    private static String nullable(JSONObject object, String key) {
        return object.isNull(key) ? null : object.optString(key, null);
    }
}
