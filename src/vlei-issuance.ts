import { strict as assert } from 'assert';
import signify, {
  Saider,
  CreateIdentiferArgs,
  randomNonce,
  Salter,
  HabState,
} from 'signify-ts';
import {
  resolveOobi,
  waitOperation,
  getOrCreateAID,
  getOrCreateClients,
  getOrCreateContact,
  createTimestamp,
  getIssuedCredential,
  getReceivedCredential,
  sendGrantMessage,
  sendAdmitMessage,
  getOrIssueCredential,
  getOrCreateRegistry,
  waitForCredential,
  admitSinglesig,
  waitAndMarkNotification,
  assertOperations,
  sleep,
  revokeCredential,
} from './utils/test-util';
import {
  addEndRoleMultisig,
  admitMultisig,
  createAIDMultisig,
  createRegistryMultisig,
  delegateMultisig,
  grantMultisig,
  issueCredentialMultisig,
  multisigRevoke,
} from './utils/multisig-utils';
import { boolean } from 'mathjs';
import { retry } from './utils/retry';
import {
  QVI_SCHEMA_URL,
  LE_SCHEMA_URL,
  ECR_AUTH_SCHEMA_URL,
  ECR_SCHEMA_URL,
  OOR_AUTH_SCHEMA_URL,
  OOR_SCHEMA_URL,
  CRED_RETRY_DEFAULTS,
} from './constants';

import {
  CredentialInfo,
  IdentifierData,
  MultisigIdentifierData,
  SinglesigIdentifierData,
} from './utils/handle-json-config';
import { buildTestData, EcrTestData } from './utils/generate-test-data';
import { VleiUser } from './utils/test-data';
import { WorkflowState } from './workflow-state';

export class VleiIssuance {
  // Create client for given AID
  public static async createClient(secret: string, agentName: string) {
    const workflow_state = WorkflowState.getInstance();
    console.log(`Creating client for secret: ${secret}`);

    const client = await getOrCreateClients(1, [secret], false);
    workflow_state.clients.set(agentName, client![0]);
    return true;
  }

  // Create AID
  public static async createAid(identifierData: IdentifierData) {
    console.log('Creating AID');
    const workflow_state = WorkflowState.getInstance();
    let aid: any;
    if (identifierData.type == 'singlesig') {
      workflow_state.aidsInfo.set(identifierData.name, identifierData);
      aid = await this.createAidSinglesig(identifierData);
      await this.fetchOobi(identifierData);
      await this.createContacts(identifierData);
      await this.resolveOobi(identifierData);
      workflow_state.aids.set(identifierData.name, aid);
    } else {
      workflow_state.aidsInfo.set(identifierData.name, identifierData);
      aid = await this.createAidMultisig(identifierData);
      await this.fetchOobi(identifierData);
      workflow_state.aids.set(identifierData.name, aid);
    }
  }

  // Fetch OOBIs for each client!
  public static async fetchOobis() {
    console.log('Fetching OOBIs');
    const workflow_state = WorkflowState.getInstance();
    for (const [, aidInfo] of workflow_state.aidsInfo) {
      await this.fetchOobi(aidInfo);
    }
  }

  public static async fetchOobi(identifierData: IdentifierData) {
    let client!: any;
    let oobi: any;
    const workflow_state = WorkflowState.getInstance();
    if (identifierData.type === 'singlesig') {
      const singlesigIdentifierData = identifierData as SinglesigIdentifierData;
      client = workflow_state.clients.get(singlesigIdentifierData.agent.name);
      oobi = await client!.oobis().get(identifierData.name, 'agent');
      if (oobi) {
        workflow_state.oobis.set(singlesigIdentifierData.name, [oobi]);
      }
    } else {
      const multisigIdentifierData = identifierData as MultisigIdentifierData;
      const oobis = [];
      for (const _ of multisigIdentifierData.identifiers) {
        const identifier = workflow_state.aidsInfo.get(
          multisigIdentifierData.identifiers[0]
        ) as SinglesigIdentifierData;
        client = workflow_state.clients.get(identifier.agent.name);
        oobi = await client!.oobis().get(identifier.name, 'agent');
        oobis.push(oobi);
      }
      if (oobi) {
        workflow_state.oobis.set(identifierData.name, oobis);
      }
    }
  }

  // Create contacts between clients
  public static async createContacts(identifierData: IdentifierData) {
    console.log('Creating Contacts');
    const workflow_state = WorkflowState.getInstance();
    for (const [, contactIdentifierData] of workflow_state.aidsInfo) {
      if (
        contactIdentifierData.type === 'multisig' ||
        identifierData.type === 'multisig'
      )
        continue;
      if (identifierData.name != contactIdentifierData.name) {
        await this.createContact(identifierData, contactIdentifierData);
      }
    }
  }

  public static async createContact(
    aidInfoA: IdentifierData,
    aidInfoB: IdentifierData
  ) {
    const workflow_state = WorkflowState.getInstance();
    if (aidInfoA.type == 'singlesig') {
      const singlesigIdentifierDataA = aidInfoA as SinglesigIdentifierData;
      const singlesigIdentifierDataB = aidInfoB as SinglesigIdentifierData;
      const clientA = workflow_state.clients.get(
        singlesigIdentifierDataA.agent.name
      );
      const clientB = workflow_state.clients.get(
        singlesigIdentifierDataB.agent.name
      );
      const oobiA = workflow_state.oobis.get(singlesigIdentifierDataA.name)?.[0]
        .oobis[0];
      const oobiB = workflow_state.oobis.get(singlesigIdentifierDataB.name)?.[0]
        .oobis[0];
      await getOrCreateContact(clientA!, singlesigIdentifierDataB.name, oobiB);
      await getOrCreateContact(clientB!, singlesigIdentifierDataA.name, oobiA);
    }
  }

  // Resolve OOBIs for each client! and schema
  public static async resolveOobis() {
    const schemaUrls = [
      QVI_SCHEMA_URL,
      LE_SCHEMA_URL,
      ECR_AUTH_SCHEMA_URL,
      ECR_SCHEMA_URL,
      OOR_AUTH_SCHEMA_URL,
      OOR_SCHEMA_URL,
    ];
    console.log('Resolving OOBIs');
    const workflow_state = WorkflowState.getInstance();
    for (const [, client] of workflow_state.clients) {
      schemaUrls.forEach(async (schemaUrl) => {
        await resolveOobi(client!, schemaUrl);
      });
    }
  }

  public static async resolveOobi(identifierData: IdentifierData) {
    const schemaUrls = [
      QVI_SCHEMA_URL,
      LE_SCHEMA_URL,
      ECR_AUTH_SCHEMA_URL,
      ECR_SCHEMA_URL,
      OOR_AUTH_SCHEMA_URL,
      OOR_SCHEMA_URL,
    ];
    if (identifierData.type === 'singlesig') {
      console.log('Resolving OOBIs for client');
      const workflow_state = WorkflowState.getInstance();
      const singlesigIdentifierData = identifierData as SinglesigIdentifierData;
      const client = workflow_state.clients.get(
        singlesigIdentifierData.agent.name
      );
      schemaUrls.forEach(async (schemaUrl) => {
        await resolveOobi(client!, schemaUrl);
      });
    }
  }

  public static async createRegistry(identifierData: IdentifierData) {
    console.log('Creating Registries');
    const workflow_state = WorkflowState.getInstance();
    let registry;
    if (identifierData.type == 'multisig') {
      registry = await this.createRegistryMultisig(identifierData);
    } else {
      const singlesigIdentifierData = identifierData as SinglesigIdentifierData;
      const client = workflow_state.clients.get(
        singlesigIdentifierData.agent.name
      );
      registry = await getOrCreateRegistry(
        client!,
        workflow_state.aids.get(identifierData.name),
        `${identifierData.name}Registry`
      );
    }

    workflow_state.registries.set(identifierData.name, registry);
  }

  public static async createAidSinglesig(identifierData: IdentifierData) {
    const workflow_state = WorkflowState.getInstance();
    const delegator = identifierData.delegator;
    const kargsSinglesigAID: CreateIdentiferArgs = {
      toad: workflow_state.kargsAID.toad,
      wits: workflow_state.kargsAID.wits,
    };
    const singlesigIdentifierData = identifierData as SinglesigIdentifierData;
    const client = workflow_state.clients.get(
      singlesigIdentifierData.agent.name
    );

    if (delegator != null) {
      try {
        const aid = await client!.identifiers().get(identifierData.name);
        return aid;
      } catch {
        console.log(`Creating delegated AID for: ${identifierData.name}`);
      }

      kargsSinglesigAID.delpre = workflow_state.aids.get(delegator).prefix;
      const delegatorIdentifierData = workflow_state.aidsInfo.get(
        delegator
      ) as SinglesigIdentifierData;
      const delegatorclient = workflow_state.clients.get(
        delegatorIdentifierData.agent.name
      );

      const delegatorAid = workflow_state.aids.get(delegator);
      // Resolve delegator's oobi
      const oobi1 = await delegatorclient!.oobis().get(delegator, 'agent');
      await resolveOobi(client!, oobi1.oobis[0], delegator);

      // Delegate client! creates delegate AID
      const icpResult2 = await client!
        .identifiers()
        .create(identifierData.name, { delpre: delegatorAid.prefix });
      const op2 = await icpResult2.op();
      const delegateAidPrefix = op2.name.split('.')[1];

      console.log("Delegate's prefix:", delegateAidPrefix);

      // client! 1 approves delegation
      const anchor = {
        i: delegateAidPrefix,
        s: '0',
        d: delegateAidPrefix,
      };

      const result = await retry(async () => {
        const apprDelRes = await delegatorclient!
          .delegations()
          .approve(delegator, anchor);
        await waitOperation(delegatorclient!, await apprDelRes.op());
        console.log('Delegator approve delegation submitted');
        return apprDelRes;
      });
      assert.equal(
        JSON.stringify(result.serder.ked.a[0]),
        JSON.stringify(anchor)
      );

      const op3 = await client!.keyStates().query(delegatorAid.prefix, '1');
      await waitOperation(client!, op3);

      // Delegate client! checks approval
      await waitOperation(client!, op2);
      const aid2 = await client!.identifiers().get(identifierData.name);
      assert.equal(aid2.prefix, delegateAidPrefix);
      console.log('Delegation approved for aid:', aid2.prefix);

      await assertOperations(delegatorclient!, client!);
      const rpyResult2 = await client!
        .identifiers()
        .addEndRole(identifierData.name, 'agent', client!.agent!.pre);
      await waitOperation(client!, await rpyResult2.op());
      return aid2;
    } else {
      const aid = await getOrCreateAID(
        client!,
        identifierData.name,
        kargsSinglesigAID
      );
      return aid;
    }
  }

  public static async createAidMultisig(identifierData: IdentifierData) {
    const workflow_state = WorkflowState.getInstance();
    const multisigIdentifierData = identifierData as MultisigIdentifierData;
    let multisigAids: HabState[] = [];
    const aidIdentifierNames: string[] = multisigIdentifierData.identifiers;

    const issuerAids =
      aidIdentifierNames.map((aidIdentifierName) =>
        workflow_state.aids.get(aidIdentifierName)
      ) || [];

    try {
      for (const aidIdentifierName of aidIdentifierNames) {
        const singlesigIdentifierData = workflow_state.aidsInfo.get(
          aidIdentifierName
        ) as SinglesigIdentifierData;
        const client = workflow_state.clients.get(
          singlesigIdentifierData.agent.name
        );
        multisigAids.push(await client!.identifiers().get(identifierData.name));
      }
      const multisigAid = multisigAids[0];
      console.log(`${identifierData.name} AID: ${multisigAid.prefix}`);
      return multisigAid;
    } catch {
      multisigAids = [];
    }
    if (multisigAids.length == 0) {
      const rstates = issuerAids.map((aid) => aid.state);
      const states = rstates;

      const kargsMultisigAID: CreateIdentiferArgs = {
        algo: signify.Algos.group,
        isith: multisigIdentifierData.isith,
        nsith: multisigIdentifierData.nsith,
        toad: workflow_state.kargsAID.toad,
        wits: workflow_state.kargsAID.wits,
        states: states,
        rstates: rstates,
      };
      if (identifierData.delegator != null) {
        kargsMultisigAID.delpre = workflow_state.aids.get(
          multisigIdentifierData.delegator!
        ).prefix;
      }
      const multisigOps: any[] = [];
      for (let index = 0; index < issuerAids.length; index++) {
        const aid = issuerAids[index];
        const singlesigIdentifierData = workflow_state.aidsInfo.get(
          aid.name
        ) as SinglesigIdentifierData;
        const kargsMultisigAIDClone = { ...kargsMultisigAID, mhab: aid };
        const otherAids = issuerAids.filter((aidTmp) => aid !== aidTmp);
        const client = workflow_state.clients.get(
          singlesigIdentifierData.agent.name
        );

        const op = await createAIDMultisig(
          client!,
          aid,
          otherAids,
          identifierData.name,
          kargsMultisigAIDClone,
          index === 0 // Set true for the first operation
        );

        multisigOps.push([client!, op]);
      }
      if (multisigIdentifierData.delegator) {
        // Approve delegation
        const delegatoridentifierData = workflow_state.aidsInfo.get(
          multisigIdentifierData.delegator
        ) as MultisigIdentifierData;
        const delegatorAidIdentifierNames: string[] =
          delegatoridentifierData.identifiers;
        const delegatorAids =
          delegatorAidIdentifierNames.map((aidIdentifierName) =>
            workflow_state.aids.get(aidIdentifierName)
          ) || [];
        const teepre = multisigOps[0][1].name.split('.')[1];
        const anchor = {
          i: teepre,
          s: '0',
          d: teepre,
        };
        let delegatorClientInitiator;
        const delegatorMultisigAid = workflow_state.aids.get(
          delegatoridentifierData.name
        );
        const delegateOps = [];
        for (
          let index = 0;
          index < delegatoridentifierData.identifiers.length;
          index++
        ) {
          const curAidName = delegatoridentifierData.identifiers[index];
          const curidentifierData = workflow_state.aidsInfo.get(
            curAidName
          ) as SinglesigIdentifierData;
          const aid = workflow_state.aids.get(curAidName);
          const otherAids = delegatorAids.filter(
            (aidTmp: any) => aid.prefix !== aidTmp.prefix
          );
          const delegatorclient = workflow_state.clients.get(
            curidentifierData.agent.name
          );

          const delApprOp = await delegateMultisig(
            delegatorclient!,
            aid,
            otherAids,
            delegatorMultisigAid,
            anchor,
            index === 0
          );
          delegateOps.push([delegatorclient!, delApprOp]);
          if (index === 0) {
            delegatorClientInitiator = delegatorclient!;
          } else {
            await waitAndMarkNotification(
              delegatorClientInitiator!,
              '/multisig/ixn'
            );
          }
        }
        for (const [client, op] of delegateOps) {
          await waitOperation(client!, op);
        }
        for (const identifier of delegatoridentifierData.identifiers) {
          const curidentifierData = workflow_state.aidsInfo.get(
            identifier
          ) as SinglesigIdentifierData;
          const delegatorclient = workflow_state.clients.get(
            curidentifierData.agent.name
          );
          const queryOp1 = await delegatorclient!
            .keyStates()
            .query(delegatorMultisigAid.prefix, '1');
          await waitOperation(delegatorclient!, queryOp1);
        }

        for (const identifier of multisigIdentifierData.identifiers) {
          const curidentifierData = workflow_state.aidsInfo.get(
            identifier
          ) as SinglesigIdentifierData;
          const delegateeclient = workflow_state.clients.get(
            curidentifierData.agent.name
          );
          const ksteetor1 = await delegateeclient!
            .keyStates()
            .query(delegatorMultisigAid.prefix, '1');
          await waitOperation(delegateeclient!, ksteetor1);
        }
      }

      // Wait for all multisig operations to complete
      for (const [client, op] of multisigOps) {
        await waitOperation(client!, op);
      }

      // Wait for multisig inception notifications for all clients
      const tmpAidData = workflow_state.aidsInfo.get(
        issuerAids[0].name
      ) as SinglesigIdentifierData;
      await waitAndMarkNotification(
        workflow_state.clients.get(tmpAidData.agent.name)!,
        '/multisig/icp'
      );
      // Retrieve the newly created AIDs for all clients
      multisigAids = await Promise.all(
        issuerAids.map(async (aid) => {
          const tmpAidData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(tmpAidData.agent.name);
          return await client!.identifiers().get(identifierData.name);
        })
      );

      assert(
        multisigAids.every((aid) => aid.prefix === multisigAids[0].prefix)
      );
      assert(multisigAids.every((aid) => aid.name === multisigAids[0].name));
      const multisigAid = multisigAids[0];

      // Skip if they have already been authorized.
      let oobis: any[] = await Promise.all(
        issuerAids.map(async (aid) => {
          const tmpAidData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(tmpAidData.agent.name);
          return await client!.oobis().get(multisigAid.name, 'agent');
        })
      );

      if (oobis.some((oobi) => oobi.oobis.length == 0)) {
        const timestamp = createTimestamp();

        // Add endpoint role for all clients
        const roleOps = await Promise.all(
          issuerAids.map(async (aid, index) => {
            const otherAids = issuerAids.filter((_, i) => i !== index);
            const tmpAidData = workflow_state.aidsInfo.get(
              aid.name
            ) as SinglesigIdentifierData;
            const client = workflow_state.clients.get(tmpAidData.agent.name);
            return await addEndRoleMultisig(
              client!,
              multisigAid.name,
              aid,
              otherAids,
              multisigAid,
              timestamp,
              index === 0
            );
          })
        );

        // Wait for all role operations to complete for each client!
        for (let i = 0; i < roleOps.length; i++) {
          for (let j = 0; j < roleOps[i].length; j++) {
            const tmpAidData = workflow_state.aidsInfo.get(
              issuerAids[i].name
            ) as SinglesigIdentifierData;
            const client = workflow_state.clients.get(tmpAidData.agent.name);
            await waitOperation(client!, roleOps[i][j]);
          }
        }

        // Wait for role resolution notifications for all clients
        // await waitAndMarkNotification(workflow_state.clients.get(workflow_state.aidsInfo.get(issuerAids[0].name).agent.name), "/multisig/rpy");
        await Promise.all(
          issuerAids.map((aid) => {
            const tmpAidData = workflow_state.aidsInfo.get(
              aid.name
            ) as SinglesigIdentifierData;
            const client = workflow_state.clients.get(tmpAidData.agent.name);
            return waitAndMarkNotification(client!, '/multisig/rpy');
          })
        );

        // Retrieve the OOBI again after the operation for all clients
        oobis = await Promise.all(
          issuerAids.map(async (aid) => {
            const tmpAidData = workflow_state.aidsInfo.get(
              aid.name
            ) as SinglesigIdentifierData;
            const client = workflow_state.clients.get(tmpAidData.agent.name);
            return await client!.oobis().get(multisigAid.name, 'agent');
          })
        );
      }

      // Ensure that all OOBIs are consistent across all clients
      assert(oobis.every((oobi) => oobi.role === oobis[0].role));
      assert(oobis.every((oobi) => oobi.oobis[0] === oobis[0].oobis[0]));

      const oobi = oobis[0].oobis[0].split('/agent/')[0];
      const clients = Array.from(workflow_state.clients.values()).flat();

      await Promise.all(
        clients.map(
          async (client) =>
            await getOrCreateContact(client!, multisigAid.name, oobi)
        )
      );
      console.log(`${identifierData.name} AID: ${multisigAid.prefix}`);
      return multisigAid;
    }
  }

  public static async createRegistryMultisig(identifierData: IdentifierData) {
    const multisigIdentifierData = identifierData as MultisigIdentifierData;
    const workflow_state = WorkflowState.getInstance();
    const multisigAid: HabState = workflow_state.aids.get(identifierData.name);
    const registryIdentifierName = `${identifierData.name}Registry`;
    const aidIdentifierNames: string[] = multisigIdentifierData.identifiers;
    const registries: any[] = new Array<any>();
    const issuerAids =
      aidIdentifierNames.map((aidIdentifierName) =>
        workflow_state.aids.get(aidIdentifierName)
      ) || [];
    // Check if the registries already exist
    for (const aidIdentifierName of aidIdentifierNames) {
      const singlesigIdentifierData = workflow_state.aidsInfo.get(
        aidIdentifierName
      ) as SinglesigIdentifierData;
      const client = workflow_state.clients.get(
        singlesigIdentifierData.agent.name
      );
      let tmpRegistry = await client!.registries().list(multisigAid.name);
      tmpRegistry = tmpRegistry.filter(
        (reg: { name: string }) => reg.name == `${identifierData.name}Registry`
      );
      registries.push(tmpRegistry);
    }

    // Check if registries exist
    const allEmpty = registries.every((registry) => registry.length === 0);

    if (allEmpty) {
      const nonce = randomNonce();
      const registryOps = issuerAids!.map((aid, index) => {
        const tmpAidData = workflow_state.aidsInfo.get(
          aid.name
        ) as SinglesigIdentifierData;
        const otherAids = issuerAids!.filter((_, i) => i !== index);
        const client = workflow_state.clients.get(tmpAidData.agent.name);
        return createRegistryMultisig(
          client!,
          aid,
          otherAids,
          multisigAid,
          registryIdentifierName,
          nonce,
          index === 0 // Use true for the first operation, false for others
        );
      });

      // Await all registry creation operations
      const createdOps = await Promise.all(registryOps);

      // Wait for all operations to complete across multiple clients
      await Promise.all(
        createdOps.map(async (op, index) => {
          const tmpAidData = workflow_state.aidsInfo.get(
            issuerAids![index].name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(tmpAidData.agent.name);
          return await waitOperation(client!, op);
        })
      );

      // Wait for multisig inception notification for each client!
      const tmpAidData = workflow_state.aidsInfo.get(
        issuerAids[0].name
      ) as SinglesigIdentifierData;
      await waitAndMarkNotification(
        workflow_state.clients.get(tmpAidData.agent.name)!,
        '/multisig/vcp'
      );

      // Recheck the registries for each client!
      const updatedRegistries = await Promise.all(
        issuerAids.map((aid) => {
          const tmpAidData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(tmpAidData.agent.name);
          return client!.registries().list(multisigAid.name);
        })
      );

      // Update the `registries` array with the new values
      registries.splice(0, registries.length, ...updatedRegistries);

      // Ensure that all registries match the first one
      const firstRegistry = registries[0][0];
      registries.forEach((registry) => {
        assert.equal(registry[0].regk, firstRegistry.regk);
        assert.equal(registry[0].name, firstRegistry.name);
      });

      // Save the first registry and return it
      workflow_state.registries.set(multisigAid.name, firstRegistry);
      console.log(`${multisigAid.name} Registry created`);
      return firstRegistry;
    } else {
      return registries[0][0];
    }
  }

  public static async getOrIssueCredential(
    credId: string,
    credName: string,
    attributes: any,
    issuerAidKey: string,
    issueeAidKey: string,
    credSourceId?: string,
    generateTestData = false,
    testName = 'default_test'
  ): Promise<any> {
    const workflow_state = WorkflowState.getInstance();
    const issuerAidInfo = workflow_state.aidsInfo.get(issuerAidKey)!;
    if (issuerAidInfo.type === 'multisig') {
      return await this.getOrIssueCredentialMultiSig(
        credId,
        credName,
        attributes,
        issuerAidKey,
        issueeAidKey,
        credSourceId,
        generateTestData,
        testName
      );
    } else {
      return await this.getOrIssueCredentialSingleSig(
        credId,
        credName,
        attributes,
        issuerAidKey,
        issueeAidKey,
        credSourceId,
        generateTestData,
        testName
      );
    }
  }

  public static async revokeCredential(
    credId: string,
    issuerAidKey: string,
    issueeAidKey: string,
    generateTestData = false,
    testName = 'default_test'
  ) {
    const workflow_state = WorkflowState.getInstance();
    const issuerAidInfo = workflow_state.aidsInfo.get(issuerAidKey)!;
    if (issuerAidInfo.type === 'multisig') {
      return await this.revokeCredentialMultiSig(
        credId,
        issuerAidKey,
        issueeAidKey,
        generateTestData,
        testName
      );
    } else {
      return await this.revokeCredentialSingleSig(
        credId,
        issuerAidKey,
        issueeAidKey,
        generateTestData,
        testName
      );
    }
  }

  public static async getOrIssueCredentialSingleSig(
    credId: string,
    credName: string,
    attributes: any,
    issuerAidKey: string,
    issueeAidKey: string,
    credSourceId?: string,
    generateTestData = false,
    testName = 'default_test'
  ): Promise<any> {
    const workflow_state = WorkflowState.getInstance();
    const credInfo: CredentialInfo =
      workflow_state.credentialsInfo.get(credName)!;
    const issuerAID = workflow_state.aids.get(issuerAidKey);
    const recipientAID = workflow_state.aids.get(issueeAidKey);
    const issuerAIDInfo = workflow_state.aidsInfo.get(
      issuerAidKey
    )! as SinglesigIdentifierData;
    const recipientAIDInfo = workflow_state.aidsInfo.get(
      issueeAidKey
    )! as SinglesigIdentifierData;
    const issuerclient = workflow_state.clients.get(issuerAIDInfo.agent.name);
    const recipientclient = workflow_state.clients.get(
      recipientAIDInfo.agent.name
    );

    const issuerRegistry = workflow_state.registries.get(issuerAIDInfo.name)!;
    const schema = workflow_state.schemas[credInfo.schema];
    const rules = workflow_state.rules[credInfo.rules!];
    const privacy = credInfo.privacy;
    let credSource = null;
    if (credSourceId != null) {
      const credType = credInfo.credSource['type'];
      const issuerCred = workflow_state.credentials.get(credSourceId);
      const credO = credInfo.credSource['o'] || null;
      credSource = this.buildCredSource(credType, issuerCred, credO);
    }
    if (attributes['AID'] != null) {
      attributes.AID = workflow_state.aids.get(attributes['AID']).prefix;
    }
    const credData = { ...credInfo.attributes, ...attributes };
    const cred = await getOrIssueCredential(
      issuerclient!,
      issuerAID,
      recipientAID,
      issuerRegistry,
      credData,
      schema,
      rules || undefined,
      credSource || undefined,
      boolean(privacy || false)
    );

    let credHolder = await getReceivedCredential(recipientclient!, cred.sad.d);

    if (!credHolder) {
      await sendGrantMessage(issuerclient!, issuerAID, recipientAID, cred);
      await sendAdmitMessage(recipientclient!, recipientAID, issuerAID);
      credHolder = await retry(async () => {
        const cCred = await getReceivedCredential(recipientclient!, cred.sad.d);
        assert(cCred !== undefined);
        return cCred;
      }, CRED_RETRY_DEFAULTS);
    }

    assert.equal(credHolder.sad.d, cred.sad.d);
    assert.equal(credHolder.sad.s, schema);
    assert.equal(credHolder.sad.i, issuerAID.prefix);
    assert.equal(credHolder.sad.a.i, recipientAID.prefix);
    assert.equal(credHolder.status.s, '0');
    assert(credHolder.atc !== undefined);
    workflow_state.credentials.set(credId, cred);
    const credCesr = await recipientclient!.credentials().get(cred.sad.d, true);
    if (generateTestData) {
      const tmpCred = cred;
      const testData: EcrTestData = {
        aid: recipientAID.prefix,
        lei: credData.LEI,
        credential: { raw: tmpCred, cesr: credCesr },
        engagementContextRole:
          credData.engagementContextRole || credData.officialRole,
      };
      await buildTestData(testData, testName, issueeAidKey);
    }
    const response: VleiUser = {
      roleClient: recipientclient!,
      ecrAid: recipientAID,
      creds: { [credId]: { cred: cred, credCesr: credCesr } },
      idAlias: issueeAidKey,
    };
    return [response, credData.engagementContextRole];
  }

  public static async getOrIssueCredentialMultiSig(
    credId: string,
    credName: string,
    attributes: any,
    issuerAidKey: string,
    issueeAidKey: string,
    credSourceId?: string,
    _generateTestData = false,
    _testName = 'default_test'
  ) {
    const workflow_state = WorkflowState.getInstance();
    const credInfo: CredentialInfo =
      workflow_state.credentialsInfo.get(credName)!;
    const issuerAidInfo = workflow_state.aidsInfo.get(
      issuerAidKey
    )! as MultisigIdentifierData;
    const recipientAidInfo = workflow_state.aidsInfo.get(issueeAidKey)!;
    const issuerAIDMultisig = workflow_state.aids.get(issuerAidKey);
    const recipientAID = workflow_state.aids.get(issueeAidKey);
    const schema = workflow_state.schemas[credInfo.schema];
    let rules = workflow_state.rules[credInfo.rules!];
    const privacy = credInfo.privacy;
    const registryName = issuerAidInfo.name;
    const issuerRegistry = workflow_state.registries.get(registryName)!;
    const issuerAids =
      issuerAidInfo.identifiers.map((identifier: any) =>
        workflow_state.aids.get(identifier)
      ) || [];
    let recepientAids = [];

    if (recipientAidInfo.type === 'multisig') {
      const multisigIdentifierData = recipientAidInfo as MultisigIdentifierData;
      recepientAids =
        multisigIdentifierData.identifiers.map((identifier: any) =>
          workflow_state.aids.get(identifier)
        ) || [];
    } else {
      recepientAids = [workflow_state.aids.get(recipientAidInfo.name)];
    }

    let credSource = null;
    if (credSourceId != null) {
      const credType = credInfo.credSource['type'];
      const issuerCred = workflow_state.credentials.get(credSourceId);
      const credO = credInfo.credSource['o'] || null;
      credSource = this.buildCredSource(credType, issuerCred, credO);
      credSource = credSource ? { e: credSource } : undefined;
    }
    rules = rules ? { r: rules } : undefined;
    // Issuing a credential
    let creds = await Promise.all(
      issuerAids.map((aid: any) => {
        const identifierData = workflow_state.aidsInfo.get(aid.name);

        const singlesigData = identifierData as SinglesigIdentifierData;
        const client = workflow_state.clients.get(singlesigData.agent.name);

        return getIssuedCredential(
          client!,
          issuerAIDMultisig,
          recipientAID,
          schema
        );
      })
    );

    if (creds.every((cred) => !cred)) {
      if (attributes['AID'] != null) {
        attributes.AID = workflow_state.aids.get(attributes['AID']).prefix;
      }
      const credData = { ...credInfo.attributes, ...attributes };

      const kargsSub = {
        i: recipientAID.prefix,
        dt: createTimestamp(),
        u: privacy ? new Salter({}).qb64 : undefined,
        ...credData,
      };

      const kargsIss = {
        i: issuerAIDMultisig.prefix,
        ri: issuerRegistry.regk,
        s: schema,
        a: kargsSub,
        u: privacy ? new Salter({}).qb64 : undefined,
        ...credSource!,
        ...rules!,
      };

      const IssOps = await Promise.all(
        issuerAids.map((aid: any, index: any) => {
          const identifierData = workflow_state.aidsInfo.get(aid.name);
          const singlesigData = identifierData as SinglesigIdentifierData;
          const client = workflow_state.clients.get(singlesigData.agent.name);

          return issueCredentialMultisig(
            client!,
            aid,
            issuerAids.filter((_: any, i: any) => i !== index),
            issuerAIDMultisig.name,
            kargsIss,
            index === 0
          );
        })
      );

      await Promise.all(
        issuerAids.map((aid: any, index: any) => {
          const singlesigData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(singlesigData.agent.name);
          return waitOperation(client!, IssOps[index]);
        })
      );

      let tmpAidData = workflow_state.aidsInfo.get(
        issuerAids[0].name
      ) as SinglesigIdentifierData;
      await waitAndMarkNotification(
        workflow_state.clients.get(tmpAidData.agent.name)!,
        '/multisig/iss'
      );

      creds = await Promise.all(
        issuerAids.map((aid: any) => {
          const singlesigData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(singlesigData.agent.name);
          return getIssuedCredential(
            client!,
            issuerAIDMultisig,
            recipientAID,
            schema
          );
        })
      );
      sleep(1000);
      const grantTime = createTimestamp();
      await Promise.all(
        creds.map((cred, index) => {
          const singlesigData = workflow_state.aidsInfo.get(
            issuerAids[index].name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(singlesigData.agent.name);
          return grantMultisig(
            client!,
            issuerAids[index],
            issuerAids.filter((_: any, i: any) => i !== index),
            issuerAIDMultisig,
            recipientAID,
            cred,
            grantTime,
            index === 0
          );
        })
      );
      sleep(1000);
      tmpAidData = workflow_state.aidsInfo.get(
        issuerAids[0].name
      ) as SinglesigIdentifierData;
      await waitAndMarkNotification(
        workflow_state.clients.get(tmpAidData.agent.name)!,
        '/multisig/exn'
      );
    }
    const cred = creds[0];

    // Exchange grant and admit messages.
    // Check if the recipient is a singlesig AID
    if (recipientAidInfo.type === 'multisig') {
      let credsReceived = await Promise.all(
        recepientAids.map((aid: any) => {
          const singlesigData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(singlesigData.agent.name);
          return getReceivedCredential(client!, cred.sad.d);
        })
      );

      if (credsReceived.every((cred) => cred === undefined)) {
        const admitTime = createTimestamp();

        await Promise.all(
          recepientAids.map((aid: any, index: any) => {
            const singlesigData = workflow_state.aidsInfo.get(
              aid.name
            ) as SinglesigIdentifierData;
            const client = workflow_state.clients.get(singlesigData.agent.name);
            return admitMultisig(
              client!,
              aid,
              recepientAids.filter((_: any, i: any) => i !== index),
              recipientAID,
              issuerAIDMultisig,
              admitTime
            );
          })
        );
        sleep(2000);
        for (const aid of issuerAids) {
          const singlesigData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          await waitAndMarkNotification(
            workflow_state.clients.get(singlesigData.agent.name)!,
            '/exn/ipex/admit'
          );
        }
        for (const aid of recepientAids) {
          const singlesigData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          await waitAndMarkNotification(
            workflow_state.clients.get(singlesigData.agent.name)!,
            '/multisig/exn'
          );
        }
        for (const aid of recepientAids) {
          const singlesigData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          await waitAndMarkNotification(
            workflow_state.clients.get(singlesigData.agent.name)!,
            '/exn/ipex/admit'
          );
        }
        sleep(1000);
        credsReceived = await Promise.all(
          recepientAids.map((aid: any) => {
            const singlesigData = workflow_state.aidsInfo.get(
              aid.name
            ) as SinglesigIdentifierData;
            const client = workflow_state.clients.get(singlesigData.agent.name);
            return waitForCredential(client!, cred.sad.d);
          })
        );

        // Assert received credential details
        for (const credReceived of credsReceived) {
          assert.equal(cred.sad.d, credReceived.sad.d);
        }
      }
    } else {
      const singlesigData = workflow_state.aidsInfo.get(
        recepientAids[0]!.name
      ) as SinglesigIdentifierData;
      let credReceived = await getReceivedCredential(
        workflow_state.clients.get(singlesigData.agent.name)!,
        cred.sad.d
      );
      if (!credReceived) {
        await admitSinglesig(
          workflow_state.clients.get(singlesigData.agent.name)!,
          workflow_state.aids.get(recepientAids[0]!.name).name,
          issuerAIDMultisig
        );
        sleep(2000);
        for (const aid of issuerAids) {
          const singlesigData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          await waitAndMarkNotification(
            workflow_state.clients.get(singlesigData.agent.name)!,
            '/exn/ipex/admit'
          );
        }

        credReceived = await waitForCredential(
          workflow_state.clients.get(singlesigData.agent.name)!,
          cred.sad.d
        );
      }
      assert.equal(cred.sad.d, credReceived.sad.d);
    }
    console.log(
      `${issuerAIDMultisig.name} has issued a ${recipientAID.name} vLEI credential with SAID:`,
      cred.sad.d
    );
    workflow_state.credentials.set(credId, cred);
    return [cred, null];
  }

  public static async revokeCredentialSingleSig(
    credId: string,
    issuerAidKey: string,
    issueeAidKey: string,
    generateTestData = false,
    testName = 'default_test'
  ) {
    const workflow_state = WorkflowState.getInstance();
    const cred: any = workflow_state.credentials.get(credId)!;
    const issuerAID = workflow_state.aids.get(issuerAidKey);
    const recipientAID = workflow_state.aids.get(issueeAidKey);
    const issuerAIDInfo = workflow_state.aidsInfo.get(
      issuerAidKey
    )! as SinglesigIdentifierData;
    const recipientAIDInfo = workflow_state.aidsInfo.get(
      issueeAidKey
    )! as SinglesigIdentifierData;
    const recipientclient = workflow_state.clients.get(
      recipientAIDInfo.agent.name
    );
    const issuerclient = workflow_state.clients.get(issuerAIDInfo.agent.name);

    const revCred = await revokeCredential(
      issuerclient!,
      issuerAID,
      cred.sad.d
    );
    workflow_state.credentials.set(credId, revCred);
    const credCesr = await issuerclient!.credentials().get(revCred.sad.d, true);
    if (generateTestData) {
      const tmpCred = revCred;
      const testData: EcrTestData = {
        aid: recipientAID.prefix,
        lei: revCred.sad.a.LEI,
        credential: { raw: tmpCred, cesr: credCesr },
        engagementContextRole:
          revCred.sad.a.engagementContextRole || revCred.sad.a.officialRole,
      };
      await buildTestData(testData, testName, issueeAidKey, 'revoked_');
    }

    const response: VleiUser = {
      roleClient: recipientclient!,
      ecrAid: recipientAID,
      creds: { credId: { cred: cred, credCesr: credCesr } },
      idAlias: issueeAidKey,
    };
    return [response, revCred.sad.a.engagementContextRole];
  }

  public static async revokeCredentialMultiSig(
    credId: string,
    issuerAidKey: string,
    issueeAidKey: string,
    generateTestData = false,
    testName = 'default_test'
  ) {
    const workflow_state = WorkflowState.getInstance();
    const recipientAID = workflow_state.aids.get(issueeAidKey);
    const cred: any = workflow_state.credentials.get(credId)!;
    const issuerAidInfo = workflow_state.aidsInfo.get(
      issuerAidKey
    )! as MultisigIdentifierData;
    const issuerAIDMultisig = workflow_state.aids.get(issuerAidKey);
    const issuerAids =
      issuerAidInfo.identifiers.map((identifier: any) =>
        workflow_state.aids.get(identifier)
      ) || [];
    let issuerclient!: any;
    const revOps = [];
    let i = 0;
    const REVTIME = new Date().toISOString().replace('Z', '000+00:00');
    for (const issuerAid of issuerAids) {
      const aidInfo = workflow_state.aidsInfo.get(
        issuerAid.name
      )! as SinglesigIdentifierData;
      issuerclient = workflow_state.clients.get(aidInfo.agent.name);
      if (i != 0) {
        const msgSaid = await waitAndMarkNotification(
          issuerclient!,
          '/multisig/rev'
        );
        console.log(
          `Multisig AID ${issuerAid.name} received exchange message to join the credential revocation event`
        );
        await issuerclient!.groups().getRequest(msgSaid);
      }
      const revResult = await issuerclient!
        .credentials()
        .revoke(issuerAIDMultisig.name, cred.sad.d, REVTIME);
      revOps.push([issuerclient!, revResult.op]);
      await multisigRevoke(
        issuerclient!,
        issuerAid.name,
        issuerAIDMultisig.name,
        revResult.rev,
        revResult.anc
      );
      i += 1;
    }

    for (const [client, op] of revOps) {
      await waitOperation(client!, op);
    }
    const revCred = await issuerclient!.credentials().get(cred.sad.d);
    workflow_state.credentials.set(credId, revCred);
    if (generateTestData) {
      const tmpCred = revCred;
      const credCesr = await issuerclient!
        .credentials()
        .get(revCred.sad.d, true);
      const testData: EcrTestData = {
        aid: recipientAID.prefix,
        lei: revCred.sad.a.LEI,
        credential: { raw: tmpCred, cesr: credCesr },
        engagementContextRole:
          revCred.sad.a.engagementContextRole || revCred.sad.a.officialRole,
      };
      await buildTestData(testData, testName, issueeAidKey, 'revoked_');
    }
    return [revCred, null];
  }

  public static async notifyCredentialIssuee(
    credId: string,
    issuerAidKey: string,
    issueeAidKey: string
  ) {
    const workflow_state = WorkflowState.getInstance();
    const cred: any = workflow_state.credentials.get(credId)!;

    if (!cred) {
      console.log(
        `notifyCredential: credential with credId=${credId} was not found`
      );
      throw new Error(
        `notifyCredential: credential with credId=${credId} was not found`
      );
    }
    const issuerAID = workflow_state.aids.get(issuerAidKey);
    const recipientAID = workflow_state.aids.get(issueeAidKey);
    const issuerAIDInfo = workflow_state.aidsInfo.get(issuerAidKey)!;
    const recipientAIDInfo = workflow_state.aidsInfo.get(issueeAidKey)!;

    if (issuerAIDInfo.type === 'multisig') {
      const multisigIdentifierData = issuerAIDInfo as MultisigIdentifierData;
      const schema = workflow_state.schemas[cred.schema];
      const issuerAids =
        multisigIdentifierData.identifiers.map((identifier: any) =>
          workflow_state.aids.get(identifier)
        ) || [];
      const creds = await Promise.all(
        issuerAids.map((aid: any) => {
          const singlesigIdentifierData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(
            singlesigIdentifierData.agent.name
          );
          return getIssuedCredential(client!, issuerAID, recipientAID, schema);
        })
      );
      sleep(1000);
      const grantTime = createTimestamp();
      await Promise.all(
        creds.map((cred, index) => {
          const singlesigIdentifierData = workflow_state.aidsInfo.get(
            issuerAids[index].name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(
            singlesigIdentifierData.agent.name
          );
          return grantMultisig(
            client!,
            issuerAids[index],
            issuerAids.filter((_: any, i: any) => i !== index),
            issuerAID,
            recipientAID,
            cred,
            grantTime,
            index === 0
          );
        })
      );
    } else {
      const singlesigIdentifierData = issuerAIDInfo as SinglesigIdentifierData;
      const issuerclient = workflow_state.clients.get(
        singlesigIdentifierData.agent.name
      );
      await sendGrantMessage(issuerclient!, issuerAID, recipientAID, cred);
    }

    if (recipientAIDInfo.type === 'multisig') {
      const multisigRecipientIdentifierData =
        recipientAIDInfo as MultisigIdentifierData;
      const multisigIssuerIdentifierData =
        issuerAIDInfo as MultisigIdentifierData;
      const admitTime = createTimestamp();
      const issuerAids =
        multisigIssuerIdentifierData.identifiers.map((identifier: any) =>
          workflow_state.aids.get(identifier)
        ) || [];
      const recepientAids =
        multisigRecipientIdentifierData.identifiers.map((identifier: any) =>
          workflow_state.aids.get(identifier)
        ) || [];
      await Promise.all(
        recepientAids.map((aid: any, index: any) => {
          const singlesigIdentifierData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(
            singlesigIdentifierData.agent.name
          );
          return admitMultisig(
            client!,
            aid,
            recepientAids.filter((_: any, i: any) => i !== index),
            recipientAID,
            issuerAID,
            admitTime
          );
        })
      );
      sleep(2000);
      for (const aid of issuerAids) {
        const singlesigIdentifierData = workflow_state.aidsInfo.get(
          aid.name
        ) as SinglesigIdentifierData;
        await waitAndMarkNotification(
          workflow_state.clients.get(singlesigIdentifierData.agent.name)!,
          '/exn/ipex/admit'
        );
      }
      for (const aid of recepientAids) {
        const singlesigIdentifierData = workflow_state.aidsInfo.get(
          aid.name
        ) as SinglesigIdentifierData;
        await waitAndMarkNotification(
          workflow_state.clients.get(singlesigIdentifierData.agent.name)!,
          '/multisig/exn'
        );
      }
      for (const aid of recepientAids) {
        const singlesigIdentifierData = workflow_state.aidsInfo.get(
          aid.name
        ) as SinglesigIdentifierData;
        await waitAndMarkNotification(
          workflow_state.clients.get(singlesigIdentifierData.agent.name)!,
          '/exn/ipex/admit'
        );
      }
      sleep(1000);
      await Promise.all(
        recepientAids.map((aid: any) => {
          const singlesigIdentifierData = workflow_state.aidsInfo.get(
            aid.name
          ) as SinglesigIdentifierData;
          const client = workflow_state.clients.get(
            singlesigIdentifierData.agent.name
          );
          return waitForCredential(client!, cred.sad.d);
        })
      );
    } else {
      const singlesigIdentifierData =
        recipientAIDInfo as SinglesigIdentifierData;
      const recipientclient = workflow_state.clients.get(
        singlesigIdentifierData.agent.name
      );
      await sendAdmitMessage(recipientclient!, recipientAID, issuerAID);
    }
  }

  public static buildCredSource(credType: string, cred: any, o?: string) {
    const credDict: Record<string, any> = {
      n: cred.sad.d,
      s: cred.sad.s,
    };
    if (o != null) {
      credDict['o'] = o;
    }
    const credSource = Saider.saidify({
      d: '',
      [credType]: credDict,
    })[1];
    return credSource;
  }
}
