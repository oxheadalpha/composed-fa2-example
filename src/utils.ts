import * as path from 'path';
import { promises as fs } from 'fs';

export async function loadFile(filePath: string): Promise<string> {
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  try {
    await fs.access(resolvedPath);
  } catch {
    throw new Error(`file ${resolvedPath} does not exist`);
  }

  const text = await fs.readFile(resolvedPath, { encoding: 'utf8', flag: 'r' });
  return text;
}