package com.xsisten.app;

import android.content.Context;
import android.content.SharedPreferences;

public final class PrinterConfig {
    public final String transport;
    public final String target;
    public final String name;
    public final int port;
    public final int columns;

    public PrinterConfig(String transport, String target, String name, int port, int columns) {
        this.transport = transport;
        this.target = target;
        this.name = name;
        this.port = port;
        this.columns = columns;
    }

    public static PrinterConfig load(Context context, String storeId) {
        SharedPreferences values = context.getSharedPreferences("printer." + storeId, Context.MODE_PRIVATE);
        String transport = values.getString("transport", "");
        String target = values.getString("target", "");
        if (transport.isEmpty() || target.isEmpty()) {
            return null;
        }
        return new PrinterConfig(transport, target, values.getString("name", target), values.getInt("port", 9100),
                values.getInt("columns", 32));
    }

    public void save(Context context, String storeId) {
        context.getSharedPreferences("printer." + storeId, Context.MODE_PRIVATE).edit()
                .putString("transport", transport)
                .putString("target", target)
                .putString("name", name)
                .putInt("port", port)
                .putInt("columns", columns)
                .apply();
    }
}
