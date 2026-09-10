package com.xsisten.app;

import java.io.ByteArrayOutputStream;

public final class EscPosRaster {
    private EscPosRaster() {}

    public static byte[] encode(boolean[][] pixels) {
        int height = pixels.length;
        int width = height == 0 ? 0 : pixels[0].length;
        int widthBytes = (width + 7) / 8;
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        output.write(0x1B);
        output.write(0x40);
        output.write(0x1D);
        output.write(0x76);
        output.write(0x30);
        output.write(0x00);
        output.write(widthBytes & 0xFF);
        output.write((widthBytes >> 8) & 0xFF);
        output.write(height & 0xFF);
        output.write((height >> 8) & 0xFF);
        for (boolean[] row : pixels) {
            for (int byteIndex = 0; byteIndex < widthBytes; byteIndex++) {
                int value = 0;
                for (int bit = 0; bit < 8; bit++) {
                    int column = byteIndex * 8 + bit;
                    if (column < width && row[column]) {
                        value |= 1 << (7 - bit);
                    }
                }
                output.write(value);
            }
        }
        output.write('\n');
        output.write('\n');
        output.write('\n');
        output.write(0x1D);
        output.write(0x56);
        output.write(0x00);
        return output.toByteArray();
    }
}
