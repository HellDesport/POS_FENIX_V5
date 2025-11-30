using System.Text;

namespace Fenix.PrintService.Formatters
{
    public static class EscPosFormatter
    {
        // =============================
        //  Comandos ESC/POS básicos
        // =============================
        private static readonly byte[] AlignLeft   = new byte[] { 0x1B, 0x61, 0x00 };
        private static readonly byte[] AlignCenter = new byte[] { 0x1B, 0x61, 0x01 };
        private static readonly byte[] AlignRight  = new byte[] { 0x1B, 0x61, 0x02 };

        private static readonly byte[] BoldOn      = new byte[] { 0x1B, 0x45, 0x01 };
        private static readonly byte[] BoldOff     = new byte[] { 0x1B, 0x45, 0x00 };

        private static readonly byte[] SizeNormal  = new byte[] { 0x1D, 0x21, 0x00 };
        private static readonly byte[] SizeDouble  = new byte[] { 0x1D, 0x21, 0x11 }; // ancho+alto

        private static readonly byte[] CutPaper    = new byte[] { 0x1D, 0x56, 0x42, 0x00 }; // Corte total (GS V 66 0)

        // =============================
        // Construir ticket completo
        // =============================
        public static byte[] BuildTicket(List<string> lines, bool includeCut = true)
        {
            using var ms = new MemoryStream();

            // --------------------------------------
            //    MARGEN SUPERIOR (1 líneas)
            // --------------------------------------
            ms.Write(Encoding.UTF8.GetBytes("\n"));

            ms.Write(SizeNormal);
            ms.Write(BoldOff);
            ms.Write(AlignLeft);

            foreach (var line in lines)
            {
                if (line.StartsWith("**CENTER**"))
                {
                    ms.Write(AlignCenter);
                    WriteText(ms, line.Replace("**CENTER**", ""));
                    ms.Write(AlignLeft);
                }
                else if (line.StartsWith("**RIGHT**"))
                {
                    ms.Write(AlignRight);
                    WriteText(ms, line.Replace("**RIGHT**", ""));
                    ms.Write(AlignLeft);
                }
                else if (line.StartsWith("**BOLD**"))
                {
                    ms.Write(BoldOn);
                    WriteText(ms, line.Replace("**BOLD**", ""));
                    ms.Write(BoldOff);
                }
                else if (line.StartsWith("**BIG**"))
                {
                    ms.Write(SizeDouble);
                    WriteText(ms, line.Replace("**BIG**", ""));
                    ms.Write(SizeNormal);
                }
                else
                {
                    WriteText(ms, line);
                }
            }

            // --------------------------------------
            //  MARGEN INFERIOR (2 líneas)
            // --------------------------------------
            ms.Write(Encoding.UTF8.GetBytes("\n\n"));

            // --------------------------------------
            // Corte final (si aplica)
            // --------------------------------------
            if (includeCut)
                ms.Write(CutPaper);

            return ms.ToArray();
        }

        // =============================
        //  QR simple con ESC/POS
        // =============================
        public static byte[] EncodeQR(string data)
        {
            using var ms = new MemoryStream();
            var bytes = Encoding.UTF8.GetBytes(data);

            // Tamaño de módulo QR
            ms.Write(new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06 });

            // Store data
            int pL = (bytes.Length + 3) % 256;
            int pH = (bytes.Length + 3) / 256;
            ms.Write(new byte[] { 0x1D, 0x28, 0x6B, (byte)pL, (byte)pH, 0x31, 0x50, 0x30 });
            ms.Write(bytes);

            // Imprimir QR
            ms.Write(new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30 });

            return ms.ToArray();
        }

        // =============================
        //  Helper: escribir texto
        // =============================
        private static void WriteText(MemoryStream ms, string text)
        {
            var t = Encoding.UTF8.GetBytes(text + "\n");
            ms.Write(t);
        }
    }

    // Extensión para memoria
    public static class StreamExtensions
    {
        public static void Write(this MemoryStream ms, byte[] bytes)
        {
            ms.Write(bytes, 0, bytes.Length);
        }
    }
}
