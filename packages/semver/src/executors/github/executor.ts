import { throwError } from 'rxjs';
import { catchError, map, mapTo } from 'rxjs/operators';

import { execAsync } from '../common/exec-async';

import type { GithubExecutorSchema } from './schema';

export default async function runExecutor({
  tag,
  files,
  notes,
  notesFile,
  branch,
}: GithubExecutorSchema) {
  return execAsync('gh release create', [
    tag,
    ...(files ? [files.toString()] : []),
    ...(notes ? [`--notes "${notes}"`] : []),
    ...(notesFile ? [`--notes-file ${notesFile}`] : []),
    ...(branch ? [`--branch ${branch}`] : []),
  ])
    .pipe(
      map(({ stdout }) => stdout),
      mapTo({ success: true }),
      catchError((response) => throwError(() => new Error(response.error)))
    )
    .toPromise();
}
