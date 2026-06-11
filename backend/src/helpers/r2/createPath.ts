import { join } from 'node:path';

export default function createPath(...arg: string[]): string {
  return join(...arg);
}
