package com.xsisten.app;

import java.io.IOException;

public final class PrinterException extends IOException {
    public enum Code {
        BLUETOOTH_OFF,
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
