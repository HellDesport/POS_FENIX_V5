using Microsoft.AspNetCore.Mvc;
using Fenix.PrintService.Models;
using Fenix.PrintService.Services;

namespace Fenix.PrintService.Controllers
{
    [ApiController]
    [Route("api/ticket")]
    public class TicketController : ControllerBase
    {
        private readonly PrinterService _printerService;
        private readonly ILogger<TicketController> _logger;

        public TicketController(PrinterService printerService, ILogger<TicketController> logger)
        {
            _printerService = printerService;
            _logger = logger;
        }

        // ===========================================================
        //  POST /api/ticket/print
        // ===========================================================
        [HttpPost("print")]
        public IActionResult PrintTicket([FromBody] TicketPayload payload)
        {
            if (payload == null || payload.Lines == null)
                return BadRequest(new { ok = false, message = "Payload vacío o inválido" });

            bool result = _printerService.PrintTicket(payload);

            if (!result)
            {
                _logger.LogError("Error al imprimir ticket");
                return StatusCode(500, new { ok = false, message = "Error al imprimir" });
            }

            return Ok(new { ok = true, message = "Ticket enviado a impresión" });
        }

        // ===========================================================
        //  POST /api/ticket/preview
        //  (Devuelve texto plano como vista previa)
        // ===========================================================
        [HttpPost("preview")]
        public IActionResult PreviewTicket([FromBody] TicketPayload payload)
        {
            if (payload == null || payload.Lines == null)
                return BadRequest(new { ok = false, message = "Payload vacío o inválido" });

            // Unimos líneas en un string para vista previa
            var preview = string.Join("\n", payload.Lines);

            return Ok(new { ok = true, preview });
        }
    }
}
