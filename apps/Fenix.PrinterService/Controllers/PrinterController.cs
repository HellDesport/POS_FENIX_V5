using Microsoft.AspNetCore.Mvc;
using Fenix.PrintService.Services;
using Fenix.PrintService.Models;

namespace Fenix.PrintService.Controllers
{
    [ApiController]
    [Route("api/printer")]
    public class PrinterController : ControllerBase
    {
        private readonly PrinterManager _manager;
        private readonly PrinterService _printerService;
        private readonly ILogger<PrinterController> _logger;

        public PrinterController(PrinterManager manager, PrinterService printerService, ILogger<PrinterController> logger)
        {
            _manager = manager;
            _printerService = printerService;
            _logger = logger;
        }

        [HttpGet("list")]
        public IActionResult GetPrinters()
        {
            var printers = _manager.GetInstalledPrinters();
            return Ok(new { printers });
        }

        // ===========================================================
        //  POST /api/printer/test
        // ===========================================================
        [HttpPost("test")]
        public IActionResult PrintTest([FromQuery] string? printerName = null)
        {
            _logger.LogInformation("[TEST] Recibida solicitud de test...");

            var lines = new List<string>
            {
                "*** TEST DE IMPRESIÓN FÉNIX POS ***",
                "",
                "Si ves esto, tu microservicio funciona.",
                "Fecha: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };

            var payload = new TicketPayload
            {
                PrinterName = printerName,
                Lines = lines
            };

            bool ok = _printerService.PrintTicket(payload);

            if (!ok)
            {
                _logger.LogError("[TEST] Error al imprimir.");
                return StatusCode(500, new { ok = false, message = "Error al imprimir" });
            }

            _logger.LogInformation("[TEST] Test enviado correctamente.");
            return Ok(new { ok = true, message = "Test impreso correctamente" });
        }
    }
}
