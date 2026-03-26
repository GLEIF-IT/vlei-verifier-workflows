import {
  getIdentifierData,
  IdentifierData,
  MultisigIdentifierData,
  SinglesigIdentifierData,
} from './utils/handle-json-config.js';
import {
  confirmDelegation,
  createRegistry,
  Edges,
  incept,
  init,
  issueCredential,
  IssueCredentialAttributes,
  multisigIncept,
  MultisigInceptAttributes,
  resolveOobi,
  Rules,
  SinglesigInceptAttributes,
} from './utils/kli-utils.js';
import { resolveEnvironment } from './utils/resolve-env.js';
import { VleiIssuance } from './vlei-issuance.js';
import { WorkflowState } from './workflow-state.js';

export async function resolveAidOobiKLI(
  identifierData: IdentifierData,
  aidAlias: string
): Promise<string> {
  const workflowState = WorkflowState.getInstance();
  const singlesigIdentifierData = identifierData as SinglesigIdentifierData;
  const agentName = singlesigIdentifierData.agent.name;
  const agentSecret = singlesigIdentifierData.agent.secret;
  const aidPrefix = workflowState.aids.get(aidAlias)!.prefix;
  const oobiUrl = `${resolveEnvironment().witnessUrls[0]}/oobi/${aidPrefix}/controller`;
  return resolveOobi(agentName, agentSecret, oobiUrl);
}

export function createAidKLI(
  jsonConfig: any,
  identifierData: IdentifierData,
  step: any
): Promise<string> {
  const workflowState = WorkflowState.getInstance();
  const env = resolveEnvironment();
  const iurls = env.witnessUrls.map(
    (witnessUrl, index) => `${witnessUrl}/oobi/${env.witnessIds[index]}/witness`
  );
  if (identifierData.type === 'singlesig') {
    workflowState.aidsInfo.set(identifierData.name, identifierData);
    const singlesigIdentifierData = identifierData as SinglesigIdentifierData;
    const attributes: SinglesigInceptAttributes = {
      transferable: true,
      wits: env.witnessIds,
      data: [
        {
          iurls: iurls,
        },
      ],
      toad: iurls.length - 1,
      icount: 1,
      ncount: 1,
      isith: '1',
      nsith: '1',
    };

    const initResult = init(
      singlesigIdentifierData.agent.name,
      singlesigIdentifierData.agent.secret
    );
    console.log(`Init result: ${initResult}`);

    const resolveOobiResults: string[] = [];
    for (const witnessUrl of env.witnessUrls) {
      const resolveOobiResult = resolveOobi(
        singlesigIdentifierData.agent.name,
        singlesigIdentifierData.agent.secret,
        `${witnessUrl}/oobi`
      );
      resolveOobiResults.push(resolveOobiResult);
    }
    const aidPrefix = incept(
      singlesigIdentifierData.agent.name,
      singlesigIdentifierData.agent.secret,
      step.aid,
      attributes
    );
    workflowState.aids.set(step.aid, {
      alias: step.aid,
      prefix: aidPrefix,
    });
    // Fetch OOBIs for the AID manually
    const witnessUrls = env.witnessUrls;
    const oobis = witnessUrls.map(witnessUrl => `${witnessUrl}/oobi/${aidPrefix}/controller`);
    const oobi = {
      oobis: oobis,
      role: 'kli-agent',
    };
    workflowState.oobis.set(singlesigIdentifierData.name, [oobi]);

    console.log(`Incept result(AID prefix): ${aidPrefix}`);
    console.log(`Resolve Oobi results: ${resolveOobiResults}`);
    return Promise.resolve('All commands executed successfully');
  } else {
    const multisigIdentifierData = identifierData as MultisigIdentifierData;
    const memberAidAliases = multisigIdentifierData.identifiers;
    // Each member will create a multisig group with the same alias step.aid and add themselves to the group.
    for (const memberAidAlias of memberAidAliases) {
      const memberIdentifierData = getIdentifierData(
        jsonConfig,
        memberAidAlias
      ) as SinglesigIdentifierData;
      for (const otherMemberAidAlias of memberAidAliases) {
        if (memberAidAlias === otherMemberAidAlias) {
          continue;
        }
        const witnessUrl = env.witnessUrls[0];
        const aidPrefix = workflowState.aids.get(otherMemberAidAlias)!.prefix;
        const resolveOobiResult = resolveOobi(
          memberIdentifierData.agent.name,
          memberIdentifierData.agent.secret,
          `${witnessUrl}/oobi/${aidPrefix}/controller`
        );
        console.log(`Resolve Oobi result: ${resolveOobiResult}`);
      }
      const aidPrefixes = memberAidAliases.map(
        (alias) => workflowState.aids.get(alias)!.prefix
      );
      const attributes: MultisigInceptAttributes = {
        transferable: true,
        wits: env.witnessIds,
        aids: aidPrefixes,
        data: [
          {
            iurls: iurls,
          },
        ],
        toad: iurls.length - 1,
        isith: multisigIdentifierData.isith,
        nsith: multisigIdentifierData.nsith,
      };

      if (multisigIdentifierData.delegator) {
        const delegatorAidPrefix = workflowState.aids.get(
          multisigIdentifierData.delegator
        )!.prefix;
        attributes['delpre'] = delegatorAidPrefix;

        const witnessUrl = env.witnessUrls[0];
        const _resolveOobiResult = resolveOobi(
          memberIdentifierData.agent.name,
          memberIdentifierData.agent.secret,
          `${witnessUrl}/oobi/${delegatorAidPrefix}/controller`
        );
        console.log(
          `Resolve Oobi result for delegator(${delegatorAidPrefix}): ${_resolveOobiResult}`
        );
      }
      const _multisigInceptResult = multisigIncept(
        memberIdentifierData.agent.name,
        memberIdentifierData.agent.secret,
        memberIdentifierData.name,
        step.aid,
        attributes
      );
    }

    if (multisigIdentifierData.delegator) {
      // Delegator anchors the group inception:
      const delegatorIdentifierData = getIdentifierData(
        jsonConfig,
        multisigIdentifierData.delegator
      ) as SinglesigIdentifierData;
      for (const memberAidAlias of memberAidAliases) {
        const witnessUrl = env.witnessUrls[0];
        const aidPrefix = workflowState.aids.get(memberAidAlias)!.prefix;
        const resolveOobiResult = resolveOobi(
          delegatorIdentifierData.agent.name,
          delegatorIdentifierData.agent.secret,
          `${witnessUrl}/oobi/${aidPrefix}/controller`
        );
        console.log(`Resolve Oobi result: ${resolveOobiResult}`);
      }
      return Promise.resolve('All commands executed successfully');
    }
  }
}

export function confirmDelegationKLI(
  delegatorIdentifierData: SinglesigIdentifierData,
  step: any
): Promise<string> {
  const workflowState = WorkflowState.getInstance();
  const delegatorAgentName = delegatorIdentifierData.agent.name;
  const delegatorSecret = delegatorIdentifierData.agent.secret;
  const confirmDelegationResult = confirmDelegation(delegatorAgentName, delegatorSecret, step.delegate_aid);
  console.log(`Confirm Delegation result: ${confirmDelegationResult}`);
  return Promise.resolve('All commands executed successfully');
}

export function IssueCredentialKLI(
  issuerIdentifierData: SinglesigIdentifierData,
  issueeIdentifierData: SinglesigIdentifierData,
  step: any,
  credential: string
): Promise<string> {
  const workflowState = WorkflowState.getInstance();
  const env = resolveEnvironment();
  const issuerName = issuerIdentifierData.name;
  const issuerAgentName = issuerIdentifierData.agent.name;
  const issuerSecret = issuerIdentifierData.agent.secret;
  const issueeName = issueeIdentifierData.name;
  const registryName = `${issuerName}Registry`;
  const registryPrefix = createRegistry(issuerAgentName, issuerSecret, step.issuer_aid, registryName);
  const issueeAidPrefix = workflowState.aids.get(step.issuee_aid)!.prefix;
  const credentialInfo = workflowState.credentialsInfo.get(credential);
  const schema = workflowState.schemas[credentialInfo.schema];
  const rules = workflowState.rules[credentialInfo.rules!];
  let credSource = null;
  if (step.credential_source != null) {
    const credType = credentialInfo.credSource['type'];
    const credential: { cred: any; credCesr: string } =
      workflowState.credentials.get(step.credential_source)!;
    const issuerCred = credential!.cred;
    const credO = credentialInfo.credSource['o'] || null;
    credSource = VleiIssuance.buildCredSource(credType, issuerCred, credO);
  }
  const attributes: IssueCredentialAttributes = {
    i: issueeAidPrefix,    
    ...step.attributes,
    ...credentialInfo!.attributes,
  };
  const oobiUrl = `${resolveEnvironment().vleiServerUrl}/oobi/${schema}`;
  resolveOobi(issuerAgentName, issuerSecret, oobiUrl);
  const issueCredentialResult = issueCredential(issuerAgentName, issuerSecret, step.issuer_aid, issueeAidPrefix, registryName, schema, rules, credSource, attributes);
  console.log(`Issue Credential result: ${issueCredentialResult}`);
  return Promise.resolve('All commands executed successfully');
}