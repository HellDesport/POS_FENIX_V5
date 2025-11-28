import * as service from "./printer.service.js";

export async function listPrinters(req, res, next) {
  try {
    const result = await service.listPrinters();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function printTicket(req, res, next) {
  try {
    const { printer, format = "text", ticket } = req.body;
    if (!ticket) throw new Error("Falta el objeto ticket");

    const result = await service.printTicket(printer, format, ticket);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
