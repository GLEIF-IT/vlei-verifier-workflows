import {
  getIdentifierData,
  IdentifierData,
  MultisigIdentifierData,
  SinglesigIdentifierData,
} from './utils/handle-json-config.js';
import {
  confirmDelegation,
  incept,
  init,
  multisigIncept,
  MultisigInceptAttributes,
  resolveOobi,
  SinglesigInceptAttributes,
} from './utils/kli-utils.js';
import { resolveEnvironment } from './utils/resolve-env.js';
import { WorkflowState } from './workflow-state.js';

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
      const confirmDelegationResult = confirmDelegation(
        delegatorIdentifierData.agent.name,
        delegatorIdentifierData.agent.secret,
        step.aid
      );
      console.log(`Confirm Delegation result: ${confirmDelegationResult}`);
      return Promise.resolve('All commands executed successfully');
    }
  }
}
