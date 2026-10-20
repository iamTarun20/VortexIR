import catalogue from "../../data/resources.tsv?raw";
export type Subject = "DSA" | "OOPS" | "DBMS" | "OS";
export type Resource = {
  id: number;
  subject: Subject;
  title: string;
  url: string;
  description: string;
  keywords: string;
  source: string;
};
export type Match = { id: number; score: number };
type Module = {
  ccall: (
    name: string,
    result: string,
    types: string[],
    values: string[],
  ) => unknown;
};
export const resources: Resource[] = catalogue
  .split("\n")
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [id, subject, title, url, description, keywords, source] =
      line.split("\t");
    return {
      id: Number(id),
      subject: subject as Subject,
      title,
      url,
      description,
      keywords,
      source,
    };
  });
let ready: Promise<Module> | undefined;
export function loadEngine() {
  if (!ready)
    ready = (async () => {
      const url = new URL(
        `${import.meta.env.BASE_URL}wasm/vortex.mjs`,
        window.location.href,
      ).href;
      const { default: createEngine } = await import(/* @vite-ignore */ url);
      const engine: Module = await createEngine();
      if (
        engine.ccall("load_catalogue", "number", ["string"], [catalogue]) !==
        resources.length
      )
        throw new Error("Could not load catalogue.");
      return engine;
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
  return ready;
}
export async function search(query: string, subject: string): Promise<Match[]> {
  const engine = await loadEngine();
  return JSON.parse(
    engine.ccall(
      "search_resources",
      "string",
      ["string", "string"],
      [query, subject],
    ) as string,
  );
}
export async function keywords(text: string): Promise<string[]> {
  const engine = await loadEngine();
  return JSON.parse(
    engine.ccall("extract_keywords", "string", ["string"], [text]) as string,
  );
}
