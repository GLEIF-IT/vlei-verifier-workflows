## Actor Configuration with Credential Details

```mermaid
graph TD

  %% GLEIF
  subgraph GLEIF [GLEIF]
    GUSER[User: gleif-user-1]
    GAGENT[Agent: gleif-agent-1]
    GSECRET[Secret ID: gleif1]
    GAID[AID: gleif-aid-1]
  end

  %% QVI
  subgraph QVI [QVI]
    QUSER[User: qvi-user-1]
    QAGENT[Agent: qvi-agent-1]
    QSECRET[Secret ID: qvi1]
    QAID[AID: qvi-aid-1]
    QCRED["Credential: gleif_to_qvi_vlei_cred"]
  end

  %% LE
  subgraph LE [LE]
    LUSER[User: le-user-1]
    LAGENT[Agent: le-agent-1]
    LSECRET[Secret ID: le1]
    LAID[AID: le-aid-1]
    LCRED["Credential: qvi_to_le_vlei_cred"]
  end

  %% ECR
  subgraph ECR [ECR]
    EUSER[User: ecr-user-1]
    EAGENT[Agent: ecr-agent-1]
    ESECRET[Secret ID: ecr1]
    EAID[AID: ecr-aid-1]
    ECRED["Credential: le_to_ecr_vlei_cred: Engagement Role: Employee"]
  end

  %% Secret path: user → secret → agent
  GUSER --> GSECRET --> GAGENT
  QUSER --> QSECRET --> QAGENT
  LUSER --> LSECRET --> LAGENT
  EUSER --> ESECRET --> EAGENT

  %% Agent to AID
  GAGENT --> GAID
  QAGENT --> QAID
  LAGENT --> LAID
  EAGENT --> EAID

  %% AID Delegation (labeled edge)
  GAID -- delegator --> QAID

  %% Credential issuance (labeled edges)
  GAID -- issues --> QCRED
  QAID -- issues --> LCRED
  LAID -- issues --> ECRED
