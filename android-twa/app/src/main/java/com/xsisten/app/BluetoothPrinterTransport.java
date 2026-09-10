package com.xsisten.app;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;

public final class BluetoothPrinterTransport implements PrinterTransport {
    private static final UUID SERIAL_PORT = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final Object PRINT_LOCK = new Object();
    private static final int CHUNK_SIZE = 512;
    private static final int CONNECT_SETTLE_MILLIS = 300;
    private static final int CHUNK_PAUSE_MILLIS = 50;
    private static final int CLOSE_SETTLE_MILLIS = 500;
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
        synchronized (PRINT_LOCK) {
            try {
                BluetoothDevice device = adapter.getRemoteDevice(address);
                if (device.getBondState() != BluetoothDevice.BOND_BONDED) {
                    throw new PrinterException(PrinterException.Code.BLUETOOTH_NOT_PAIRED);
                }
                print(device, data);
            } catch (PrinterException exception) {
                throw exception;
            } catch (SecurityException exception) {
                throw new PrinterException(PrinterException.Code.BLUETOOTH_PERMISSION_REQUIRED, exception);
            }
        }
    }

    private void print(BluetoothDevice device, byte[] data) throws IOException {
        try (BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SERIAL_PORT)) {
            try {
                socket.connect();
            } catch (IOException exception) {
                throw new PrinterException(PrinterException.Code.BLUETOOTH_CONNECTION_FAILED, exception);
            }
            try {
                pause(CONNECT_SETTLE_MILLIS);
                writeInChunks(socket.getOutputStream(), data, CHUNK_SIZE, CHUNK_PAUSE_MILLIS);
                pause(CLOSE_SETTLE_MILLIS);
            } catch (IOException exception) {
                throw new PrinterException(PrinterException.Code.BLUETOOTH_WRITE_FAILED, exception);
            }
        } catch (PrinterException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new PrinterException(PrinterException.Code.BLUETOOTH_CONNECTION_FAILED, exception);
        }
    }

    static void writeInChunks(OutputStream output, byte[] data, int chunkSize, int pauseMillis) throws IOException {
        for (int offset = 0; offset < data.length; offset += chunkSize) {
            int length = Math.min(chunkSize, data.length - offset);
            output.write(data, offset, length);
            output.flush();
            pause(pauseMillis);
        }
    }

    private static void pause(int millis) throws IOException {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IOException("Bluetooth printing was interrupted.", exception);
        }
    }
}
