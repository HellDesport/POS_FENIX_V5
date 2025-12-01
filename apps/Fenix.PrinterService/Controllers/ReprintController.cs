using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using Fenix.PrintService.Models;
using Fenix.PrintService.Services;

namespace Fenix.PrintService.Controllers
{
    [ApiController]
    [Route("api/printer/reprint")]
    public class ReprintController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly PrinterService _printer;

        public ReprintController(IConfiguration config, PrinterService printer)
        {
            _config = config;
            _printer = printer;
        }

        [HttpPost("{ticketId}")]
        public async Task<IActionResult> Reprint(long ticketId)
        {
            string connStr = _config.GetConnectionString("FenixDB")!;
            using var conn = new MySqlConnection(connStr);
            await conn.OpenAsync();

            // Obtener ticket original
            var cmd = new MySqlCommand(@"
                SELECT contenido_json, impresora_nombre
                FROM ticket
                WHERE id = @id
            ", conn);

            cmd.Parameters.AddWithValue("@id", ticketId);

            string? contenido = null;
            string? printerName = null;

            using (var rd = await cmd.ExecuteReaderAsync())
            {
                if (!await rd.ReadAsync())
                    return NotFound("Ticket no encontrado");

                int idxJson = rd.GetOrdinal("contenido_json");
                int idxPrinter = rd.GetOrdinal("impresora_nombre");

                contenido = rd.IsDBNull(idxJson) ? null : rd.GetString(idxJson);
                printerName = rd.IsDBNull(idxPrinter) ? null : rd.GetString(idxPrinter);
            }

            // Si el ticket nunca fue procesado por el worker
            if (string.IsNullOrWhiteSpace(contenido))
                return BadRequest("Este ticket no tiene contenido_json, no fue procesado por el worker.");

            // Construir payload desde contenido_json (líneas separadas por salto)
            var payload = new TicketPayload
            {
                PrinterName = printerName,
                Lines = contenido.Split('\n').ToList()
            };

            // Imprimir
            bool ok = _printer.PrintTicket(payload);

            if (!ok) return StatusCode(500, "Error al reimprimir.");

            return Ok(new
            {
                ok = true,
                message = "Ticket reimpreso correctamente",
                ticketId
            });
        }
    }
}
