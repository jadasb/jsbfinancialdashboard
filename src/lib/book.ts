import { cookies } from "next/headers";
import { parseBook, type Book } from "./data";

export async function currentBook(): Promise<Book> {
  return parseBook((await cookies()).get("book")?.value);
}
