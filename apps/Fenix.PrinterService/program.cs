using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Fenix.PrintService.Services;

var builder = WebApplication.CreateBuilder(args);

// ======================================================
// REGISTRO DE SERVICIOS
// ======================================================
builder.Services.AddControllers();

// Servicio principal de impresión
builder.Services.AddSingleton<PrinterService>();

// Servicio que lista impresoras instaladas
builder.Services.AddSingleton<PrinterManager>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ======================================================
var app = builder.Build();

// Swagger solo en desarrollo
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/ping", () =>
{
    return Results.Json(new { message = "Printer OK" });
});

app.MapControllers();

app.Run();
