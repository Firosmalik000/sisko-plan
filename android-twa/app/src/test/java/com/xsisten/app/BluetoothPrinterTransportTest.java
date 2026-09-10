package com.xsisten.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class BluetoothPrinterTransportTest {
    @Test
    public void writesTheCompleteJobInBoundedChunks() throws Exception {
        RecordingOutputStream output = new RecordingOutputStream();
        byte[] job = new byte[] {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};

        BluetoothPrinterTransport.writeInChunks(output, job, 4, 0);

        assertArrayEquals(job, output.bytes.toByteArray());
        assertEquals(Arrays.asList(4, 4, 2), output.writeSizes);
        assertEquals(3, output.flushCount);
    }

    private static final class RecordingOutputStream extends OutputStream {
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        final List<Integer> writeSizes = new ArrayList<>();
        int flushCount;

        @Override
        public void write(int value) {
            bytes.write(value);
        }

        @Override
        public void write(byte[] values, int offset, int length) {
            writeSizes.add(length);
            bytes.write(values, offset, length);
        }

        @Override
        public void flush() throws IOException {
            flushCount++;
        }
    }
}
