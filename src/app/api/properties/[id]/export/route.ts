import { todayInLondon } from "@/lib/dates";
import { getPropertyReport } from "@/lib/reports";
import { slug } from "@/lib/upload";
import { buildWorkbook } from "@/lib/workbook";

/** Excel download, generated on demand from the database so it is always up to date. */
export async function GET(_request: Request, ctx: RouteContext<"/api/properties/[id]/export">) {
  const { id } = await ctx.params;
  const report = /^\d+$/.test(id) ? await getPropertyReport(Number(id)) : null;
  if (!report) return Response.json({ error: "Property not found." }, { status: 404 });

  const today = todayInLondon();
  const buffer = await buildWorkbook(report, today);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slug(report.property.name)}-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
