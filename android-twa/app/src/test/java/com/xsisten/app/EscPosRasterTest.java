package com.xsisten.app;

import static org.junit.Assert.assertArrayEquals;

import org.junit.Test;

public class EscPosRasterTest {
    @Test
    public void packsPixelsIntoEscPosRasterBytes() {
        boolean[][] pixels = {
            {true, false, true, false, true, false, true, false, true},
            {false, true, false, true, false, true, false, true, false}
        };

        assertArrayEquals(new byte[] {
            0x1B, 0x40,
            0x1D, 0x76, 0x30, 0x00, 0x02, 0x00, 0x02, 0x00,
            (byte) 0xAA, (byte) 0x80, 0x55, 0x00,
            0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00
        }, EscPosRaster.encode(pixels));
    }
}
