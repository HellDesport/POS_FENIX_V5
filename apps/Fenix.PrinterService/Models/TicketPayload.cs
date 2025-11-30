namespace Fenix.PrintService.Models
{
    public class TicketPayload
    {
        public string? PrinterName { get; set; }   // opcional, si no viene = usar default
        public List<string> Lines { get; set; } = new();  // cada línea del ticket
    }
}