package com.xsisten.app;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import java.io.IOException;
import java.util.UUID;

public final class BluetoothPrinterTransport implements PrinterTransport {
    private static final UUID SERIAL_PORT = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private final String address;

    public BluetoothPrinterTransport(String address) {
        this.address = address;
    }

    @Override
    @SuppressLint("MissingPermission")
    public void print(byte[] data) throws IOException {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            throw new PrinterException(PrinterException.Code.BLUETOOTH_OFF);
        }
        BluetoothDevice device = adapter.getRemoteDevice(address);
        try (BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SERIAL_PORT)) {
            socket.connect();
            socket.getOutputStream().write(data);
            socket.getOutputStream().flush();
        } catch (IOException exception) {
            throw new PrinterException(PrinterException.Code.CONNECTION_FAILED, exception);
        }
    }
}
