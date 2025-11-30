namespace Fenix.PrintService.Models
{
    public class PrintJob
    {
        public string PrinterName { get; set; } = "";
        public string RawText { get; set; } = "";  // texto final listo para enviar a la impresora
    }
}
