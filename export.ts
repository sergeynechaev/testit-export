import { ensureDirSync } from 'fs';
import { writableStreamFromWriter } from 'stream';
import { config } from './config.ts';

if (!config.privateToken) {
  console.log('No private token is configured. Please create .env file and put your token into TESTIT_API_KEY.');
  Deno.exit(1);
}

const now = new Date();
const exportDir = `./export/${now.toISOString()}`;
const attachmentsDirName = 'attachments';
const attachmentsDir = `./export/${now.toISOString()}/${attachmentsDirName}`;
const attachmentRegex = /(.*)(\"\/api\/attachments.*\")(.*)/gi;

const callApi = async (method = 'GET', path: string, queryParams?: Record<string, unknown>) => {
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `PrivateToken ${config.privateToken}`,
  });

  const params = {
    method,
    headers,
    body: queryParams ? JSON.stringify(queryParams) : null,
  };

  const jsonResponse = await fetch(`${config.testitApiUrl}/${path}`, params);

  return await jsonResponse.json();
};

const downloadAttachment = async (url: string, path: string): Promise<string> => {
  const fileResponse = await fetch(`${config.testitUrl}${url}`);

  if (fileResponse.body) {
    const file = await Deno.open(path, { write: true, create: true });
    const writableStream = writableStreamFromWriter(file);
    await fileResponse.body.pipeTo(writableStream);
  }

  return path;
};

const writeJson = (path: string, data: Record<string, unknown>): boolean => {
  try {
    Deno.writeTextFileSync(path, JSON.stringify(data, undefined, 2));
    return true;
  } catch (e) {
    return e.message;
  }
};

const attachmentPromises: Promise<string>[] = [];

const replaceAttachmentUrls = (val: any): any => {
  if (typeof val === 'string') {
    const res = [...val.matchAll(attachmentRegex)];
    for (const r of res || []) {
      // second elem in a regex group
      if (r && r[2]) {
        console.log(`Found attachment ${r[2]}`);

        const url = r[2].replace('"', '').split('?')[0]; // we don't need query params
        const fileName = `${crypto.randomUUID()}.jpg`;
        attachmentPromises.push(downloadAttachment(`${url}`, `${attachmentsDir}/${fileName}`));
        val = val.replace(r[2], `./${attachmentsDirName}/${fileName}`);
        return val;
      }
    }
  }

  if (Array.isArray(val)) {
    return val.map((v) => replaceAttachmentUrls(v));
  }

  if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
    const keys = Object.keys(val);
    for (const k of keys) {
      if (!val[k]) continue;
      val[k] = replaceAttachmentUrls(val[k]);
    }
  }

  return val;
};

// create dirs
ensureDirSync(exportDir);
ensureDirSync(attachmentsDir);

// do export

const projects = await callApi('GET', 'projects');
if (!projects || !projects.length) {
  console.log(`No projects found.`);
  Deno.exit(0);
}

writeJson(`${exportDir}/projects-list.json`, projects);
console.log(`${projects.length} projects found.`);

for (const project of projects) {
  console.log(`Starting export of project ${project.name || project.globalId}.`);

  if (project.isDeleted) {
    console.log(`Project ${project.name || project.globalId} is deleted, skip.`);
    continue;
  }

  const testPlans = await callApi('GET', `projects/${project.globalId}/testPlans`);
  console.log(
    `${testPlans.length ? testPlans.length : 'No'} test plans for project ${project.name || project.globalId} found.${
      testPlans.length ? '' : ' Skip.'
    }`
  );

  if (!testPlans.length) {
    continue;
  }

  const testPlansIds = testPlans.map((p: Record<string, unknown>) => p.id);
  const projectExport = await callApi('POST', `projects/${project.globalId}/export-by-testPlans`, { testPlansIds });

  console.log('Checking attachments required to download...');
  const replacedExport = replaceAttachmentUrls(projectExport);

  const fileName = `${exportDir}/project-${project.globalId}.json`;
  writeJson(fileName, replacedExport);
  console.log(`Project ${project.name || project.globalId} exported to ${fileName}`);
}

if (attachmentPromises.length) {
  console.log(`Downloading ${attachmentPromises.length} attachments. Please wait.`);
  await Promise.all(attachmentPromises);
}

console.log('Export done.');
