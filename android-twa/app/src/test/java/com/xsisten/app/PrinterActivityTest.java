package com.xsisten.app;

import static org.junit.Assert.assertEquals;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import org.junit.Test;

public class PrinterActivityTest {
    @Test
    public void selectsTheOnlyPrinterPairedWhileBluetoothSettingsWasOpen() {
        String selected = PrinterActivity.preferredBondedDevice(
                new HashSet<>(Collections.singletonList("AA:AA:AA:AA:AA:AA")),
                new HashSet<>(Arrays.asList("AA:AA:AA:AA:AA:AA", "BB:BB:BB:BB:BB:BB")),
                "AA:AA:AA:AA:AA:AA");

        assertEquals("BB:BB:BB:BB:BB:BB", selected);
    }

    @Test
    public void keepsTheCurrentPrinterWhenNoSingleNewPrinterExists() {
        String selected = PrinterActivity.preferredBondedDevice(
                Collections.emptySet(),
                new HashSet<>(Arrays.asList("AA:AA:AA:AA:AA:AA", "BB:BB:BB:BB:BB:BB")),
                "AA:AA:AA:AA:AA:AA");

        assertEquals("AA:AA:AA:AA:AA:AA", selected);
    }
}
