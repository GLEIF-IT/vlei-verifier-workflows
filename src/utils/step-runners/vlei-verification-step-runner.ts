import { StepRunner } from '../../types/step-runner.js';
import { VleiVerification } from '../../vlei-verification.js';
import { WorkflowState } from '../../workflow-state.js';
import {
  presentationStatusMapping,
  authorizationStatusMapping,
} from '../test-data.js';
import {
  getIdentifierData,
  MultisigIdentifierData,
  SinglesigIdentifierData,
} from '../handle-json-config.js';

export const VLEI_VERIFICATION = 'vlei_verification';

export class VleiVerificationStepRunner extends StepRunner {
  type = VLEI_VERIFICATION;
  public async run(
    _stepName: string,
    step: any,
    configJson: any = null
  ): Promise<any> {
    const workflow_state = WorkflowState.getInstance();
    const vleiVerification = new VleiVerification();
    let cred;
    let credCesr;
    for (const action of Object.values(step.actions) as any[]) {
      if (action.type == 'credential_presentation') {
        const presenterAid = action.presenter_aid;
        if (presenterAid) {
          const aidInfo = workflow_state.aidsInfo.get(presenterAid);
          let client;
          if (
            aidInfo !== undefined &&
            aidInfo.type !== undefined &&
            aidInfo.type == 'multisig'
          ) {
            const multisigIdentifierData = aidInfo as MultisigIdentifierData;
            const multisigMemberAidInfo = workflow_state.aidsInfo.get(
              multisigIdentifierData.identifiers[0]
            ) as SinglesigIdentifierData;
            client = workflow_state.clients.get(
              multisigMemberAidInfo.agent.name
            );
          } else {
            const singlesigIdentifierData = aidInfo as SinglesigIdentifierData;
            client = workflow_state.clients.get(
              singlesigIdentifierData.agent.name
            );
          }
          const credential: { cred: any; credCesr: string } =
            workflow_state.credentials.get(action.credential)!;
          cred = credential.cred;
          credCesr =
            client !== undefined
              ? await client.credentials().get(cred.sad.d, true)
              : undefined;
        } else {
          const credential: { cred: any; credCesr: string } =
            workflow_state.credentials.get(action.credential)!;
          cred = credential.cred;
          credCesr = credential.credCesr;
        }

        const credStatus = presentationStatusMapping.get(
          action.expected_status
        );
        await vleiVerification.credentialPresentation(
          cred,
          credCesr,
          credStatus
        );
      } else if (action.type == 'credential_authorization') {
        const aidPrefix = workflow_state.aids.get(action.aid).prefix;
        const credStatus = authorizationStatusMapping.get(
          action.expected_status
        );
        await vleiVerification.credentialAuthorization(aidPrefix, credStatus);
      } else if (action.type == 'aid_presentation') {
        const aidPrefix = workflow_state.aids.get(action.aid).prefix;
        const aidInfo = workflow_state.aidsInfo.get(action.aid)!;
        let identifierData: SinglesigIdentifierData;
        if (aidInfo.type == 'singlesig') {
          identifierData = getIdentifierData(
            configJson,
            action.aid
          ) as SinglesigIdentifierData;
        } else {
          const multisigIdentifierData: MultisigIdentifierData =
            getIdentifierData(configJson, action.aid) as MultisigIdentifierData;
          identifierData = getIdentifierData(
            configJson,
            multisigIdentifierData.identifiers[0]
          ) as SinglesigIdentifierData;
        }
        const client = workflow_state.clients.get(identifierData.agent.name);
        const oobi = await client.oobis().get(action.aid);
        let oobiUrl = oobi.oobis[0];
        const url = new URL(oobiUrl);
        if (url.hostname === 'keria')
          oobiUrl = oobiUrl.replace('keria', 'localhost');
        const oobiResp = await fetch(oobiUrl);
        const aidCesr = await oobiResp.text();
        const aidStatus = presentationStatusMapping.get(action.expected_status);
        await vleiVerification.aidPresentation(aidPrefix, aidCesr, aidStatus);
      } else if (action.type == 'aid_authorization') {
        const aidPrefix = workflow_state.aids.get(action.aid).prefix;
        const aidStatus = authorizationStatusMapping.get(
          action.expected_status
        );
        await vleiVerification.aidAuthorization(aidPrefix, aidStatus);
      } else {
        throw new Error(`vlei_verification: Invalid action: ${action.type} `);
      }
    }
    return true;
  }
}