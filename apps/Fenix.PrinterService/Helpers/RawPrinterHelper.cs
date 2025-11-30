using System;
using System.Runtime.InteropServices;

namespace Fenix.PrintService.Helpers
{
    public static class RawPrinterHelper
    {
        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA",
            SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
        private static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter",
            SetLastError = true, ExactSpelling = true)]
        private static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA",
            SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true)]
        private static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] ref DOCINFOA di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter",
            SetLastError = true, ExactSpelling = true)]
        private static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter",
            SetLastError = true, ExactSpelling = true)]
        private static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter",
            SetLastError = true, ExactSpelling = true)]
        private static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter",
            SetLastError = true, ExactSpelling = true)]
        private static extern bool WritePrinter(IntPtr hPrinter, IntPtr buffer, int buf, out int pcWritten);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public struct DOCINFOA
        {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
        }

        // ============================================================
        //  MÉTODO PRINCIPAL USADO POR EL PRINTERSERVICE
        // ============================================================
        public static bool SendBytesToPrinter(string printerName, byte[] buffer)
        {
            IntPtr hPrinter;
            IntPtr unmanagedPointer;
            int bytesWritten;

            // 1. Abrir impresora
            if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
                return false;

            try
            {
                DOCINFOA di = new DOCINFOA
                {
                    pDocName = "Fenix Ticket",
                    pDataType = "RAW"
                };

                // 2. Iniciar documento
                if (!StartDocPrinter(hPrinter, 1, ref di))
                    return false;

                try
                {
                    // 3. Iniciar página
                    if (!StartPagePrinter(hPrinter))
                        return false;

                    try
                    {
                        // 4. Copiar bytes a memoria no administrada
                        unmanagedPointer = Marshal.AllocHGlobal(buffer.Length);
                        Marshal.Copy(buffer, 0, unmanagedPointer, buffer.Length);

                        // 5. Ejecutar WritePrinter
                        bool ok = WritePrinter(hPrinter, unmanagedPointer, buffer.Length, out bytesWritten);

                        Marshal.FreeHGlobal(unmanagedPointer);
                        return ok;
                    }
                    finally
                    {
                        EndPagePrinter(hPrinter);
                    }
                }
                finally
                {
                    EndDocPrinter(hPrinter);
                }
            }
            finally
            {
                ClosePrinter(hPrinter);
            }
        }
    }
}
