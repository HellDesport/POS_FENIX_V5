using System.Collections.Generic;
using System.Drawing.Printing;
using System.Runtime.Versioning;

namespace Fenix.PrintService.Services
{
    [SupportedOSPlatform("windows")]
    public class PrinterManager
    {
        public List<string> GetInstalledPrinters()
        {
            var list = new List<string>();

            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                list.Add(printer);
            }

            return list;
        }
    }
}
