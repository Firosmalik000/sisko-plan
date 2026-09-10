package com.xsisten.app;

import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import java.io.IOException;

public final class UsbPrinterTransport implements PrinterTransport {
    private final UsbManager manager;
    private final UsbDevice device;

    public UsbPrinterTransport(UsbManager manager, UsbDevice device) {
        this.manager = manager;
        this.device = device;
    }

    @Override
    public void print(byte[] data) throws IOException {
        if (!manager.hasPermission(device)) {
            throw new PrinterException(PrinterException.Code.USB_PERMISSION_REQUIRED);
        }
        UsbInterface printerInterface = null;
        UsbEndpoint outputEndpoint = null;
        for (int interfaceIndex = 0; interfaceIndex < device.getInterfaceCount(); interfaceIndex++) {
            UsbInterface candidate = device.getInterface(interfaceIndex);
            for (int endpointIndex = 0; endpointIndex < candidate.getEndpointCount(); endpointIndex++) {
                UsbEndpoint endpoint = candidate.getEndpoint(endpointIndex);
                if (endpoint.getDirection() == UsbConstants.USB_DIR_OUT
                        && endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                    printerInterface = candidate;
                    outputEndpoint = endpoint;
                    break;
                }
            }
            if (outputEndpoint != null) {
                break;
            }
        }
        if (printerInterface == null || outputEndpoint == null) {
            throw new PrinterException(PrinterException.Code.USB_ENDPOINT_MISSING);
        }
        UsbDeviceConnection connection = manager.openDevice(device);
        if (connection == null || !connection.claimInterface(printerInterface, true)) {
            throw new PrinterException(PrinterException.Code.USB_OPEN_FAILED);
        }
        try {
            int written = connection.bulkTransfer(outputEndpoint, data, data.length, 10000);
            if (written != data.length) {
                throw new PrinterException(PrinterException.Code.USB_WRITE_FAILED);
            }
        } finally {
            connection.releaseInterface(printerInterface);
            connection.close();
        }
    }
}
