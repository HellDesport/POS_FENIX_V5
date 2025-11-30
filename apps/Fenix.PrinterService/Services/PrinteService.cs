using Fenix.PrintService.Helpers;
using Fenix.PrintService.Models;
using Fenix.PrintService.Formatters;

namespace Fenix.PrintService.Services
{
    public class PrinterService
    {
        private readonly ILogger<PrinterService> _logger;
        private readonly IConfiguration _config;

        public PrinterService(ILogger<PrinterService> logger, IConfiguration config)
        {
            _logger = logger;
            _config = config;
        }

        // ==============================================
        //   Método principal: imprimir ticket
        // ==============================================
        public bool PrintTicket(TicketPayload payload)
        {
            try
            {
                _logger.LogInformation("[PRINT] Iniciando proceso de impresión...");

                // 1. Elegir impresora
                string? printer = payload.PrinterName;
                if (string.IsNullOrWhiteSpace(printer))
                {
                    printer = _config["DefaultPrinter"];
                    _logger.LogInformation($"[PRINT] Usando impresora por defecto: {printer}");
                }
                else
                {
                    _logger.LogInformation($"[PRINT] Usando impresora especificada: {printer}");
                }

                if (string.IsNullOrWhiteSpace(printer))
                {
                    throw new Exception("No se especificó impresora y no hay default configurada.");
                }

                // 2. Construcción del buffer (incluye texto + corte)
                _logger.LogInformation("[PRINT] Construyendo buffer ESC/POS...");
                byte[] buffer = EscPosFormatter.BuildTicket(payload.Lines);
                _logger.LogInformation($"[PRINT] Buffer generado ({buffer.Length} bytes).");

                // -------------------------------------------
                // IMPORTANTE — el corte está en el buffer
                // así que cuando esto se envíe, el papel va a cortar.
                // -------------------------------------------

                // 3. Enviar bytes
                _logger.LogInformation("[PRINT] Enviando datos RAW al spooler...");
                bool result = RawPrinterHelper.SendBytesToPrinter(printer, buffer);

                if (!result)
                {
                    _logger.LogError($"[PRINT] Error al enviar datos a '{printer}'.");
                    throw new Exception($"Error al imprimir en '{printer}'");
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[PRINT] Falló la impresión de ticket");
                return false;
            }
        }

    }
}
