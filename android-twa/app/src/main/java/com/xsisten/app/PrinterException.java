package com.xsisten.app;

import java.io.IOException;

public final class PrinterException extends IOException {
    public enum Code {
        BLUETOOTH_OFF,
        BLUETOOTH_PERMISSION_REQUIRED,
        BLUETOOTH_NOT_PAIRED,
        BLUETOOTH_CONNECTION_FAILED,
        BLUETOOTH_WRITE_FAILED,
        USB_PERMISSION_REQUIRED,
        USB_ENDPOINT_MISSING,
        USB_OPEN_FAILED,
        USB_WRITE_FAILED,
        CONNECTION_FAILED
    }

    public final Code code;

    public PrinterException(Code code) {
        super(code.name());
        this.code = code;
    }

    public PrinterException(Code code, Throwable cause) {
        super(code.name(), cause);
        this.code = code;
    }
}
