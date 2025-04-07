import { strict as assert } from 'assert';
import SignifyClient from 'signify-ts';
import { URL } from '../node-modules.js';

import { RetryOptions, retry } from './retry.js';
import { resolveEnvironment } from './resolve-env.js';
import { TestKeria } from './test-keria.js';
import { WorkflowState } from '../workflow-state.js';
import {
  getIdentifierData,
  SinglesigIdentifierData,
} from './handle-json-config.js';
import {
  ECR_SCHEMA_URL,
  OOR_SCHEMA_URL,
  ECR_SCHEMA_SAID,
  OOR_SCHEMA_SAID,
} from '../constants.js';

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
  client: SignifyClient.SignifyClient,
  aidName: string,
  recipientAid: SignifyClient.HabState
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
 * Assert that all operations were waited for.
 * <p>This is a postcondition check to make sure all long-running operations have been waited for
 * @see waitOperation
 */
export async function assertOperations(
  ...clients: SignifyClient.SignifyClient[]
): Promise<void> {
  for (const client of clients) {
    const operations = await client.operations().list();
    assert(operations.length === 0);
  }
}

/**
 * Assert that all notifications were handled.
 * <p>This is a postcondition check to make sure all notifications have been handled
 * @see markNotification
 * @see markAndRemoveNotification
 */
export async function assertNotifications(
  ...clients: SignifyClient.SignifyClient[]
): Promise<void> {
  for (const client of clients) {
    const res = await client.notifications().list();
    const notes = res.notes.filter((i: { r: boolean }) => i.r === false);
    assert(notes.length === 0);
  }
}

export async function createAid(
  client: SignifyClient.SignifyClient,
  name: string
): Promise<Aid> {
  const [prefix, oobi] = await getOrCreateIdentifier(client, name);
  return { prefix, oobi, name };
}

export async function createAID(
  client: SignifyClient.SignifyClient,
  name: string
) {
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
  client: SignifyClient.SignifyClient,
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
  client: SignifyClient.SignifyClient,
  credId: string
): Promise<any> {
  const credentialList = await client.credentials().list({
    filter: { '-d': credId },
  });
  let credential: any;
  if (credentialList.length > 0) {
    assert(credentialList.length === 1);
    credential = credentialList[0];
  }
  return credential;
}

export async function getIssuedCredential(
  issuerClient: SignifyClient.SignifyClient,
  issuerAID: SignifyClient.HabState,
  recipientAID: SignifyClient.HabState,
  schemaSAID: string,
  role?: string
) {
  // Build the base filter
  const filter = {
    '-i': issuerAID.prefix,
    '-s': schemaSAID,
    '-a-i': recipientAID.prefix,
  };

  // If role is provided, determine which role attribute to use based on schema
  if (role !== undefined) {
    console.log(`Looking for credentials with specific role: ${role}`);

    // Determine role type based on schema
    let roleAttribute;
    // Check if the schema is ECR_SCHEMA_SAID or contains "ECR"
    if (schemaSAID === ECR_SCHEMA_SAID || schemaSAID.includes('ECR')) {
      roleAttribute = '-a-engagementContextRole';
    }
    // Check if the schema is OOR_SCHEMA_SAID or contains "OOR"
    else if (schemaSAID === OOR_SCHEMA_SAID || schemaSAID.includes('OOR')) {
      roleAttribute = '-a-officialRole';
    }

    // If we identified a role attribute, add it to the filter
    if (roleAttribute) {
      try {
        const roleFilter = {
          ...filter,
          [roleAttribute]: role,
        };

        console.log(`Trying with schema-specific role filter:`, roleFilter);
        const credentials = await issuerClient
          .credentials()
          .list({ filter: roleFilter });

        if (credentials && credentials.length > 0) {
          console.log(
            `Found ${credentials.length} matching credentials with specific role`
          );
          return credentials[0];
        }
      } catch (e) {
        console.log(`Error querying by specific role:`, e);
      }
    }
  }

  // If specific role search failed or no role was specified, use the base filter
  console.log(`Looking for credentials with base filter:`, filter);
  const credentials = await issuerClient.credentials().list({ filter });

  // If no credentials found, return null
  if (!credentials || credentials.length === 0) {
    console.log(`No credentials found matching filter`);
    return null;
  }

  // Log the found credentials
  console.log(`Found ${credentials.length} matching credentials:`);

  // If a role was specified and we couldn't use direct filtering, filter client-side
  if (role !== undefined) {
    for (const cred of credentials) {
      const credRole =
        cred.sad.a.engagementContextRole || cred.sad.a.officialRole;
      console.log(`Credential role: "${credRole}" | SAID: ${cred.sad.d}`);

      if (credRole === role) {
        console.log(`Found matching credential with role "${role}"`);
        return cred;
      }
    }
    // No matching credential found
    console.log(`No credential found with role "${role}"`);
    return null;
  }

  // If no role was specified, return the first credential
  return credentials[0];
}

export async function getOrCreateAID(
  client: SignifyClient.SignifyClient,
  name: string,
  kargs: SignifyClient.CreateIdentiferArgs
): Promise<SignifyClient.HabState> {
  try {
    return await client.identifiers().get(name);
  } catch {
    console.log('Creating AID', name, ': ', kargs);
    const result: SignifyClient.EventResult = await client
      .identifiers()
      .create(name, kargs);

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
  testKeria: TestKeria,
  bran: string | undefined = undefined,
  getOnly = false
): Promise<SignifyClient.SignifyClient> {
  await SignifyClient.ready();
  bran ??= SignifyClient.randomPasscode();
  bran = bran!.padEnd(21, '_');
  const client = new SignifyClient.SignifyClient(
    `http://${testKeria.domain}:${testKeria.keriaAdminPort}`,

    bran,

    SignifyClient.Tier.low,

    `http://${testKeria.domain}:${testKeria.keriaBootPort}`
  );
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
  testKeria: TestKeria,
  count: number,
  brans: string[] | undefined = undefined,
  getOnly = false
): Promise<SignifyClient.SignifyClient[]> {
  const tasks: Promise<SignifyClient.SignifyClient>[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push(
      getOrCreateClient(testKeria, brans?.at(i) ?? undefined, getOnly)
    );
  }
  const clients: SignifyClient.SignifyClient[] = await Promise.all(tasks);
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
  client: SignifyClient.SignifyClient,
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
  client: SignifyClient.SignifyClient,
  name: string,
  kargs: SignifyClient.CreateIdentiferArgs | undefined = undefined
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
    const result: SignifyClient.EventResult = await client
      .identifiers()
      .create(name, kargs);
    let op = await result.op();
    op = await waitOperation(client, op);
    // console.log("identifiers.create", op);
    id = op.response.i;
  }
  const eid = client.agent?.pre ?? ''; // considering this used to be a non-null assertion, presumably it will never end up being ''
  if (!(await hasEndRole(client, name, 'agent', eid))) {
    const result: SignifyClient.EventResult = await client
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
  issuerClient: SignifyClient.SignifyClient,
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
        cred.sad.a.engagementContextRole === credData.engagementContextRole &&
        cred.status.et != 'rev'
    );
    if (credential) return credential;
  }

  const issResult = await issuerClient.credentials().issue(issuerAid.name, {
    ri: issuerRegistry.regk,
    s: schema,
    u: privacy ? new SignifyClient.Salter({}).qb64 : undefined,
    a: {
      i: recipientAid.prefix,
      u: privacy ? new SignifyClient.Salter({}).qb64 : undefined,
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
  issuerClient: SignifyClient.SignifyClient,
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

export async function getStates(
  client: SignifyClient.SignifyClient,
  prefixes: string[]
) {
  const participantStates = await Promise.all(
    prefixes.map((p) => client.keyStates().get(p))
  );
  return participantStates.map((s: any[]) => s[0]);
}

/**
 * Test if end role is authorized for a Keri identifier
 */
export async function hasEndRole(
  client: SignifyClient.SignifyClient,
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
  ...clients: SignifyClient.SignifyClient[]
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
  assert(count > 0);
}

export async function deleteOperations<T = any>(
  client: SignifyClient.SignifyClient,
  op: SignifyClient.Operation<T>
) {
  if (op.metadata?.depends) {
    await deleteOperations(client, op.metadata.depends);
  }

  await client.operations().delete(op.name);
}

export async function getReceivedCredential(
  client: SignifyClient.SignifyClient,
  credId: string
): Promise<any> {
  const credentialList = await client.credentials().list({
    filter: {
      '-d': credId,
    },
  });
  let credential: any;
  if (credentialList.length > 0) {
    assert(credentialList.length === 1);
    credential = credentialList[0];
  }
  return credential;
}

/**
 * Mark and remove notification.
 */
export async function markAndRemoveNotification(
  client: SignifyClient.SignifyClient,
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
  client: SignifyClient.SignifyClient,
  note: Notification
): Promise<void> {
  await client.notifications().mark(note.i);
}

export async function resolveOobi(
  client: SignifyClient.SignifyClient,
  oobi: string,
  alias?: string
) {
  const op = await client.oobis().resolve(oobi, alias);
  await waitOperation(client, op);
}

export async function waitForCredential(
  client: SignifyClient.SignifyClient,
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
  client: SignifyClient.SignifyClient,
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
  client: SignifyClient.SignifyClient,
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
  client: SignifyClient.SignifyClient,
  op: SignifyClient.Operation<T> | string,
  signal?: AbortSignal
): Promise<SignifyClient.Operation<T>> {
  if (typeof op === 'string') {
    op = await client.operations().get(op);
  }

  op = await client
    .operations()
    .wait(op, { signal: signal ?? AbortSignal.timeout(60000) });
  await deleteOperations(client, op as SignifyClient.Operation<T>);

  return op;
}

export async function getOrCreateRegistry(
  client: SignifyClient.SignifyClient,
  aid: Aid,
  registryName: string
): Promise<{ name: string; regk: string }> {
  let registries = await client.registries().list(aid.name);
  registries = registries.filter(
    (reg: { name: string }) => reg.name == registryName
  );
  if (registries.length > 0) {
    assert(registries.length === 1);
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
  senderClient: SignifyClient.SignifyClient,
  senderAid: Aid,
  recipientAid: Aid,
  credential: any
) {
  const [grant, gsigs, gend] = await senderClient.ipex().grant({
    senderName: senderAid.name,
    acdc: new SignifyClient.Serder(credential.sad),
    anc: new SignifyClient.Serder(credential.anc),
    iss: new SignifyClient.Serder(credential.iss),
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
  senderClient: SignifyClient.SignifyClient,
  senderAid: Aid,
  recipientAid: Aid
) {
  const notifications = await waitForNotifications(
    senderClient,
    '/exn/ipex/grant'
  );
  assert(notifications.length > 0);
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
  config: any,
  rot_aid: string,
  rot_member_aid?: string
): Promise<any> {
  const workflow_state = WorkflowState.getInstance();

  // Use the rot_member_aid if provided, otherwise fall back to rot_aid
  const identifierToUse = rot_member_aid || rot_aid;

  const identifierData = getIdentifierData(
    config,
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
  const oobiUrl = oobi.oobis[0];
  console.log(`Root of trust OOBI: ${oobiUrl}`);
  const _url = new URL(oobiUrl);
  const oobiResp = await fetch(oobiUrl);
  const oobiRespBody = await oobiResp.text();

  return {
    vlei: oobiRespBody,
    aid: rootOfTrustAid.prefix,
    oobi: oobiUrl,
  };
}
