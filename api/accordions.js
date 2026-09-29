import { readFile } from "node:fs/promises";

const dataFile = new URL("../data/accordions.json", import.meta.url);

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({
      message:
        "The deployed accordion data is read-only. Update data/accordions.json and redeploy to publish changes.",
    });
  }

  try {
    const data = await readFile(dataFile, "utf8");
    return response.status(200).json(JSON.parse(data));
  } catch (error) {
    console.error("Could not read accordion data:", error);
    return response
      .status(500)
      .json({ message: "Could not load accordion data." });
  }
}
