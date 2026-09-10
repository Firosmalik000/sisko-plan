package com.xsisten.app;

import java.io.IOException;

public interface PrinterTransport {
    void print(byte[] data) throws IOException;
}
