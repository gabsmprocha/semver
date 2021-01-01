import { workspaces } from '@angular-devkit/core';
import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { getWorkspace, updateNxJsonInTree, updateWorkspace } from '@nrwl/workspace';
import * as inquirer from 'inquirer';

import { SchemaOptions } from './schema';

type ProjectDefinition = workspaces.ProjectDefinition & { projectName: string };

async function listProjects(tree: Tree): Promise<ProjectDefinition[]> {
  const { projects } = await getWorkspace(tree);
  return Array.from(projects.entries()).map(([projectName, project]) => ({
    projectName,
    ...project,
  }));
}

function createPrompt(
  projects: ProjectDefinition[]
): Promise<{ projects: string[] }> {
  return inquirer.prompt({
    name: 'projects',
    type: 'checkbox',
    message: 'Which projects would you like to version independently?',
    choices: projects.map(({ projectName }) => ({
      name: projectName,
      checked: true,
    })),
  });
}

async function updateWorkspaceFromPrompt(tree: Tree): Promise<Rule> {
  const projects = await listProjects(tree);
  const answers = await createPrompt(projects);

  return updateWorkspace((workspace) => {
    workspace.projects.forEach((project, projectName) => {
      if (answers.projects.includes(projectName)) {
        project.targets.add({
          name: 'version',
          builder: '@jscutlery/semver:version',
          options: { syncVersions: false },
        });
      }
    });
  });
}

export function ngAdd(options: SchemaOptions): Rule {
  return async (tree: Tree) => {
    return chain([
      ...(options.syncVersions
        ? /* Synced versioning. */
          [
            updateWorkspace((workspace) => {
              /* Create a global project named 'workspace' to run the 'version' builder globally. */
              workspace.projects.add({
                name: 'workspace',
                root: '.',
                architect: {
                  version: {
                    builder: '@jscutlery/semver:version',
                    options: { syncVersions: true },
                  },
                },
              });
            }),
            updateNxJsonInTree((nxConfig) => ({
              ...nxConfig,
              projects: {
                ...nxConfig.projects,
                workspace: { tags: [] },
              },
            })),
          ]
        : /* Independent versioning. */
          [await updateWorkspaceFromPrompt(tree)]),
    ]);
  };
}
