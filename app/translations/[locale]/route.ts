import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;
    const filePath = path.join(process.cwd(), "app", "lingo", "cache", `${locale}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Translations not found for locale: ${locale}` },
        { status: 404 }
      );
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load translations" },
      { status: 500 }
    );
  }
}
