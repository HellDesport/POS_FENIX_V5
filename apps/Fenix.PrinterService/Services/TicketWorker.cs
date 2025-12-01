using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using MySql.Data.MySqlClient;
using Fenix.PrintService.Models;
using Fenix.PrintService.Services;
using Newtonsoft.Json;

namespace Fenix.PrintService.Services
{
    public class TicketWorker : BackgroundService
    {
        private readonly ILogger<TicketWorker> _logger;
        private readonly IConfiguration _config;
        private readonly PrinterService _printer;
        private readonly string _connString;
        private readonly int _intervalMs;

        private readonly int _cocinaCopies;
        private readonly int _ventaCopies;

        public TicketWorker(
            ILogger<TicketWorker> logger,
            IConfiguration config,
            PrinterService printer)
        {
            _logger = logger;
            _config = config;
            _printer = printer;


            _connString = _config.GetConnectionString("FenixDB")
                ?? throw new Exception("ConnectionStrings:FenixDB no configurado.");

            _intervalMs = _config.GetValue<int>("PrinterService:PollingInterval", 2000);

            _cocinaCopies = _config.GetValue<int>("PrinterService:Copies:COCINA", 1);
            _ventaCopies  = _config.GetValue<int>("PrinterService:Copies:VENTA", 1);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("TicketWorker iniciado.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcesarTickets();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error en worker");
                }

                await Task.Delay(_intervalMs, stoppingToken);
            }
        }

        private async Task ProcesarTickets()
{
    await Task.Yield(); // elimina warning CS1998 y mantiene async real

    using var conn = new MySqlConnection(_connString);
    await conn.OpenAsync();

    // Obtener el ticket pendiente
    var cmd = new MySqlCommand(@"
        SELECT id, orden_id, tipo, impresora_nombre
        FROM ticket
        WHERE copias_generadas = 0
        ORDER BY generado_en ASC
        LIMIT 1
    ", conn);

    long ticketId = 0;
    long ordenId = 0;
    string tipo = "";
    string? impresoraNombre = "";

    using (var rd = cmd.ExecuteReader())
    {
        if (!rd.Read()) return;

        ticketId = rd.GetInt64("id");
        ordenId = rd.GetInt64("orden_id");
        tipo = rd.GetString("tipo");

        int idxImp = rd.GetOrdinal("impresora_nombre");
        impresoraNombre = rd.IsDBNull(idxImp) ? null : rd.GetString(idxImp);
    }

    _logger.LogInformation("Ticket #{id} encontrado ({tipo})", ticketId, tipo);

    var payload = await ConstruirPayload(conn, ordenId, tipo, impresoraNombre);

    int copias = tipo == "COCINA" ? _cocinaCopies : _ventaCopies;

    for (int i = 0; i < copias; i++)
        _printer.PrintTicket(payload);

    var upd = new MySqlCommand(@"
        UPDATE ticket
        SET contenido_json = @json,
            copias_generadas = @copias
        WHERE id = @id
    ", conn);

    upd.Parameters.AddWithValue("@json", JsonConvert.SerializeObject(payload.Lines));


    upd.Parameters.AddWithValue("@copias", copias);
    upd.Parameters.AddWithValue("@id", ticketId);

    upd.ExecuteNonQuery();

    _logger.LogInformation("Ticket #{id} impreso correctamente", ticketId);
}


        private async Task<TicketPayload> ConstruirPayload(
            MySqlConnection conn,
            long ordenId,
            string tipo,
            string? impresora)
        {
            var payload = new TicketPayload
            {
                PrinterName = impresora,
                Lines = new List<string>()
            };

            // Datos principales de la orden
            var cmdOrden = new MySqlCommand(@"
                SELECT o.id, o.orden_tipo, o.total, 
                       r.nombre AS restaurante,
                       m.nombre AS mesa
                FROM orden o
                LEFT JOIN mesa m ON m.id = o.mesa_id
                JOIN restaurante r ON r.id = o.restaurante_id
                WHERE o.id = @id
            ", conn);

            cmdOrden.Parameters.AddWithValue("@id", ordenId);

            string restaurante = "";
            string mesa = "";
            string ordenTipo = "";
            decimal total = 0;

            using (var rd = cmdOrden.ExecuteReader())
            {
                if (rd.Read())
                {
                    restaurante = rd.GetString("restaurante");

                    int idxMesa = rd.GetOrdinal("mesa");
                    mesa = rd.IsDBNull(idxMesa) ? "S/M" : rd.GetString(idxMesa);

                    ordenTipo = rd.GetString("orden_tipo");
                    total = rd.GetDecimal("total");
                }
            }

            // Construcción del texto simple
            payload.Lines.Add("=== " + restaurante + " ===");
            payload.Lines.Add("Mesa: " + mesa);
            payload.Lines.Add("Tipo: " + ordenTipo);
            payload.Lines.Add("--------------------------");

            // Detalle de productos
            var cmdDet = new MySqlCommand(@"
                SELECT producto_nombre, cantidad
                FROM orden_detalle
                WHERE orden_id = @id
            ", conn);

            cmdDet.Parameters.AddWithValue("@id", ordenId);

            using (var rd = cmdDet.ExecuteReader())
            {
                while (rd.Read())
                {
                    string prod = rd.GetString("producto_nombre");
                    decimal qty = rd.GetDecimal("cantidad");

                    payload.Lines.Add($"{qty} x {prod}");
                }
            }

            payload.Lines.Add("--------------------------");
            payload.Lines.Add("TOTAL: " + total.ToString("0.00"));
            payload.Lines.Add("==========================");

            return payload;
        }
    }
}
