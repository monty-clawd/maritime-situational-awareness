import PDFDocument from "pdfkit";
import { generateIncidentSummary } from "./ai.js";

interface ReportData {
  vesselName: string;
  mmsi: string;
  vesselType?: string;
  flag?: string;
  startDate: string;
  endDate: string;
  events: any[];
}

export const generatePDFReport = async (data: ReportData): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Get AI Summary first
      const summary = await generateIncidentSummary(data.vesselName, data.events);

      // 2. Create PDF
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", (buffer) => buffers.push(buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header
      doc.fontSize(20).text("Maritime Incident Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: "right" });
      doc.moveDown(2);

      // Vessel Details
      doc.fontSize(14).text("Vessel Information", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Name: ${data.vesselName}`);
      doc.text(`MMSI: ${data.mmsi}`);
      if (data.vesselType) doc.text(`Type: ${data.vesselType}`);
      if (data.flag) doc.text(`Flag: ${data.flag}`);
      doc.moveDown(2);

      // AI Summary Section
      doc.fontSize(14).text("Incident Summary (AI Generated)", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(summary, { align: "justify" });
      doc.moveDown(2);

      // Event Log
      doc.fontSize(14).text("Event Log", { underline: true });
      doc.moveDown(0.5);
      
      data.events.forEach((event, index) => {
        const time = event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unknown Time";
        const type = event.type || "Unknown Type";
        const desc = event.description || JSON.stringify(event);
        
        doc.fontSize(10).font("Helvetica-Bold").text(`${time} - ${type}`);
        doc.font("Helvetica").text(desc);
        doc.moveDown(0.5);
      });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};
