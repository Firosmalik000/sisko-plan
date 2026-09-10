package com.xsisten.app;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;

public final class LanPrinterTransport implements PrinterTransport {
    private final String host;
    private final int port;

    public LanPrinterTransport(String host, int port) {
        this.host = host;
        this.port = port;
    }

    @Override
    public void print(byte[] data) throws IOException {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 5000);
            socket.setSoTimeout(5000);
            socket.getOutputStream().write(data);
            socket.getOutputStream().flush();
        } catch (IOException exception) {
            throw new PrinterException(PrinterException.Code.CONNECTION_FAILED, exception);
        }
    }
}
