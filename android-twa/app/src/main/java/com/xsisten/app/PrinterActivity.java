package com.xsisten.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PendingIntent;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class PrinterActivity extends Activity {
    private static final int BLUETOOTH_PERMISSION_REQUEST = 41;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private String storeId;
    private String payloadUrl;
    private TextView status;
    private Spinner transport;
    private Spinner device;
    private Spinner paper;
    private EditText host;
    private EditText port;
    private final List<DeviceChoice> choices = new ArrayList<>();
    private boolean settingsMode;
    private PrinterConfig pendingConfig;
    private byte[] pendingBytes;
    private String activityLocale = Locale.getDefault().getLanguage();

    @Override
    protected void onCreate(Bundle state) {
        applyLocale();
        super.onCreate(state);
        Uri data = getIntent().getData();
        storeId = data == null ? "" : safe(data.getQueryParameter("store_id"));
        payloadUrl = data == null ? "" : safe(data.getQueryParameter("payload_url"));
        if (storeId.isEmpty()) {
            showPrintStatus(getString(R.string.printer_invalid_job), false, false);
            return;
        }
        settingsMode = data != null && "settings".equals(data.getLastPathSegment());
        if (settingsMode) {
            showSettings();
        } else {
            showPrintStatus(getString(R.string.printer_printing), true, false);
            printPayload();
        }
    }

    private void applyLocale() {
        Uri data = getIntent().getData();
        String language = data == null ? "" : safe(data.getQueryParameter("locale"));
        if (!Arrays.asList("id", "en", "ms", "vi").contains(language)) {
            return;
        }
        activityLocale = language;
        Configuration configuration = getResources().getConfiguration();
        configuration.setLocale(new Locale(language));
        getResources().updateConfiguration(configuration, getResources().getDisplayMetrics());
    }

    private void showSettings() {
        LinearLayout root = root();
        root.addView(title(getString(R.string.printer_settings_title)));
        root.addView(body(getString(R.string.printer_settings_description)));
        transport = spinner(Arrays.asList("Bluetooth", "USB / OTG", "Wi-Fi / LAN"));
        root.addView(label(getString(R.string.printer_connection)));
        root.addView(transport);
        device = spinner(new ArrayList<>());
        root.addView(label(getString(R.string.printer_device)));
        root.addView(device);
        Button pair = button(getString(R.string.printer_pair));
        pair.setOnClickListener(view -> startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS)));
        root.addView(pair);
        host = input(getString(R.string.printer_host));
        port = input(getString(R.string.printer_port));
        port.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        root.addView(host);
        root.addView(port);
        paper = spinner(Arrays.asList("58 mm", "80 mm"));
        root.addView(label(getString(R.string.printer_paper)));
        root.addView(paper);
        status = body("");
        root.addView(status);
        Button save = primaryButton(getString(R.string.printer_save));
        save.setOnClickListener(view -> saveSettings(false));
        root.addView(save);
        Button test = button(getString(R.string.printer_test));
        test.setOnClickListener(view -> saveSettings(true));
        root.addView(test);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        setContentView(scroll);

        PrinterConfig saved = PrinterConfig.load(this, storeId);
        if (saved != null) {
            transport.setSelection("bluetooth".equals(saved.transport) ? 0 : "usb".equals(saved.transport) ? 1 : 2);
            paper.setSelection(saved.columns == 48 ? 1 : 0);
            if ("lan".equals(saved.transport)) {
                host.setText(saved.target);
                port.setText(String.valueOf(saved.port));
            }
        }
        transport.setOnItemSelectedListener(new SimpleItemSelectedListener(position -> refreshTransport(position, saved)));
        refreshTransport(transport.getSelectedItemPosition(), saved);
    }

    @SuppressLint("MissingPermission")
    private void refreshTransport(int position, PrinterConfig saved) {
        boolean lan = position == 2;
        host.setVisibility(lan ? View.VISIBLE : View.GONE);
        port.setVisibility(lan ? View.VISIBLE : View.GONE);
        device.setVisibility(lan ? View.GONE : View.VISIBLE);
        choices.clear();
        if (position == 0) {
            if (!hasBluetoothPermission()) {
                requestPermissions(new String[] {Manifest.permission.BLUETOOTH_CONNECT}, BLUETOOTH_PERMISSION_REQUEST);
                return;
            }
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter != null) {
                for (BluetoothDevice item : adapter.getBondedDevices()) {
                    choices.add(new DeviceChoice(item.getAddress(), item.getName() == null ? item.getAddress() : item.getName()));
                }
            }
        } else if (position == 1) {
            UsbManager manager = (UsbManager) getSystemService(USB_SERVICE);
            for (UsbDevice item : manager.getDeviceList().values()) {
                choices.add(new DeviceChoice(usbTarget(item), item.getProductName() == null ? item.getDeviceName() : item.getProductName()));
            }
        }
        if (choices.isEmpty()) {
            choices.add(new DeviceChoice("", getString(R.string.printer_no_devices)));
        }
        device.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, choices));
        if (saved != null && ((position == 0 && "bluetooth".equals(saved.transport)) || (position == 1 && "usb".equals(saved.transport)))) {
            for (int index = 0; index < choices.size(); index++) {
                if (saved.target.equals(choices.get(index).target)) {
                    device.setSelection(index);
                    break;
                }
            }
        }
    }

    private void saveSettings(boolean test) {
        int position = transport.getSelectedItemPosition();
        String type = position == 0 ? "bluetooth" : position == 1 ? "usb" : "lan";
        String target;
        String name;
        int targetPort = 9100;
        if (position == 2) {
            target = host.getText().toString().trim();
            name = target;
            try {
                targetPort = Integer.parseInt(port.getText().toString().trim().isEmpty() ? "9100" : port.getText().toString().trim());
            } catch (NumberFormatException exception) {
                targetPort = -1;
            }
        } else {
            DeviceChoice selected = device.getSelectedItem() instanceof DeviceChoice ? (DeviceChoice) device.getSelectedItem() : null;
            target = selected == null ? "" : selected.target;
            name = selected == null ? "" : selected.name;
        }
        if (target.isEmpty() || targetPort < 1 || targetPort > 65535) {
            status.setText(R.string.printer_required);
            return;
        }
        PrinterConfig config = new PrinterConfig(type, target, name, targetPort, paper.getSelectedItemPosition() == 1 ? 48 : 32);
        config.save(this, storeId);
        status.setText(R.string.printer_saved);
        if (test) {
            ReceiptPayload sample = new ReceiptPayload(activityLocale, "Rp", 0, "before", "XSISTEN", null,
                    getString(R.string.printer_test),
                    getString(R.string.printer_success), false, false, "TEST-PRINT", "", "", null, null, null, null,
                    "10000", "0", "0", "10000",
                    "", "10000", "0", Arrays.asList(new ReceiptPayload.Item(getString(R.string.printer_test_item), "", "1", "10000", "10000")),
                    new ReceiptPayload.Labels(getString(R.string.receipt_cashier), getString(R.string.receipt_customer),
                            getString(R.string.receipt_order),
                            getString(R.string.receipt_subtotal), getString(R.string.receipt_item_discount),
                            getString(R.string.receipt_transaction_discount), getString(R.string.receipt_total),
                            getString(R.string.receipt_paid), getString(R.string.receipt_change)));
            send(config, ReceiptBitmapEncoder.encode(sample, config.columns));
        }
    }

    private void printPayload() {
        PrinterConfig config = PrinterConfig.load(this, storeId);
        if (config == null) {
            showPrintStatus(getString(R.string.printer_missing), false, false);
            return;
        }
        if (!validPayloadUrl(payloadUrl)) {
            showPrintStatus(getString(R.string.printer_invalid_job), false, false);
            return;
        }
        if ("bluetooth".equals(config.transport) && !hasBluetoothPermission()) {
            requestPermissions(new String[] {Manifest.permission.BLUETOOTH_CONNECT}, BLUETOOTH_PERMISSION_REQUEST);
            return;
        }
        executor.execute(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(payloadUrl).openConnection();
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setRequestProperty("Accept", "application/json");
                if (connection.getResponseCode() != 200) {
                    throw new PrinterException(PrinterException.Code.CONNECTION_FAILED);
                }
                StringBuilder json = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        json.append(line);
                    }
                } finally {
                    connection.disconnect();
                }
                ReceiptPayload receipt = ReceiptPayloadJson.parse(json.toString());
                sendNow(config, ReceiptBitmapEncoder.encode(receipt, config.columns));
                runOnUiThread(this::showPrintSuccess);
            } catch (Exception exception) {
                runOnUiThread(() -> showPrintStatus(errorMessage(exception), false, true));
            }
        });
    }

    private void send(PrinterConfig config, byte[] bytes) {
        if ("bluetooth".equals(config.transport) && !hasBluetoothPermission()) {
            pendingConfig = config;
            pendingBytes = bytes;
            requestPermissions(new String[] {Manifest.permission.BLUETOOTH_CONNECT}, BLUETOOTH_PERMISSION_REQUEST);
            return;
        }
        status.setText(R.string.printer_printing);
        executor.execute(() -> {
            try {
                sendNow(config, bytes);
                runOnUiThread(() -> status.setText(R.string.printer_success));
            } catch (Exception exception) {
                runOnUiThread(() -> status.setText(errorMessage(exception)));
            }
        });
    }

    private void sendNow(PrinterConfig config, byte[] bytes) throws Exception {
        PrinterTransport selected;
        if ("bluetooth".equals(config.transport)) {
            selected = new BluetoothPrinterTransport(config.target);
        } else if ("usb".equals(config.transport)) {
            UsbManager manager = (UsbManager) getSystemService(USB_SERVICE);
            UsbDevice usb = findUsb(manager, config.target);
            if (usb == null) {
                throw new PrinterException(PrinterException.Code.CONNECTION_FAILED);
            }
            if (!manager.hasPermission(usb)) {
                PendingIntent permission = PendingIntent.getBroadcast(this, 0, new Intent(getPackageName() + ".USB_PERMISSION"),
                        PendingIntent.FLAG_IMMUTABLE);
                manager.requestPermission(usb, permission);
                throw new PrinterException(PrinterException.Code.USB_PERMISSION_REQUIRED);
            }
            selected = new UsbPrinterTransport(manager, usb);
        } else {
            selected = new LanPrinterTransport(config.target, config.port);
        }
        selected.print(bytes);
    }

    private UsbDevice findUsb(UsbManager manager, String target) {
        for (UsbDevice device : manager.getDeviceList().values()) {
            if (usbTarget(device).equals(target)) {
                return device;
            }
        }
        return null;
    }

    private String usbTarget(UsbDevice device) {
        return device.getVendorId() + ":" + device.getProductId();
    }

    private boolean validPayloadUrl(String value) {
        try {
            URL url = new URL(value);
            return "https".equals(url.getProtocol()) && "xsisten.com".equals(url.getHost()) && url.getPath().startsWith("/native-print/sales/");
        } catch (Exception exception) {
            return false;
        }
    }

    private String errorMessage(Exception exception) {
        PrinterException.Code code = exception instanceof PrinterException ? ((PrinterException) exception).code : PrinterException.Code.CONNECTION_FAILED;
        switch (code) {
            case BLUETOOTH_OFF: return getString(R.string.printer_bt_off);
            case USB_PERMISSION_REQUIRED: return getString(R.string.printer_usb_permission);
            case USB_ENDPOINT_MISSING: return getString(R.string.printer_usb_endpoint);
            case USB_OPEN_FAILED: return getString(R.string.printer_usb_open);
            case USB_WRITE_FAILED: return getString(R.string.printer_usb_write);
            default: return getString(R.string.printer_connection_failed);
        }
    }

    private void showPrintStatus(String message, boolean busy, boolean allowRetry) {
        LinearLayout root = root();
        root.setGravity(android.view.Gravity.CENTER);
        root.addView(title(getString(R.string.printer_settings_title)));
        status = body(message);
        status.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        root.addView(status);
        if (!busy && allowRetry) {
            Button retry = primaryButton(getString(R.string.printer_retry));
            retry.setOnClickListener(view -> {
                showPrintStatus(getString(R.string.printer_printing), true, false);
                printPayload();
            });
            root.addView(retry);
        }
        if (!busy) {
            Button close = button(getString(R.string.printer_close));
            close.setOnClickListener(view -> finish());
            root.addView(close);
        }
        setContentView(root);
    }

    private void showPrintSuccess() {
        showPrintStatus(getString(R.string.printer_success), true, false);
        status.postDelayed(this::finish, 900);
    }

    private LinearLayout root() {
        LinearLayout view = new LinearLayout(this);
        view.setOrientation(LinearLayout.VERTICAL);
        view.setPadding(dp(24), dp(36), dp(24), dp(24));
        view.setBackgroundColor(Color.rgb(255, 248, 245));
        return view;
    }

    private TextView title(String text) { TextView view = body(text); view.setTextSize(26); view.setTextColor(Color.rgb(45, 41, 40)); view.setPadding(0, 0, 0, dp(12)); return view; }
    private TextView label(String text) { TextView view = body(text); view.setTextColor(Color.rgb(45, 41, 40)); view.setPadding(0, dp(14), 0, dp(6)); return view; }
    private TextView body(String text) { TextView view = new TextView(this); view.setText(text); view.setTextSize(16); view.setTextColor(Color.rgb(111, 103, 100)); view.setPadding(0, dp(6), 0, dp(10)); return view; }
    private EditText input(String hint) { EditText view = new EditText(this); view.setHint(hint); view.setTextSize(16); view.setMinHeight(dp(48)); return view; }
    private Spinner spinner(List<?> items) { Spinner view = new Spinner(this); view.setMinimumHeight(dp(48)); view.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, items)); return view; }
    private Button button(String text) { Button view = new Button(this); view.setText(text); view.setMinHeight(dp(48)); return view; }
    private Button primaryButton(String text) {
        Button view = button(text);
        view.setTextColor(Color.WHITE);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(238, 77, 45));
        background.setCornerRadius(dp(10));
        view.setBackground(background);
        return view;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private static String safe(String value) { return value == null ? "" : value; }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }

    private static final class DeviceChoice {
        final String target;
        final String name;
        DeviceChoice(String target, String name) { this.target = target; this.name = name; }
        @Override public String toString() { return name; }
    }

    private interface SelectionCallback { void selected(int position); }
    private static final class SimpleItemSelectedListener implements android.widget.AdapterView.OnItemSelectedListener {
        private final SelectionCallback callback;
        SimpleItemSelectedListener(SelectionCallback callback) { this.callback = callback; }
        @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) { callback.selected(position); }
        @Override public void onNothingSelected(android.widget.AdapterView<?> parent) {}
    }

    private boolean hasBluetoothPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == BLUETOOTH_PERMISSION_REQUEST) {
            if (grantResults.length == 0 || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                if (status != null) {
                    status.setText(R.string.printer_bt_off);
                }
                return;
            }
            if (settingsMode && pendingConfig == null) {
                showSettings();
            } else if (pendingConfig != null && pendingBytes != null) {
                PrinterConfig config = pendingConfig;
                byte[] bytes = pendingBytes;
                pendingConfig = null;
                pendingBytes = null;
                send(config, bytes);
            } else {
                showPrintStatus(getString(R.string.printer_printing), true, false);
                printPayload();
            }
        }
    }
}
