param(
    [string]$PrinterName = "",
    [int]$Pin = 2
)

$ErrorActionPreference = "Stop"

try {
    # If no printer name provided, detect default Windows printer
    if ([string]::IsNullOrWhiteSpace($PrinterName)) {
        $defaultPrinter = Get-CimInstance Win32_Printer -Filter "Default = True" -ErrorAction SilentlyContinue
        if ($defaultPrinter) {
            $PrinterName = $defaultPrinter.Name
        } else {
            $firstPrinter = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($firstPrinter) {
                $PrinterName = $firstPrinter.Name
            }
        }
    }

    if ([string]::IsNullOrWhiteSpace($PrinterName)) {
        Write-Output "ERROR: No printer specified or detected."
        exit 1
    }

    # Add Win32 RawPrinterHelper definition
    $typeDefinition = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterKickHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendRawBytes(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "DRAWER_KICK";
        di.pDataType = "RAW";
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int dwWritten;
                    WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
            return true;
        }
        return false;
    }
}
"@

    if (-not ([System.Management.Automation.PSTypeName]'RawPrinterKickHelper').Type) {
        Add-Type -TypeDefinition $typeDefinition
    }

    # Pulse bytes:
    # Pin 2: 0x1B 0x70 0x00 0x19 0xFA (ESC p 0 25 250)
    # Pin 5: 0x1B 0x70 0x01 0x19 0xFA (ESC p 1 25 250)
    # Star BEL: 0x07
    [byte[]]$kickBytes = @(27, 112, 0, 25, 250, 27, 112, 1, 25, 250, 7)

    $result = [RawPrinterKickHelper]::SendRawBytes($PrinterName, $kickBytes)
    if ($result) {
        Write-Output "SUCCESS: Drawer kick signal sent to $PrinterName"
        exit 0
    } else {
        Write-Output "ERROR: Failed to open printer $PrinterName"
        exit 1
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    exit 1
}
