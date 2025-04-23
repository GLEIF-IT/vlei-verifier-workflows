import signify, {
  CreateIdentiferArgs,
  EventResult,
  HabState,
  Operation,
  randomPasscode,
  ready,
  Salter,
  Serder,
  SignifyClient,
  Tier,
  Signer,
} from 'signify-ts';
import { RetryOptions, retry } from './retry';
import { resolveEnvironment } from './resolve-env';
import { WorkflowState } from '../workflow-state';
import {
  getIdentifierData,
  SinglesigIdentifierData,
} from './handle-json-config';

import { generateFileDigest } from './generate-digest';
import AdmZip = require('adm-zip');
import * as fs from 'fs';
import * as path from 'path';

export interface SimpleSignatureEntry {
  file: string;
  digest: string;
  aid: string;
  sigs: string[];
}

export interface SimpleManifest {
  documentInfo: {
    documentType: string;
    signatures: SimpleSignatureEntry[];
  };
}

export interface Aid {
  name: string;
  prefix: string;
  oobi: string;
}

export interface Notification {
  i: string;
  dt: string;
  r: boolean;
  a: { r: string; d?: string; m?: string };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function admitSinglesig(
  client: SignifyClient,
  aidName: string,
  recipientAid: HabState
) {
  const grantMsgSaid = await waitAndMarkNotification(client, '/exn/ipex/grant');

  const [admit, sigs, aend] = await client.ipex().admit({
    senderName: aidName,
    message: '',
    grantSaid: grantMsgSaid,
    recipient: recipientAid.prefix,
  });

  await client
    .ipex()
    .submitAdmit(aidName, admit, sigs, aend, [recipientAid.prefix]);
}

/**
 * Check that all operations were waited for.
 * <p>This is a postcondition check to make sure all long-running operations have been waited for
 * @see waitOperation
 */
export async function assertOperations(
  ...clients: SignifyClient[]
): Promise<void> {
  for (const client of clients) {
    const operations = await client.operations().list();
    if (operations.length > 0) {
      console.warn(
        `Warning: Client has ${operations.length} pending operations`
      );
    }
  }
}

/**
 * Check that all notifications were processed.
 * <p>This is a postcondition check to make sure all notifications have been processed
 * @see waitForNotifications
 */
export async function assertNotifications(
  ...clients: SignifyClient[]
): Promise<void> {
  for (const client of clients) {
    const res = await client.notifications().list();
    const notes = res.notes.filter((i: { r: boolean }) => i.r === false);
    if (notes.length > 0) {
      console.warn(`Warning: Client has ${notes.length} unread notifications`);
    }
  }
}

export async function createAid(
  client: SignifyClient,
  name: string
): Promise<Aid> {
  const [prefix, oobi] = await getOrCreateIdentifier(client, name);
  return { prefix, oobi, name };
}

export async function createAID(client: signify.SignifyClient, name: string) {
  await getOrCreateIdentifier(client, name);
  const aid = await client.identifiers().get(name);
  console.log(name, 'AID:', aid.prefix);
  return aid;
}

export function createTimestamp() {
  return new Date().toISOString().replace('Z', '000+00:00');
}

/**
 * Get list of end role authorizations for a Keri idenfitier
 */
export async function getEndRoles(
  client: SignifyClient,
  alias: string,
  role?: string
): Promise<any> {
  const path =
    role !== undefined
      ? `/identifiers/${alias}/endroles/${role}`
      : `/identifiers/${alias}/endroles`;
  const response: Response = await client.fetch(path, 'GET', null);
  if (!response.ok) throw new Error(await response.text());
  const result = await response.json();
  // console.log("getEndRoles", result);
  return result;
}

export async function getGrantedCredential(
  client: SignifyClient,
  credId: string
): Promise<any> {
  const credentialList = await client.credentials().list({
    filter: { '-d': credId },
  });
  let credential: any;
  if (credentialList.length > 0) {
    if (credentialList.length !== 1) {
      console.warn(`Multiple credentials found with ID ${credId}`);
    }
    credential = credentialList[0];
  }
  return credential;
}

export async function getIssuedCredential(
  issuerClient: SignifyClient,
  issuerAID: HabState,
  recipientAID: HabState,
  schemaSAID: string
) {
  const credentialList = await issuerClient.credentials().list({
    filter: {
      '-i': issuerAID.prefix,
      '-s': schemaSAID,
      '-a-i': recipientAID.prefix,
    },
  });
  if (credentialList.length > 1) {
    console.warn(`Multiple credentials found matching filter criteria`);
  }
  return credentialList[0];
}

export async function getOrCreateAID(
  client: SignifyClient,
  name: string,
  kargs: CreateIdentiferArgs
): Promise<HabState> {
  if (!client) {
    throw new Error("getOrCreateAID: client doesn't exist");
  }
  try {
    return await client.identifiers().get(name);
  } catch {
    console.log('Creating AID', name, ': ', kargs);
    const result: EventResult = await client.identifiers().create(name, kargs);

    await waitOperation(client, await result.op());
    const aid = await client.identifiers().get(name);

    const op = await client
      .identifiers()
      .addEndRole(name, 'agent', client?.agent?.pre ?? undefined);
    await waitOperation(client, await op.op());
    console.log(name, 'AID:', aid.prefix);
    return aid;
  }
}

/**
 * Connect or boot a SignifyClient instance
 */
export async function getOrCreateClient(
  bran: string | undefined = undefined,
  getOnly = false
): Promise<SignifyClient> {
  const env = resolveEnvironment();
  await ready();
  bran ??= randomPasscode();
  bran = bran.padEnd(21, '_');
  const client = new SignifyClient(env.url, bran, Tier.low, env.bootUrl);
  try {
    await client.connect();
  } catch (e: any) {
    if (!getOnly) {
      const res = await client.boot();
      if (!res.ok) throw new Error();
      await client.connect();
    } else {
      throw new Error(
        'Could not connect to client w/ bran ' + bran + e.message
      );
    }
  }
  console.log('client', {
    agent: client.agent?.pre,
    controller: client.controller.pre,
  });
  return client;
}

/**
 * Connect or boot a number of SignifyClient instances
 * @example
 * <caption>Create two clients with random secrets</caption>
 * let client1: SignifyClient, client2: SignifyClient;
 * beforeAll(async () => {
 *   [client1, client2] = await getOrCreateClients(2);
 * });
 * @example
 * <caption>Launch jest from shell with pre-defined secrets</caption>
 */
export async function getOrCreateClients(
  count: number,
  brans: string[] | undefined = undefined,
  getOnly = false
): Promise<SignifyClient[]> {
  const tasks: Promise<SignifyClient>[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push(getOrCreateClient(brans?.at(i) ?? undefined, getOnly));
  }
  const clients: SignifyClient[] = await Promise.all(tasks);
  console.log(`secrets="${clients.map((i) => i.bran).join(',')}"`);
  return clients;
}

/**
 * Get or resolve a Keri contact
 * @example
 * <caption>Create a Keri contact before running tests</caption>
 * let contact1_id: string;
 * beforeAll(async () => {
 *   contact1_id = await getOrCreateContact(client2, "contact1", name1_oobi);
 * });
 */
export async function getOrCreateContact(
  client: SignifyClient,
  name: string,
  oobi: string
): Promise<string> {
  const list = await client.contacts().list(undefined, 'alias', `^${name}$`);
  // console.log("contacts.list", list);
  if (list.length > 0) {
    const contact = list[0];
    if (contact.oobi === oobi) {
      // console.log("contacts.id", contact.id);
      return contact.id;
    }
  }
  let op = await client.oobis().resolve(oobi, name);
  op = await waitOperation(client, op);
  return op.response.i;
}

/**
 * Get or create a Keri identifier. Uses default witness config from `resolveEnvironment`
 * @example
 * <caption>Create a Keri identifier before running tests</caption>
 * let name1_id: string, name1_oobi: string;
 * beforeAll(async () => {
 *   [name1_id, name1_oobi] = await getOrCreateIdentifier(client1, "name1");
 * });
 * @see resolveEnvironment
 */
export async function getOrCreateIdentifier(
  client: SignifyClient,
  name: string,
  kargs: CreateIdentiferArgs | undefined = undefined
): Promise<[string, string]> {
  let id: any = undefined;
  try {
    const identfier = await client.identifiers().get(name);
    // console.log("identifiers.get", identfier);
    id = identfier.prefix;
  } catch {
    const env = resolveEnvironment();
    kargs ??=
      env.witnessIds.length > 0
        ? { toad: env.witnessIds.length, wits: env.witnessIds }
        : {};
    const result: EventResult = await client.identifiers().create(name, kargs);
    let op = await result.op();
    op = await waitOperation(client, op);
    // console.log("identifiers.create", op);
    id = op.response.i;
  }
  const eid = client.agent?.pre ?? ''; // considering this used to be a non-null assertion, presumably it will never end up being ''
  if (!(await hasEndRole(client, name, 'agent', eid))) {
    const result: EventResult = await client
      .identifiers()
      .addEndRole(name, 'agent', eid);
    let op = await result.op();
    op = await waitOperation(client, op);
    console.log('identifiers.addEndRole', op);
  }

  const oobi = await client.oobis().get(name, 'agent');
  const result: [string, string] = [id, oobi.oobis[0]];
  console.log(name, result);
  return result;
}

export async function getOrIssueCredential(
  issuerClient: SignifyClient,
  issuerAid: Aid,
  recipientAid: Aid,
  issuerRegistry: { regk: string },
  credData: any,
  schema: string,
  rules?: any,
  source?: any,
  privacy = false
): Promise<any> {
  const credentialList = await issuerClient.credentials().list();

  if (credentialList.length > 0) {
    const credential = credentialList.find(
      (cred: any) =>
        cred.sad.s === schema &&
        cred.sad.i === issuerAid.prefix &&
        cred.sad.a.i === recipientAid.prefix &&
        cred.sad.a.AID === credData.AID &&
        cred.status.et != 'rev'
    );
    if (credential) return credential;
  }

  const issResult = await issuerClient.credentials().issue(issuerAid.name, {
    ri: issuerRegistry.regk,
    s: schema,
    u: privacy ? new Salter({}).qb64 : undefined,
    a: {
      i: recipientAid.prefix,
      u: privacy ? new Salter({}).qb64 : undefined,
      ...credData,
    },
    r: rules,
    e: source,
  });

  await waitOperation(issuerClient, issResult.op);
  const credential = await issuerClient.credentials().get(issResult.acdc.ked.d);

  return credential;
}

export async function revokeCredential(
  issuerClient: SignifyClient,
  issuerAid: Aid,
  credentialSaid: string
): Promise<any> {
  const revResult = await issuerClient
    .credentials()
    .revoke(issuerAid.name, credentialSaid);

  await waitOperation(issuerClient, revResult.op);
  const credential = await issuerClient.credentials().get(credentialSaid);

  return credential;
}

export async function getStates(client: SignifyClient, prefixes: string[]) {
  const participantStates = await Promise.all(
    prefixes.map((p) => client.keyStates().get(p))
  );
  return participantStates.map((s: any[]) => s[0]);
}

/**
 * Test if end role is authorized for a Keri identifier
 */
export async function hasEndRole(
  client: SignifyClient,
  alias: string,
  role: string,
  eid: string
): Promise<boolean> {
  const list = await getEndRoles(client, alias, role);
  for (const i of list) {
    if (i.role === role && i.eid === eid) {
      return true;
    }
  }
  return false;
}

/**
 * Logs a warning for each un-handled notification.
 * <p>Replace warnNotifications with assertNotifications when test handles all notifications
 * @see assertNotifications
 */
export async function warnNotifications(
  ...clients: SignifyClient[]
): Promise<void> {
  let count = 0;
  for (const client of clients) {
    const res = await client.notifications().list();
    const notes = res.notes.filter((i: { r: boolean }) => i.r === false);
    if (notes.length > 0) {
      count += notes.length;
      console.warn('notifications', notes);
    }
  }
  if (count === 0) {
    console.warn('No unread notifications found');
  }
}

export async function deleteOperations<T = any>(
  client: SignifyClient,
  op: Operation<T>
) {
  if (op.metadata?.depends) {
    await deleteOperations(client, op.metadata.depends);
  }

  await client.operations().delete(op.name);
}

export async function getReceivedCredential(
  client: SignifyClient,
  credId: string
): Promise<any> {
  const credentialList = await client.credentials().list({
    filter: {
      '-d': credId,
    },
  });
  let credential: any;
  if (credentialList.length > 0) {
    if (credentialList.length !== 1) {
      console.warn(`Multiple credentials found with ID ${credId}`);
    }
    credential = credentialList[0];
  }
  return credential;
}

/**
 * Mark and remove notification.
 */
export async function markAndRemoveNotification(
  client: SignifyClient,
  note: Notification
): Promise<void> {
  try {
    await client.notifications().mark(note.i);
  } finally {
    await client.notifications().delete(note.i);
  }
}

/**
 * Mark notification as read.
 */
export async function markNotification(
  client: SignifyClient,
  note: Notification
): Promise<void> {
  await client.notifications().mark(note.i);
}

export async function resolveOobi(
  client: SignifyClient,
  oobi: string,
  alias?: string
) {
  const op = await client.oobis().resolve(oobi, alias);
  await waitOperation(client, op);
}

export async function waitForCredential(
  client: SignifyClient,
  credSAID: string,
  MAX_RETRIES = 10
) {
  let retryCount = 0;
  while (retryCount < MAX_RETRIES) {
    const cred = await getReceivedCredential(client, credSAID);
    if (cred) return cred;

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(` retry-${retryCount}: No credentials yet...`);
    retryCount = retryCount + 1;
  }
  throw Error('Credential SAID: ' + credSAID + ' has not been received');
}

export async function waitAndMarkNotification(
  client: SignifyClient,
  route: string
) {
  const notes = await waitForNotifications(client, route);

  await Promise.all(
    notes.map((note) => {
      client.notifications().mark(note.i);
    })
  );

  return notes[notes.length - 1]?.a.d ?? '';
}

export async function waitForNotifications(
  client: SignifyClient,
  route: string,
  options: RetryOptions = {}
): Promise<Notification[]> {
  return retry(async () => {
    const response: { notes: Notification[] } = await client
      .notifications()
      .list();

    const notes = response.notes.filter(
      (note) => note.a.r === route && note.r === false
    );

    if (!notes.length) {
      throw new Error(`No notifications with route ${route}`);
    }

    return notes;
  }, options);
}

/**
 * Poll for operation to become completed.
 * Removes completed operation
 */
export async function waitOperation<T = any>(
  client: SignifyClient,
  op: Operation<T> | string,
  signal?: AbortSignal
): Promise<Operation<T>> {
  if (typeof op === 'string') {
    op = await client.operations().get(op);
  }

  op = await client
    .operations()
    .wait(op, { signal: signal ?? AbortSignal.timeout(60000) });
  await deleteOperations(client, op);

  return op;
}

export async function getOrCreateRegistry(
  client: SignifyClient,
  aid: Aid,
  registryName: string
): Promise<{ name: string; regk: string }> {
  let registries = await client.registries().list(aid.name);
  registries = registries.filter(
    (reg: { name: string }) => reg.name == registryName
  );
  if (registries.length > 0) {
    if (registries.length !== 1) {
      console.warn(`Multiple registries found with name ${registryName}`);
    }
  } else {
    const regResult = await client
      .registries()
      .create({ name: aid.name, registryName: registryName });
    await waitOperation(client, await regResult.op());
    registries = await client.registries().list(aid.name);
    registries = registries.filter(
      (reg: { name: string }) => reg.name == registryName
    );
  }
  console.log(registries);

  return registries[0];
}

export async function sendGrantMessage(
  senderClient: SignifyClient,
  senderAid: Aid,
  recipientAid: Aid,
  credential: any
) {
  const [grant, gsigs, gend] = await senderClient.ipex().grant({
    senderName: senderAid.name,
    acdc: new Serder(credential.sad),
    anc: new Serder(credential.anc),
    iss: new Serder(credential.iss),
    ancAttachment: credential.ancAttachment,
    recipient: recipientAid.prefix,
    datetime: createTimestamp(),
  });

  const op = await senderClient
    .ipex()
    .submitGrant(senderAid.name, grant, gsigs, gend, [recipientAid.prefix]);
  await waitOperation(senderClient, op);
}

export async function sendAdmitMessage(
  senderClient: SignifyClient,
  senderAid: Aid,
  recipientAid: Aid
) {
  const notifications = await waitForNotifications(
    senderClient,
    '/exn/ipex/grant'
  );
  if (notifications.length !== 1) {
    console.warn(
      `Expected exactly 1 notification, found ${notifications.length}`
    );
  }
  const grantNotification = notifications[0];

  const [admit, sigs, aend] = await senderClient.ipex().admit({
    senderName: senderAid.name,
    message: '',
    grantSaid: grantNotification.a.d ?? '', // presumably, since this was originally a non-null assertion, it will never be ''
    recipient: recipientAid.prefix,
    datetime: createTimestamp(),
  });

  const op = await senderClient
    .ipex()
    .submitAdmit(senderAid.name, admit, sigs, aend, [recipientAid.prefix]);
  await waitOperation(senderClient, op);

  await markAndRemoveNotification(senderClient, grantNotification);
}

export async function getRootOfTrust(
  configJson: any,
  rot_aid: string,
  rot_member_aid?: string
): Promise<any> {
  const workflow_state = WorkflowState.getInstance();

  // Use the rot_member_aid if provided, otherwise fall back to rot_aid
  const identifierToUse = rot_member_aid || rot_aid;

  const identifierData = getIdentifierData(
    configJson,
    identifierToUse
  ) as SinglesigIdentifierData;

  const client = workflow_state.clients.get(identifierData.agent.name);

  if (!client) {
    throw new Error(
      `Failed to initialize client for identifier: ${identifierToUse}`
    );
  }

  const rootOfTrustIdentifierName = rot_aid;
  const rootOfTrustAid = await client
    .identifiers()
    .get(rootOfTrustIdentifierName);

  const oobi = await client.oobis().get(rootOfTrustIdentifierName);
  let oobiUrl = oobi.oobis[0];
  console.log(`Root of trust OOBI: ${oobiUrl}`);
  const url = new URL(oobiUrl);
  if (url.hostname === 'keria') oobiUrl = oobiUrl.replace('keria', 'localhost');
  const oobiResp = await fetch(oobiUrl);
  const oobiRespBody = await oobiResp.text();

  return {
    vlei: oobiRespBody,
    aid: rootOfTrustAid.prefix,
    oobi: oobiUrl,
  };
}

export async function createSimpleSignature(
  payload: string,
  keeper: signify.Keeper,
  aid: string
): Promise<string[]> {
  const buffer = Buffer.from(payload);
  const digest = generateFileDigest(buffer);
  const nonPrefixedDigest = digest.split("-", 2)[1];

  const signatures: string[] = [];

  for (const signer of keeper.signers as Signer[]) {
    const sig = signer.sign(signify.b(nonPrefixedDigest), 0);
    const result = signer.verfer.verify(sig.raw, nonPrefixedDigest);
    if (result) {
      signatures.push(sig.qb64);
    } else {
      throw new Error(`Failed to sign payload: ${payload}`);
    }

    return signatures;
  }

  return signatures;
}

export async function signReportZip(
  unsignedZip: string,
  signedPath: string,
  aidPrefix: string,
  keeper: signify.Keeper
): Promise<string> {
  const buffer = fs.readFileSync(unsignedZip);
  const digest = generateFileDigest(buffer);
  
  const [jws] = await createSimpleSignature(digest, keeper, aidPrefix);

  const manifest: SimpleManifest = {
    documentInfo: {
      documentType: 'http://xbrl.org/PWD/2020-12-09/report-package',
      signatures: [
        {
          file: path.basename(unsignedZip),
          digest,
          aid: aidPrefix,
          sigs: [jws],
        },
      ],
    },
  };

  const zip = new AdmZip(unsignedZip);
  const manifestJson = JSON.stringify(manifest, null, 2);
  zip.addFile('META-INF/reports.json', Buffer.from(manifestJson, 'utf8'));

  zip.writeZip(signedPath);
  return signedPath;
}
